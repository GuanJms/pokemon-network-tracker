package event

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"pokemonSightingApp/cmd/internal/broadcast"

	amqp "github.com/rabbitmq/amqp091-go"
)

var taskId int = 0

type QueueSighting struct {
	Sighting
	CaptureTime int `json:"captureTime,omitempty"`
}

func DispatchSetup(conn *amqp.Connection, teamName string, topics []string, b broadcast.Broadcaster) error {
	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	err = ch.ExchangeDeclare("pokemon_exchange", "topic", true, false, false, false, nil)
	if err != nil {
		return err
	}
	q, err := ch.QueueDeclare("sightings_q", true, false, false, false, nil)
	if err != nil {
		return err
	}

	_, err = ch.QueueDeclare("pokemon_tasks", true, false, false, false, amqp.Table{
		"x-dead-letter-exchange":    "",
		"x-dead-letter-routing-key": "dead_letter_tasks",
	})
	if err != nil {
		return err
	}

	for _, topic := range topics {
		err = ch.QueueBind(q.Name, topic, "pokemon_exchange", false, nil)
		if err != nil {
			return err
		}
	}

	// Consume
	msgs, err := ch.Consume(q.Name, "", true, false, false, false, nil)
	if err != nil {
		return err
	}

	go listenDispatch(teamName, msgs, b, conn)

	return nil
}

type captureTask struct {
	Sighting
	TaskId int `json:"taskId"`
}

func listenDispatch(dispatcherName string, msgs <-chan amqp.Delivery, b broadcast.Broadcaster, conn *amqp.Connection) {
	ch, err := conn.Channel()
	if err != nil {
		return
	}
	defer ch.Close()
	for d := range msgs {
		var s QueueSighting
		if err := json.Unmarshal(d.Body, &s); err != nil {
			fmt.Printf("Failed to unmarshal sighting: %v\n", err)
			continue
		}
		time.Sleep(500 * time.Millisecond)
		msg := fmt.Sprintf("[%s] Dispatch capture task - %s at %s [%s]!", dispatcherName, s.Pokemon, s.Location, s.Element)
		b.Broadcast(msg, "headquarter dispatch", true, map[string]any{"taskId": taskId})

		var c captureTask

		c.TaskId = taskId
		taskId++
		c.Sighting = s.Sighting
		c.publish(s.CaptureTime, ch)
	}
}

func (c *captureTask) publish(duration int, ch *amqp.Channel) error {
	body, err := json.Marshal(c)
	if err != nil {
		return fmt.Errorf("failed to marshal capture task: %w", err)
	}

	err = ch.Publish("", "pokemon_tasks", false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Body:         body,
		Expiration:   strconv.Itoa(duration * 1000),
	})

	return err
}
