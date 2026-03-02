#!/bin/bash
# ═══════════════════════════════════════════════
#  GREEN COINS — One-Command Launcher
#  Run: chmod +x start.sh && ./start.sh
# ═══════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# Stop any existing containers
echo -e "${BLUE}🔄 Stopping any existing containers...${NC}"
$COMPOSE down 2>/dev/null || true

# Build and start
echo ""
echo -e "${GREEN}🚀 Building and starting all services...${NC}"
echo -e "${BLUE}   This may take a few minutes on first run.${NC}"
echo ""

$COMPOSE up --build -d

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ GREEN COINS is running!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}🌐 Single Access Link:${NC}      http://localhost"
echo -e "  ${BLUE}   (Frontend + API + MinIO)${NC}"
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

# Wait and show health
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 10

echo ""
echo -e "${BLUE}Service health checks:${NC}"

check_service() {
    if curl -sf "$2" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ $1${NC}"
    else
        echo -e "  ${YELLOW}⏳ $1 (still starting...)${NC}"
    fi
}

check_service "Gateway (Main)" "http://localhost"
check_service "Backend API"    "http://localhost/api/health"

echo ""
echo -e "${GREEN}🌿 Opening http://localhost in your browser...${NC}"
open http://localhost
