package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"pokemonSightingApp/cmd/event"
	"time"

	"github.com/gorilla/websocket"
	amqp "github.com/rabbitmq/amqp091-go"
)

type SightingPayload struct {
	event.Sighting
	CaptureTime int    `json:"captureTime,omitempty"`
	Message     string `json:"message"`
}

type RocketAgentPayload struct {
	event.RocketAgent
	Message  string `json:"message"`
	ImageNum int    `json:"imageNum"`
}

type Client struct {
	conn     *websocket.Conn
	send     chan []byte
	lastPong time.Time
}

func (app *Config) SightingHandle(w http.ResponseWriter, r *http.Request) {
	// parse info from request into SightingPayload
	var s SightingPayload

	err := app.readJSON(w, r, &s)

	if err != nil {
		log.Println(err)
		http.Error(w, "invalid input", http.StatusBadRequest)
		return
	}

	// Publish the Sighting
	err = app.publishSighting(s)
	if err != nil {
		log.Println(err)
		http.Error(w, "failed to publish sighting", http.StatusInternalServerError)
		return
	}

	// 200 OK - Successfully submitted Pokemon sighting
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	s.Message = "Successfully submitted Pokemon sighting"
	out, _ := json.Marshal(s)
	w.Write(out)
}

type TeamPayload struct {
	event.Team
	Message string `json:"message"`
}

type QueuePayload struct {
	event.QueueStats
	Message string `json:"message,omitempty"`
}

func (app *Config) SpawnTeam(w http.ResponseWriter, r *http.Request) {
	// parse info from request into
	var t TeamPayload

	err := app.readJSON(w, r, &t)
	if err != nil {
		log.Println(err)
		http.Error(w, "invalid input", http.StatusBadRequest)
		return
	}

	team, err := event.NewTeam(app.rabbitConn, t.Name, t.Elements, app.hub)
	t.Team = team

	if err != nil {
		log.Println(err)
		http.Error(w, "failed to set up a new team", http.StatusInternalServerError)
		return
	}

	go func() {
		if err := team.Listen(); err != nil {
			log.Println(err)
			http.Error(w, "Team listen failed", http.StatusInternalServerError)
			return
		}
	}()

	// 200 OK - Successfully created a Rocket agent
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	t.Message = "Successfully created a Team"
	out, _ := json.Marshal(t)
	w.Write(out)
}

func (app *Config) SpawnRocketAgent(w http.ResponseWriter, r *http.Request) {
	// parse info from request into
	var a RocketAgentPayload

	err := app.readJSON(w, r, &a)
	if err != nil {
		log.Println(err)
		http.Error(w, "invalid input", http.StatusBadRequest)
		return
	}

	agent, err := event.NewRocketAgent(app.rabbitConn, a.Id, a.Name, a.ImageNum, app.hub)

	if err != nil {
		log.Println(err)
		http.Error(w, "failed to set up a new rocket agent", http.StatusInternalServerError)
		return
	}

	go func() {
		if err := agent.Listen(); err != nil {
			log.Println(err)
			http.Error(w, "Agent listen failed", http.StatusInternalServerError)
			return
		}
	}()

	// 200 OK - Successfully created a Rocket agent
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	a.Message = "Successfully created a Rocket agent"
	out, _ := json.Marshal(a)
	w.Write(out)
}

func (app *Config) publishSighting(s SightingPayload) error {
	topic := fmt.Sprintf("pokemon.sighting.%s", s.Element)
	conn := app.rabbitConn

	s.CaptureTime = rand.Intn(10) + 5

	msg := fmt.Sprintf("Spawned %s pokemon: %s at % s with capture time %d", s.Element, s.Pokemon, s.Location, s.CaptureTime)
	app.hub.Broadcast(msg, "system log", true, nil)

	if conn == nil {
		return fmt.Errorf("rabbitmq not connected")
	}

	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	body, err := json.Marshal(s)
	if err != nil {
		return fmt.Errorf("failed to marshal sighting: %w", err)
	}

	err = ch.Publish("pokemon_exchange", topic, false, false, amqp.Publishing{
		ContentType: "application/json",
		Body:        body,
	})
	return err
}

func (app *Config) QueueStats(w http.ResponseWriter, r *http.Request) {
	var q QueuePayload
	err := json.NewDecoder(r.Body).Decode(&q)
	if err != nil {
		log.Println(err)
		http.Error(w, "invalid input", http.StatusBadRequest)
		return
	}
	qs, err := event.GetQueueStats(app.rabbitConn, q.Name)
	if err != nil {
		log.Println(err)
		http.Error(w, "failed to get queue stats", http.StatusInternalServerError)
		return
	}

	q.QueueStats = qs

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	out, _ := json.Marshal(q)
	w.Write(out)
	// log.Println("Queue stats: ", string(out))
}

var upgrader = websocket.Upgrader{}

func serveWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
	// upgrade request to WS
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "WS upgrade failing", http.StatusInternalServerError)
		return
	}

	// create client
	client := &Client{
		conn:     conn,
		send:     make(chan []byte, 1024),
		lastPong: time.Now(),
	}

	// registering client
	hub.register <- client

	// keep client running
	go client.readPump(hub)
	go client.writePump(hub)
}

func (c *Client) readPump(hub *Hub) {
	defer func() {
		hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.lastPong = time.Now()
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			break
		}
	}
}

func (c *Client) writePump(hub *Hub) {

	pingTicket := time.NewTicker(5 * time.Second)
	defer func() {
		c.conn.Close()
		pingTicket.Stop()
	}()

	c.conn.SetPongHandler(func(string) error {
		c.lastPong = time.Now()
		return nil
	})

	for {
		select {
		case msg, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}

		case <-pingTicket.C:
			if time.Since(c.lastPong) > 15*time.Second {
				hub.unregister <- c
				return
			}
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (app *Config) StreamEventWS(w http.ResponseWriter, r *http.Request) {
	serveWS(app.hub, w, r)
}

func (app *Config) ResetAgents(w http.ResponseWriter, r *http.Request) {
	event.DeleteAllAgents()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNoContent)
}

func (app *Config) ResetSystem(w http.ResponseWriter, r *http.Request) {
	event.DeleteAllAgents()
	event.ReSetTotalCount()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNoContent)
}

func (app *Config) GetDLQTotalCount(w http.ResponseWriter, r *http.Request) {
	count := event.GetDLQTotalCount()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	out, _ := json.Marshal(map[string]int{"count": count})
	w.Write(out)
}

func (app *Config) GetAgentsState(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	out, _ := json.Marshal(event.AgentList)
	w.Write(out)
}

func (app *Config) GetWebsocketCount(w http.ResponseWriter, r *http.Request) {
	count := app.hub.GetLiveCount()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	out, _ := json.Marshal(map[string]int{"count": count})
	w.Write(out)
}
