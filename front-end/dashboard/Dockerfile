# ---------- build stage ----------
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    # copy lockfile first for better caching
    COPY package.json package-lock.json ./
    RUN npm ci                 #  ←  remove  --omit=dev  so devDeps are present
    
    # copy sources & build
    COPY . .
    RUN npm run build          # writes static files to /app/dist
    
    # ---------- runtime stage ----------
    FROM nginx:1.25-alpine
    COPY --from=builder /app/dist /usr/share/nginx/html
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]