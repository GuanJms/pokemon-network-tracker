package main

import (
	"net/http"

	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

func (app *Config) routes() http.Handler {
	mux := chi.NewRouter()
	// specify who is allowed to connect
	mux.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"}, // allow all origins
		AllowedMethods:   []string{"GET", "POST", "PUT", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false, // required when using "*"
		MaxAge:           300,
	}))

	mux.Use(middleware.Heartbeat("/ping"))

	mux.Post("/sighting", app.SightingHandle)

	mux.Post("/spawn/rocket-agent", app.SpawnRocketAgent)

	mux.Post("/spawn/team", app.SpawnTeam)

	mux.Post("/state/queue", app.QueueStats)

	// mux.Get("/state/logs", app.GetLogs)

	mux.Get("/state/events", app.StreamEventWS)

	mux.Get("/reset/agents", app.ResetAgents)

	mux.Get("/reset/system", app.ResetSystem)

	mux.Get("/state/dead-message", app.GetDLQTotalCount)

	mux.Get("/state/hub/active", app.GetWebsocketCount)

	mux.Get("/state/agents", app.GetAgentsState)

	return mux
}
