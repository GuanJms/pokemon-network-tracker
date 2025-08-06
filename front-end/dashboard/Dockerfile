# ---------- build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

# build-time variables with default values
ARG VITE_API_BASE=http://localhost:3000
ARG VITE_WS_URL=ws://localhost:3000/state/events
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_WS_URL=$VITE_WS_URL

# copy lockfile first for better caching
COPY package.json package-lock.json ./
RUN npm ci                 #  ←  remove  --omit=dev  so devDeps are present

# copy sources & build
COPY . .
RUN npm run build          # writes static files to /app/dist

# ---------- runtime stage ----------
FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Create a directory for runtime configuration
RUN mkdir -p /usr/share/nginx/html/config

# Copy default config
COPY --from=builder /app/dist/config.js /usr/share/nginx/html/config/default.js

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]