package event

import (
	"encoding/json"
	"fmt"
	"log"
	"pokemonSightingApp/cmd/internal/broadcast"

	amqp "github.com/rabbitmq/amqp091-go"
)

var TotalCount int = 0

func GetDLQTotalCount() int {
	return TotalCount
}

func ReSetTotalCount() {
	TotalCount = 0
}

func DLQSetup(conn *amqp.Connection, b broadcast.Broadcaster) error {

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return fmt.Errorf("failed to open channel: %w", err)
	}

	_, err = ch.QueueDeclare("dead_letter_tasks", true, false, false, false, nil)
	if err != nil {
		ch.Close()
		conn.Close()
		return fmt.Errorf("failed to declare queue: %w", err)
	}

	msgs, err := ch.Consume("dead_letter_tasks", "", true, false, false, false, nil)
	if err != nil {
		ch.Close()
		conn.Close()
		return fmt.Errorf("failed to start consuming: %w", err)
	}

	go func() {
		defer ch.Close()
		defer conn.Close()

		for d := range msgs {
			var task captureTask
			if err := json.Unmarshal(d.Body, &task); err != nil {
				log.Printf("Failed to unmarshal task: %v", err)
				continue
			}

			fmt.Println(TotalCount)
			msg := fmt.Sprintf("[DLQ] Missed opportunity! %s escaped from %s (%s)", task.Pokemon, task.Location, task.Element)
			b.Broadcast(msg, "pokemon escape", true, nil)
		}
	}()

	return nil
}
