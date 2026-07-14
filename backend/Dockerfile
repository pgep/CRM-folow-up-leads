# Use Node.js LTS slim image as the builder stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm install

# Copy configuration and source files
COPY tsconfig.json ./
COPY server.ts ./

# Compile/bundle the server
RUN npm run build

# Use a clean Node.js runtime image for production
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
# Install only production dependencies
RUN npm install --only=production

# Copy compiled files from builder
COPY --from=builder /app/dist ./dist

# Expose the API server port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start the application using npm start
CMD ["npm", "start"]
