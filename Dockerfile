# Use Node.js LTS version
FROM node:18-bullseye

# Set the working directory
WORKDIR /app

# Install system dependencies including FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    gnupg \
    netcat-openbsd \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create directory structure
RUN mkdir -p public/js \
    views \
    models \
    services \
    controllers \
    routes \
    rtsp \
    socket \
    socket/handlers

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Set up environment variables
ENV PORT=5000 \
    NODE_ENV=production

# Expose ports for the application and RTSP
EXPOSE 5000 8554

# Create initialization script
RUN echo '#!/bin/bash\n\
# Wait for MongoDB to be ready\n\
echo "Waiting for MongoDB..."\n\
until nc -z mongo 27017; do sleep 1; done\n\
echo "MongoDB is up!"\n\
\n\
# Initialize database if needed\n\
node scripts/setup-db.js\n\
\n\
# Start the application\n\
npm start' > /app/docker-entrypoint.sh \
&& chmod +x /app/docker-entrypoint.sh

# Start with the initialization script
ENTRYPOINT ["/app/docker-entrypoint.sh"]
