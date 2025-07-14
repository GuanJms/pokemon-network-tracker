package broadcast

type Broadcaster interface {
	Broadcast(msg string, messageType string, includeTime bool, options map[string]any)
}
