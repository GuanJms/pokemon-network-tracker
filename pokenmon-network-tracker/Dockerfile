# ---------- build stage ----------
FROM golang:1.24-alpine AS builder
WORKDIR /app

# Only copy go mod/sum first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source
COPY . .

# Build the API binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o api ./cmd/api

# ---------- runtime stage ----------
FROM gcr.io/distroless/base-debian12

WORKDIR /app
COPY --from=builder /app/api ./api

EXPOSE 3000

# RabbitMQ URL can be injected at runtime; default handled in code
ENTRYPOINT ["/app/api"] 