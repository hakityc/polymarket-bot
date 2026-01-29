#!/bin/bash

# Polymarket Bot Startup Script
# Usage: ./run.sh

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting Polymarket Bot ===${NC}"
echo "Time: $(date)"

# Check for .env
if [ ! -f .env ]; then
    echo "⚠️ .env file not found in current directory!"
    # Try to copy from example if it exists, or look in parent
    if [ -f ../.env ]; then
        echo "Found .env in parent directory, linking..."
        ln -s ../.env .env
    fi
fi

# Install dependencies if node_modules missing
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run the bot in loop mode
# Using 'nohup' is optional if you want it to survive shell exit, 
# but for now we run it directly so you can see output.
# To run in background: nohup npm run loop > logs/output.log 2>&1 &

echo -e "${GREEN}🚀 Launching Bot Loop...${NC}"
npm run loop
