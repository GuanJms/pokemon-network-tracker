package main

import (
	"encoding/json"
	"log"
	"time"
)

type Hub struct {
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte),
	}
}

func (h *Hub) GetLiveCount() int {
	return len(h.clients)
}

func (h *Hub) Run() {
	// running forever
	for {
		select {
		case c := <-h.register:
			// registering a new Client
			h.clients[c] = true
			message := map[string]string{"type": "register", "message": "Client registered!"}
			payload, _ := json.Marshal(message)
			c.send <- payload
		case c := <-h.unregister:
			// deleting a Client
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				close(c.send)
			}
		case msg := <-h.broadcast:
			// pushing msgs to clients
			for c := range h.clients {
				select {
				case c.send <- msg:
				default:
					close(c.send)
					delete(h.clients, c)
				}
			}
		}
	}
}

// Broadcast sends a message to all connected clients.
// If includeTime is not provided, it defaults to true.
func (h *Hub) Broadcast(msg string, messageType string, includeTime bool, options map[string]any) {
	message := map[string]any{"type": messageType, "message": msg}

	if includeTime {
		message["time"] = time.Now().Format("2006-01-02 15:04:05.000")
	}

	for _, key := range []string{"type", "message"} {
		if _, ok := options[key]; ok {
			log.Printf("error - broadcasting contains reserved key: %s", key)
			return
		}
	}

	for key, value := range options {
		message[key] = value
	}

	payload, _ := json.Marshal(message)
	h.broadcast <- payload
}
