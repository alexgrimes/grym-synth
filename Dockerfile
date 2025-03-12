# Base Node.js Image
FROM node:18-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Development Build Stage
FROM base AS development
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

# Production Build Stage
FROM base AS production
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "start"]

# API Service
FROM production AS api
EXPOSE 3001
ENV SERVICE_TYPE=api

# Install SQLite and dependencies
RUN apk add --no-cache \
    sqlite \
    sqlite-dev \
    python3 \
    make \
    g++ \
    && npm install sqlite3 --build-from-source

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Copy configuration files
COPY config/models.json /etc/ollama/models.json
COPY scripts/start-ollama.sh /start-ollama.sh
RUN chmod +x /start-ollama.sh

# Set environment variables
ENV DB_PATH=/app/data/grymsynth.db \
    OLLAMA_HOST=ollama \
    OLLAMA_PORT=11434 \
    MAX_MEMORY_PERCENT=60

# Create volume mount points
VOLUME ["/app/data", "/app/logs"]

# Start the service
CMD ["node", "dist/server.js"]
