package event

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"pokemonSightingApp/cmd/internal/broadcast"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const taskQueue = "pokemon_tasks"

var AgentList []*RocketAgent

type RocketAgent struct {
	Id          int    `json:"id,omitempty"`
	Name        string `json:"name"`
	ImageNum    int    `json:"imageNum"`
	conn        *amqp.Connection
	queueName   string
	queueArgs   amqp.Table
	b           broadcast.Broadcaster
	consumerTag string
	channel     *amqp.Channel
	stopCh      chan struct{}
	doneCh      chan struct{}
}

func NewRocketAgent(conn *amqp.Connection, id int, name string, imageNum int, b broadcast.Broadcaster) (*RocketAgent, error) {
	agent := &RocketAgent{
		Id:        id,
		Name:      name,
		ImageNum:  imageNum,
		conn:      conn,
		queueName: taskQueue,
		b:         b,
		stopCh:    make(chan struct{}),
		doneCh:    make(chan struct{}),
	}
	err := agent.setup()
	if err != nil {
		log.Println(err)
		return agent, err
	}
	AgentList = append(AgentList, agent)
	return agent, nil
}

func (r *RocketAgent) setup() error {
	ch, err := r.conn.Channel()
	if err != nil {
		return err
	}
	r.queueArgs = amqp.Table{
		"x-dead-letter-exchange":    "",
		"x-dead-letter-routing-key": "dead_letter_tasks",
	}
	_, err = ch.QueueDeclare(r.queueName, true, false, false, false, r.queueArgs)
	if err != nil {
		return err
	}

	agentOption := map[string]any{
		"name": r.Name,
		"id":   r.Id,
	}

	r.b.Broadcast(fmt.Sprintf("Spawn rocket agent %d, %s", r.Id, r.Name), "agent log", true, agentOption)
	return nil
}

func DeleteAllAgents() {
	for _, agent := range AgentList {
		agent.Stop()
	}
	AgentList = nil
}

func (r *RocketAgent) Stop() {
	if r.channel != nil && r.consumerTag != "" {
		_ = r.channel.Cancel(r.consumerTag, false)
	}
	close(r.stopCh)
	<-r.doneCh
	if r.channel != nil {
		_ = r.channel.Close()
	}
	r.b.Broadcast(
		fmt.Sprintf("Stopped rocket agent %d, %s", r.Id, r.Name),
		"agent log",
		true,
		map[string]any{"id": r.Id, "name": r.Name},
	)
}

func (r *RocketAgent) Listen() error {
	ch, err := r.conn.Channel()
	if err != nil {
		log.Println(err)
		return err
	}
	r.channel = ch
	r.consumerTag = fmt.Sprintf("agent-%d-%s", r.Id, r.Name)

	ch.Qos(1, 0, false) // prefetch=1

	tasks, err := ch.Consume(
		"pokemon_tasks", // queue
		r.consumerTag,   // explicit consumer tag
		false,           // auto-ack: true = no need to call d.Ack()
		false,           // exclusive: ❌ don't use true here
		true,            // no-local: ignored by RabbitMQ
		false,           // no-wait
		nil,             // args
	)
	if err != nil {
		return err
	}

	go func() {
		defer close(r.doneCh)
		for {
			select {
			case task, ok := <-tasks:
				if !ok {
					return
				}
				r.handleTask(&task)
			case <-r.stopCh:
				return
			}
		}
	}()

	return nil
}

func (r *RocketAgent) handleTask(task *amqp.Delivery) {
	var c captureTask
	if err := json.Unmarshal(task.Body, &c); err != nil {
		fmt.Printf("Failed to unmarshal task: %v\n", err)
		task.Nack(false, false)
		return
	}
	options := map[string]any{
		"name":   r.Name,
		"id":     r.Id,
		"taskId": c.TaskId,
	}

	msg := fmt.Sprintf("[%d ID | %s] Agent processing task: %s at %s", r.Id, r.Name, c.Pokemon, c.Location)
	r.b.Broadcast(msg, "agent log", true, options)

	timeDuration := rand.Intn(3) + 2

	msg = fmt.Sprintf("[%d ID | %s] Agent started task (estimated duration: %d): %s at %s", r.Id, r.Name, timeDuration, c.Pokemon, c.Location)
	time.Sleep(time.Duration(timeDuration) * time.Second)
	r.b.Broadcast(msg, "agent log", true, options)

	if rand.Intn(5) == 1 {
		msg := fmt.Sprintf("[%d ID | %s] Agent failed task: %s at %s", r.Id, r.Name, c.Pokemon, c.Location)
		r.b.Broadcast(msg, "agent log", true, options)
		task.Nack(false, true)
		msg = fmt.Sprintf("[%d ID | %s] Agent reported failed task and request HQ to re-dispatch: %s at %s", r.Id, r.Name, c.Pokemon, c.Location)
		r.b.Broadcast(msg, "agent log", true, options)
		return
	}

	msg = fmt.Sprintf(" [%d ID | %s] Agent captured %s at %s [%s]!", r.Id, r.Name, c.Pokemon, c.Location, c.Element)
	task.Ack(false)
	r.b.Broadcast(msg, "agent log", true, options)
}
