package event

import (
	"github.com/rabbitmq/amqp091-go"
)

type QueueStats struct {
	Name      string `json:"name"`
	Messages  int    `json:"messages"`
	Consumers int    `json:"consumers"`
}

func GetQueueStats(conn *amqp091.Connection, queueName string) (QueueStats, error) {

	var qs QueueStats

	ch, err := conn.Channel()
	if err != nil {
		return qs, err
	}

	q, err := ch.QueueDeclarePassive(
		queueName,
		true,
		false,
		false,
		false, // inspect only
		nil,
	)
	// log.Println("QueueName:", q.Name)
	// log.Println("Messages:", q.Messages)
	// log.Println("Consumers:", q.Consumers)

	if err != nil {
		return qs, err
	}

	qs = QueueStats{
		Name:      q.Name,
		Messages:  q.Messages,
		Consumers: q.Consumers,
	}
	return qs, nil
}
