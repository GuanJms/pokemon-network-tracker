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

echo "✅ Dashboard image built and pushed successfully!"
echo ""
echo "To deploy with custom configuration:"
echo "1. Edit ./front-end/dashboard/public/config.js with your server URLs"
echo "2. Run: docker-compose up -d"
echo ""
echo "The image will use the configuration from the mounted config.js file." 