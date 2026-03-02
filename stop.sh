#!/bin/bash
# Stop all GREEN COINS services
echo "🛑 Stopping GREEN COINS..."

if docker compose version &> /dev/null 2>&1; then
    docker compose down
elif command -v docker-compose &> /dev/null; then
    docker-compose down
fi

echo "✅ All services stopped."
