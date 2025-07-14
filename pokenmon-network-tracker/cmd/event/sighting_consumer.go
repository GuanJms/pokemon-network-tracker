package event

import (
	"encoding/json"
	"fmt"
	"log"
	"pokemonSightingApp/cmd/internal/broadcast"

	amqp "github.com/rabbitmq/amqp091-go"
)

type Sighting struct {
	Pokemon  string `json:"pokemon"`
	Location string `json:"location"`
	Element  string `json:"element"`
}

type Team struct {
	Name      string   `json:"name"`
	Elements  []string `json:"elements"`
	Topics    []string `json:"topics"`
	conn      *amqp.Connection
	queueName string
	b         broadcast.Broadcaster
}

func NewTeam(conn *amqp.Connection, name string, elements []string, b broadcast.Broadcaster) (Team, error) {
	team := Team{
		Name:     name,
		Elements: elements,
		conn:     conn,
		b:        b,
	}

	var topics []string
	for _, element := range elements {
		topics = append(topics, fmt.Sprintf("pokemon.sighting.%s", element))
	}
	team.Topics = topics

	log.Println(team.Topics)

	err := team.setup()
	if err != nil {
		return team, nil
	}

	return team, nil
}

func (t *Team) setup() error {
	// setup the queue
	ch, err := t.conn.Channel()
	if err != nil {
		return nil
	}

	err = ch.ExchangeDeclare("pokemon_exchange", "topic", true, false, false, false, nil)
	if err != nil {
		return err
	}

	q, err := ch.QueueDeclare("", false, false, true, false, nil)
	if err != nil {
		return err
	}

	t.queueName = q.Name

	// Bind the queue to exchane
	for _, topic := range t.Topics {
		err = ch.QueueBind(q.Name, topic, "pokemon_exchange", false, nil)
		if err != nil {
			return err
		}
	}

	t.b.Broadcast(fmt.Sprintf("Spawn team %s, sighting elements: %s", t.Name, t.Elements), "team log", true, nil)

	return nil
}

func (t *Team) Listen() error {
	ch, err := t.conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	msgs, err := ch.Consume(t.queueName, "", true, false, false, false, nil)
	if err != nil {
		return err
	}

	forever := make(chan bool)

	for d := range msgs {
		var s Sighting
		if err := json.Unmarshal(d.Body, &s); err != nil {
			fmt.Printf("Failed to unmarshal sighting: %v\n", err)
			continue
		}
		msg := fmt.Sprintf("[%s] Spotted %s at %s [%s]!", t.Name, s.Pokemon, s.Location, s.Element)
		fmt.Print(msg)
		if t.b != nil {
			t.b.Broadcast(msg, "team sighting", true, nil)
		}
	}
	<-forever
	return nil
}
