#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  🛑 GREEN COINS — Stop All Services
#  Double-click this file to shut everything down cleanly.
# ═══════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║    🛑 Stopping GREEN COINS Platform      ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
echo "  Shutting down all containers..."
docker compose down
echo ""
echo "  ✅  All services stopped. Goodbye!"
echo ""
sleep 3
