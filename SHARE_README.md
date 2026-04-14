# 🌿 GREEN COINS — Carbon Trading Platform

## How to Run (No source code needed!)

### Step 1 — Install Docker Desktop
Download from: https://www.docker.com/products/docker-desktop  
(Free, works on Windows, Mac, Linux)

### Step 2 — Put these 2 files in a folder
- `docker-compose.yml`  ← this file
- `nginx.conf`          ← the nginx config file

### Step 3 — Run one command
Open a terminal inside that folder and run:

```bash
docker compose up -d
```

Wait 1-2 minutes for everything to download and start.

### Step 4 — Open the app
👉 http://localhost

---

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Government Admin** | admin@greencoins.gov | admin123 |
| User / Industry | Register at http://localhost/register | — |

---

## Services Running

| Service | URL |
|---------|-----|
| Main App | http://localhost |
| Backend API | http://localhost:5001/api |
| MinIO Storage Console | http://localhost:9001 |

---

## To Stop
```bash
docker compose down
```

## Requirements
- Docker Desktop installed
- 8GB+ RAM recommended
- ~2GB disk space (images download once)
