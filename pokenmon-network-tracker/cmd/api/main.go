package main

import (
	"fmt"
	"log"
	"net/http"
	"pokemonSightingApp/cmd/event"

	amqp "github.com/rabbitmq/amqp091-go"
)

const webPort = "3000"

type Config struct {
	rabbitConn *amqp.Connection
	hub        *Hub
}

func main() {

	app := Config{}
	app.connect()

	app.hub = NewHub()
	go app.hub.Run()

	event.DispatchSetup(app.rabbitConn, "RocketHeadQuater", []string{"pokemon.sighting.#"}, app.hub)
	event.DLQSetup(app.rabbitConn, app.hub)

	serv := &http.Server{
		Addr:    fmt.Sprintf(":%s", webPort),
		Handler: app.routes(),
	}

	err := serv.ListenAndServe()
	if err != nil {
		log.Panic(err)
	}
}

func (app *Config) connect() {
	conn, err := event.RabbitMQConnect()
	if err != nil {
		log.Panic(err)
	}
	app.rabbitConn = conn
	log.Println("Connected to RabbitMQ!")
}
