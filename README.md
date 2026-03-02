# 🌿 GREEN COINS — Carbon Trading Platform

A full-stack blockchain-powered carbon trading platform connecting individuals, industries, and governments for sustainable carbon credit management.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, TailwindCSS, Three.js, React Three Fiber, Redux Toolkit, Framer Motion |
| Backend | Node.js 20, Express.js, TypeScript, JWT |
| Database | PostgreSQL 16 (main), Redis 7 (cache), MongoDB 7 (logs) |
| ML Service | Python, FastAPI, scikit-learn |
| Blockchain | Hyperledger Fabric simulation service (Express.js) |
| Payment | Razorpay |
| Storage | MinIO (S3-compatible) |
| Deployment | Docker, Docker Compose |

## Quick Start

### Prerequisites
- Docker Desktop (8GB+ RAM allocated)
- Git

### Run (One Command)

```bash
cd "/Users/dj/Downloads/carbon trading"

# Single command to start everything
./start.sh
```

This will build and start all 8 services, run health checks, and display access URLs.

To stop everything:
```bash
./stop.sh
```

### Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5001/api |
| ML Service | http://localhost:8000 |
| Blockchain Service | http://localhost:4000 |
| MinIO Console | http://localhost:9001 |

### Default Government Login
- Email: `admin@greencoins.gov`
- Password: `admin123`

> **Note:** The government user is seeded automatically. Register new users through the UI as USER or INDUSTRY roles.

## Project Structure

```
carbon-trading/
├── frontend/          # React + Vite app
│   └── src/
│       ├── components/   # Sidebar, CarbonTree (3D)
│       ├── pages/        # All portal pages
│       ├── store.ts      # Redux auth store
│       └── api.ts        # Axios client
├── backend/           # Express.js API server
│   └── src/
│       ├── routes/       # auth, user, industry, government
│       └── middleware/   # JWT auth + role guard
├── ml-service/        # FastAPI ML endpoints
├── blockchain/        # Blockchain simulation service
├── database/          # PostgreSQL init scripts
├── docker-compose.yml
└── ARCHITECTURE.md
```

## Three Portals

### 👤 User Portal (`/user/*`)
- Dashboard with credits, wallet balance, carbon points
- Create carbon credits (ML analysis + blockchain recording)
- View all credits with blockchain transaction IDs
- Wallet with earnings and withdrawal

### 🏭 Industry Portal (`/industry/*`)
- Dashboard with purchased credits and carbon offset
- Browse available credits from users
- Purchase credits (Razorpay payment + blockchain transfer)

### 🏛️ Government Portal (`/government/*`)
- Overview dashboard with platform-wide statistics
- All users listing
- All carbon credits with blockchain records
- All transactions with blockchain transaction IDs

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — Required for real payments
- `JWT_SECRET` — Change for production
- All other variables have working defaults for local development

## Key Workflows

1. **Credit Creation**: User → Backend → ML Service (analysis) → Blockchain (record) → PostgreSQL (store)
2. **Credit Purchase**: Industry → Razorpay (payment) → Backend (verify) → Blockchain (transfer) → PostgreSQL (update)
3. **Monitoring**: Government → Backend → PostgreSQL (all data) → Dashboard
