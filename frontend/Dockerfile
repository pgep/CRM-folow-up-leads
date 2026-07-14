# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package configuration
COPY package*.json ./
RUN npm install

# Copy source and configurations
COPY . .

# Build the Vite application
RUN npm run build

# Serve stage using lightweight Nginx
FROM nginx:alpine

# Copy custom nginx configuration if any, or default static file serving
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose default HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
