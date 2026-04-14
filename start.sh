#!/bin/bash
# ═══════════════════════════════════════════════
#  GREEN COINS — Smart Launcher
#  Rebuilds images only when source code changes.
#  Run: chmod +x start.sh && ./start.sh
# ═══════════════════════════════════════════════

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

HASH_FILE=".build_hash"

echo -e "${GREEN}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║      🌿 GREEN COINS Platform         ║"
echo "  ║    Carbon Trading System v1.0         ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}❌ Docker is not installed. Please install Docker Desktop first.${NC}"
    exit 1
fi

if ! docker info &> /dev/null 2>&1; then
    echo -e "${YELLOW}❌ Docker is not running. Please start Docker Desktop first.${NC}"
    exit 1
fi

echo -e "${BLUE}✓ Docker is running${NC}"

# Check Docker Compose
if docker compose version &> /dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
else
    echo -e "${YELLOW}❌ Docker Compose not found.${NC}"
    exit 1
fi

echo -e "${BLUE}✓ Docker Compose found${NC}"
echo ""

# ── Smart Rebuild Detection ─────────────────────────────────────────
# Hash all source files that affect Docker build layers
CURRENT_HASH=$(find ./frontend/src ./frontend/package.json \
    ./backend/src ./backend/package.json \
    ./blockchain ./blockchain/package.json \
    ./ml-service/requirements.txt ./ml-service/main.py \
    -type f 2>/dev/null | sort | xargs md5 2>/dev/null | md5)

NEEDS_BUILD=false
if [ ! -f "$HASH_FILE" ]; then
    echo -e "${YELLOW}🔨 First run — building all images (this takes a few minutes)...${NC}"
    NEEDS_BUILD=true
elif [ "$(cat $HASH_FILE)" != "$CURRENT_HASH" ]; then
    echo -e "${YELLOW}🔨 Source code changed — rebuilding affected images...${NC}"
    NEEDS_BUILD=true
else
    echo -e "${GREEN}⚡ No source changes detected — skipping rebuild (fast start!)${NC}"
fi

echo ""

# ── Start Services ──────────────────────────────────────────────────
echo -e "${BLUE}🔄 Stopping any existing containers...${NC}"
$COMPOSE down 2>/dev/null || true

echo ""
if [ "$NEEDS_BUILD" = true ]; then
    echo -e "${GREEN}🚀 Building and starting all services...${NC}"
    $COMPOSE up --build -d
    # Save hash after successful build
    echo "$CURRENT_HASH" > "$HASH_FILE"
else
    echo -e "${GREEN}🚀 Starting all services (using cached images)...${NC}"
    $COMPOSE up -d
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ GREEN COINS is running!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}🌐 Open this link:${NC}"
echo -e "  ${BLUE}  ➜  http://localhost${NC}"
echo ""
echo -e "  ${YELLOW}Government Login:${NC}"
echo -e "    Email:    admin@greencoins.gov"
echo -e "    Password: admin123"
echo ""
echo -e "  ${BLUE}Register new users at:${NC}"
echo -e "    http://localhost/register"
echo ""
echo -e "  ${YELLOW}To view logs:${NC}      $COMPOSE logs -f"
echo -e "  ${YELLOW}To stop:${NC}           $COMPOSE down"
echo ""

# ── Health Checks ───────────────────────────────────────────────────
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 8

echo ""
echo -e "${BLUE}Service health checks:${NC}"

check_service() {
    local retries=5
    local i=0
    while [ $i -lt $retries ]; do
        if curl -sf "$2" > /dev/null 2>&1; then
            echo -e "  ${GREEN}✅ $1${NC}"
            return
        fi
        sleep 3
        i=$((i+1))
    done
    echo -e "  ${YELLOW}⏳ $1 (still starting — refresh in a moment)${NC}"
}

check_service "Gateway (Main)" "http://localhost"
check_service "Backend API"    "http://localhost/api/health"

echo ""
echo -e "${GREEN}🌿 Opening http://localhost in your browser...${NC}"
open http://localhost
