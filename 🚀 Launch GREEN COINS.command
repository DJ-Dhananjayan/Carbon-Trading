#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  🌿 GREEN COINS — One-Click Launcher
#  Just double-click this file to start the entire platform!
# ═══════════════════════════════════════════════════════════

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

# Move to project folder (works from any location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

clear
echo -e "${GREEN}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║       🌿 GREEN COINS Platform            ║"
echo "  ║     Carbon Credit Trading System          ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ── Check Docker ────────────────────────────────────────────
echo -e "${BLUE}Checking requirements...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌  Docker is not installed!${NC}"
    echo ""
    echo "  Please install Docker Desktop from:"
    echo "  https://www.docker.com/products/docker-desktop/"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

if ! docker info &> /dev/null 2>&1; then
    echo -e "${YELLOW}⏳  Docker Desktop is not running. Starting it for you...${NC}"
    open -a Docker
    echo "    Waiting for Docker to start (up to 60 seconds)..."
    for i in $(seq 1 20); do
        sleep 3
        if docker info &> /dev/null 2>&1; then
            echo -e "${GREEN}✅  Docker is ready!${NC}"
            break
        fi
        echo "    Still waiting... ($((i*3))s)"
    done
    if ! docker info &> /dev/null 2>&1; then
        echo -e "${RED}❌  Docker failed to start. Please open Docker Desktop manually and try again.${NC}"
        read -p "Press Enter to exit..."
        exit 1
    fi
fi

echo -e "${GREEN}✅  Docker is running${NC}"
echo ""

# ── Smart Rebuild Detection ─────────────────────────────────
HASH_FILE=".build_hash"
CURRENT_HASH=$(find ./frontend/src ./frontend/package.json \
    ./backend/src ./backend/package.json \
    ./blockchain ./blockchain/package.json \
    -type f 2>/dev/null | sort | xargs md5 2>/dev/null | md5)

NEEDS_BUILD=false
if [ ! -f "$HASH_FILE" ]; then
    echo -e "${YELLOW}🔨  First run — building everything (takes ~3 minutes)...${NC}"
    NEEDS_BUILD=true
elif [ "$(cat $HASH_FILE)" != "$CURRENT_HASH" ]; then
    echo -e "${YELLOW}🔨  Code changed — rebuilding (takes ~1-2 minutes)...${NC}"
    NEEDS_BUILD=true
else
    echo -e "${GREEN}⚡  No changes detected — fast start!${NC}"
fi

echo ""

# ── Stop existing containers ────────────────────────────────
echo -e "${BLUE}🔄  Stopping any old containers...${NC}"
docker compose down 2>/dev/null || true
echo ""

# ── Start everything ────────────────────────────────────────
if [ "$NEEDS_BUILD" = true ]; then
    echo -e "${GREEN}🚀  Building and starting all services...${NC}"
    if ! docker compose up --build -d; then
        echo ""
        echo -e "${RED}❌  Build failed! Check the error above.${NC}"
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo "$CURRENT_HASH" > "$HASH_FILE"
else
    echo -e "${GREEN}🚀  Starting all services...${NC}"
    docker compose up -d
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅  All services are up!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"

# ── Wait for gateway to be ready ───────────────────────────
echo ""
echo -e "${BLUE}⏳  Waiting for the app to be ready...${NC}"
for i in $(seq 1 15); do
    sleep 2
    if curl -sf http://localhost > /dev/null 2>&1; then
        echo -e "${GREEN}✅  App is ready!${NC}"
        break
    fi
    echo -n "."
done
echo ""

# ── Print links ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}  🌐  Your app is live at:${NC}"
echo -e "  ${GREEN}  ➜  http://localhost${NC}   ← Open this in your browser"
echo ""
echo -e "  ${YELLOW}Government Login:${NC}"
echo -e "    Email:    admin@greencoins.gov"
echo -e "    Password: admin123"
echo ""
echo -e "  ${BLUE}Register a new user at:${NC}"
echo -e "    http://localhost/register"
echo ""
echo -e "  ${YELLOW}To stop the app:${NC} Double-click  🛑 Stop GREEN COINS.command"
echo -e "  ${YELLOW}Or run:${NC}          docker compose down"
echo ""

# Auto-open browser
open http://localhost

# Keep terminal open so user can see logs
echo -e "${BLUE}══════════════════════════════════════════════${NC}"
echo -e "  Showing live logs (press Ctrl+C to stop watching, app keeps running)"
echo -e "${BLUE}══════════════════════════════════════════════${NC}"
echo ""
docker compose logs -f --tail=20
