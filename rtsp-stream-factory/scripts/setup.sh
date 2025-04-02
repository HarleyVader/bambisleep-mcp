#!/bin/bash

# This script sets up the RTSP Stream Factory project environment.

# Update package list and install necessary packages
echo "Updating package list..."
sudo apt-get update

echo "Installing required packages..."
sudo apt-get install -y ffmpeg v4l-utils

# Install Node.js and npm if not already installed
if ! command -v node &> /dev/null
then
    echo "Node.js not found. Installing Node.js..."
    curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install project dependencies
echo "Installing project dependencies..."
npm install

# Build the TypeScript project
echo "Building the TypeScript project..."
npm run build

echo "Setup completed successfully."