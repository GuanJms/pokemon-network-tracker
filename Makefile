# =====================================================================================
# Makefile - orchestrates build & run of the Pokémon Tracking Network stack
# -------------------------------------------------------------------------------------
# Usage examples:
#   make build        # build front-end & back-end images
#   make up           # build (if needed) and start the whole stack
#   make down         # stop & remove containers
#   make logs         # follow logs for all services
#   make restart      # quick restart
# =====================================================================================

# Image names
FRONTEND_IMAGE := ptn-dashboard
BACKEND_IMAGE  := ptn-api

# Build contexts
FRONTEND_DIR   := front-end/dashboard
BACKEND_DIR    := pokenmon-network-tracker

.PHONY: build build-frontend build-backend up up-build down restart logs prune clean

## Build images -------------------------------------------------------------
build: build-backend build-frontend ## Build both back-end and front-end images

build-frontend: ## Build React dashboard image
	docker build -t $(FRONTEND_IMAGE) $(FRONTEND_DIR)

build-backend: ## Build Go API image
	docker build -t $(BACKEND_IMAGE) $(BACKEND_DIR)

## Compose helpers -----------------------------------------------------------
up: build ## Build (if needed) and start containers in background
	docker compose up -d

up-build: ## Rebuild images and start containers
	docker compose up --build -d

down: ## Stop and remove containers
	docker compose down

restart: down up ## Restart the stack

logs: ## Tail logs from all services
	docker compose logs -f

## Maintenance --------------------------------------------------------------
prune clean: ## Remove dangling images/containers (dangerous!)
	docker system prune -f
