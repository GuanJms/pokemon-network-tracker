#!/bin/bash

# Build and push the dashboard image with default values
echo "Building and pushing pokemon-dashboard image..."

cd front-end/dashboard

# Build with default values (localhost)
docker buildx build \
  --platform linux/amd64 \
  --build-arg VITE_API_BASE=http://localhost:3000 \
  --build-arg VITE_WS_URL=ws://localhost:3000/state/events \
  -t jamesguan777/pokemon-dashboard:1.0.0 \
  --push .
