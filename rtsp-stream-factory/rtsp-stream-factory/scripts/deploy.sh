#!/bin/bash

# This script deploys the RTSP Stream Factory application.

# Set environment variables
export NODE_ENV=production

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Build the TypeScript files
echo "Building TypeScript files..."
npm run build

# Start the server
echo "Starting the server..."
npm start

echo "Deployment completed successfully."