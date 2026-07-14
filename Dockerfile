# Multi-stage Dockerfile for the unified full-stack CRM (React + Express)
# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies required for bundling)
RUN npm ci

# Copy configuration files
COPY tsconfig.json vite.config.ts index.html ./

# Copy source directories and assets
COPY src/ ./src
COPY assets/ ./assets
COPY server.ts ./

# Run the production build (Vite client build + Esbuild server compilation)
RUN npm run build

# Stage 2: Runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment and default port
ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifests and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled build directory and server from the builder stage
COPY --from=builder /app/dist ./dist

# Expose port 3000 (standard ingress port for our Express app)
EXPOSE 3000

# Start the application using the compiled server entry point
CMD ["npm", "start"]
