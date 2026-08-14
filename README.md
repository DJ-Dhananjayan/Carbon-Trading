# 🌿 GREEN COINS — Carbon Trading Platform

> A full-stack carbon credit management and trading platform combining **machine learning, blockchain-based transaction recording, role-based portals, payments, and distributed services** into a single system.

GREEN COINS connects **individual users, industries, and government administrators** through a digital platform for creating, managing, trading, and monitoring carbon credits.

The platform was designed as an end-to-end system rather than a single application layer: the frontend communicates with a TypeScript/Express backend, which coordinates the ML analysis service, database layer, payment processing, blockchain simulation, and object storage.

---

## 🚀 What the Platform Does

GREEN COINS supports three primary user roles:

### 👤 Individuals

* Create carbon credits through the ML analysis workflow
* View created carbon credits
* Track blockchain transaction IDs
* Manage wallet balances and earnings
* Withdraw available earnings

### 🏭 Industries

* Browse available carbon credits
* Purchase credits from users
* Complete payments through Razorpay
* Track purchased credits and carbon-offset information
* View blockchain transaction records

### 🏛️ Government

* Monitor platform-wide statistics
* View registered users
* Monitor carbon credits
* Monitor transactions
* Inspect blockchain transaction records

---

# 🧠 AI/ML + Blockchain Workflow

The core credit-generation workflow combines machine learning with blockchain recording:

```text
User
  │
  │ Create Carbon Credit
  ▼
Backend API
  │
  ▼
ML Service
  │
  │ Carbon analysis
  ▼
Backend
  │
  ▼
Blockchain Service
  │
  │ Record transaction
  ▼
PostgreSQL
  │
  ▼
User Dashboard
```

This separates the ML processing layer from the main application backend, allowing the prediction/analysis service to operate independently through a FastAPI interface.

---

# 🏗️ System Architecture

```text
                         ┌──────────────────────┐
                         │   React Frontend     │
                         │ React + TypeScript   │
                         │ Tailwind + Three.js  │
                         └──────────┬───────────┘
                                    │
                                    │ REST API
                                    ▼
                         ┌──────────────────────┐
                         │   Express Backend    │
                         │ Node.js + TypeScript │
                         │ JWT + Role Guards    │
                         └──────┬───────┬───────┘
                                │       │
                 ┌──────────────┘       └──────────────┐
                 ▼                                     ▼
       ┌──────────────────┐                   ┌──────────────────┐
       │   ML Service     │                   │ Blockchain       │
       │ Python/FastAPI   │                   │ Simulation       │
       │ scikit-learn     │                   │ Express.js       │
       └──────────────────┘                   └──────────────────┘
                 │                                     │
                 └────────────────┬────────────────────┘
                                  ▼
                         ┌──────────────────┐
                         │   PostgreSQL     │
                         │ Primary Database │
                         └──────────────────┘

        ┌───────────────┐    ┌──────────────┐    ┌──────────────┐
        │    Redis      │    │   MongoDB    │    │    MinIO     │
        │    Cache      │    │    Logs      │    │ Object Store │
        └───────────────┘    └──────────────┘    └──────────────┘

                         ┌──────────────────┐
                         │    Razorpay      │
                         │    Payments      │
                         └──────────────────┘
```

The system is divided into independently deployable services and can be started together using Docker Compose.

---

# 🛠️ Technology Stack

| Layer            | Technology                                 |
| ---------------- | ------------------------------------------ |
| Frontend         | React 18, TypeScript, TailwindCSS          |
| 3D / UI          | Three.js, React Three Fiber, Framer Motion |
| State Management | Redux Toolkit                              |
| Backend          | Node.js 20, Express.js, TypeScript         |
| Authentication   | JWT                                        |
| Primary Database | PostgreSQL 16                              |
| Caching          | Redis 7                                    |
| Logging          | MongoDB 7                                  |
| ML Service       | Python, FastAPI, scikit-learn              |
| Blockchain       | Hyperledger Fabric simulation service      |
| Payments         | Razorpay                                   |
| Object Storage   | MinIO / S3-compatible storage              |
| Containerization | Docker, Docker Compose                     |

---

# 🔄 Key Product Workflows

## 1. Carbon Credit Creation

```text
User
 ↓
React Frontend
 ↓
Backend API
 ↓
ML Analysis Service
 ↓
Carbon Credit Result
 ↓
Blockchain Recording
 ↓
PostgreSQL
 ↓
User Dashboard
```

The backend coordinates the ML analysis and blockchain-recording stages before storing the resulting platform data.

---

## 2. Carbon Credit Purchase

```text
Industry
 ↓
Browse Available Credits
 ↓
Select Credit
 ↓
Razorpay Payment
 ↓
Backend Payment Verification
 ↓
Blockchain Transfer
 ↓
PostgreSQL Update
 ↓
Industry Dashboard
```

The purchase flow combines payment processing, backend verification, blockchain transaction recording, and database updates.

---

## 3. Government Monitoring

```text
Government Portal
       ↓
Backend API
       ↓
PostgreSQL
       ↓
Users / Credits / Transactions
       ↓
Government Dashboard
```

The government portal provides a centralized view of platform activity and blockchain transaction records.

---

# 📂 Project Structure

```text
carbon-trading/
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Sidebar/
│       │   └── CarbonTree/
│       ├── pages/
│       ├── store.ts
│       └── api.ts
│
├── backend/
│   └── src/
│       ├── routes/
│       │   ├── auth/
│       │   ├── user/
│       │   ├── industry/
│       │   └── government/
│       └── middleware/
│           ├── JWT authentication
│           └── role guards
│
├── ml-service/
│   └── FastAPI ML endpoints
│
├── blockchain/
│   └── Blockchain simulation service
│
├── database/
│   └── PostgreSQL initialization scripts
│
├── docker-compose.yml
├── start.sh
├── stop.sh
├── .env.example
└── ARCHITECTURE.md
```

---

# 🖥️ Three Role-Based Portals

## User Portal

Route:

```text
/user/*
```

Provides:

* Carbon credit dashboard
* Wallet balance
* Carbon points
* Credit creation
* Credit history
* Blockchain transaction IDs
* Earnings
* Withdrawal functionality

---

## Industry Portal

Route:

```text
/industry/*
```

Provides:

* Industry dashboard
* Purchased carbon credits
* Carbon-offset information
* Available credit marketplace
* Credit purchasing
* Razorpay payment flow
* Blockchain transfer records

---

## Government Portal

Route:

```text
/government/*
```

Provides:

* Platform-wide statistics
* User monitoring
* Carbon credit monitoring
* Transaction monitoring
* Blockchain transaction records

---

# 🐳 Running the Project

## Prerequisites

* Docker Desktop
* Git
* At least 8 GB RAM allocated to Docker

## Clone the Repository

```bash
git clone https://github.com/DJ-Dhananjayan/Carbon-Trading.git
cd Carbon-Trading
```

## Configure Environment

```bash
cp .env.example .env
```

Configure the required environment variables before starting the services.

## Start the Platform

```bash
./start.sh
```

The startup script builds and starts the platform services and performs health checks.

## Stop the Platform

```bash
./stop.sh
```

---

# 🌐 Local Service Endpoints

| Service            | Endpoint                    |
| ------------------ | --------------------------- |
| Frontend           | `http://localhost:3000`     |
| Backend API        | `http://localhost:5001/api` |
| ML Service         | `http://localhost:8000`     |
| Blockchain Service | `http://localhost:4000`     |
| MinIO Console      | `http://localhost:9001`     |

---

# ⚙️ Environment Configuration

Copy the example configuration:

```bash
cp .env.example .env
```

Important variables include:

```text
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
JWT_SECRET
```

For production deployments, secrets should be replaced with secure values and should never be committed to the repository.

> **Development note:** Any default/demo credentials included in the project are intended only for local development and should be changed before production use.

---

# 🔐 Authentication & Authorization

The backend uses **JWT-based authentication** with role-based access control.

The three primary roles are:

```text
USER
INDUSTRY
GOVERNMENT
```

Protected backend routes use authentication and role-guard middleware to control access to role-specific functionality.

---

# 🔗 Service Responsibilities

### Frontend

Responsible for:

* User interfaces
* Role-specific portals
* API communication
* Application state
* Interactive visualizations
* 3D carbon visualization

### Backend

Responsible for:

* REST APIs
* Authentication
* Authorization
* Business workflows
* Database coordination
* Payment verification
* Communication with ML and blockchain services

### ML Service

Responsible for:

* Carbon analysis
* ML inference endpoints
* Separating ML processing from the main backend

### Blockchain Service

Responsible for:

* Blockchain transaction simulation
* Carbon credit recording
* Credit transfer records

### PostgreSQL

Primary transactional database for:

* Users
* Carbon credits
* Transactions
* Platform data

### Redis

Used as the caching layer.

### MongoDB

Used for application logging.

### MinIO

Provides S3-compatible object storage.

---

# 🧩 Engineering Highlights

The project demonstrates an end-to-end distributed application architecture involving:

* Multi-role authentication and authorization
* REST API design
* Independent ML service
* Blockchain service integration
* Payment integration
* Multiple database technologies
* Caching
* Object storage
* Docker-based service orchestration
* React/TypeScript frontend
* Python/FastAPI backend service
* Cross-service workflows
* Health checks and local service orchestration

The system is intentionally structured as multiple services rather than a single monolithic application.

---

# 📈 Architecture Documentation

For a deeper explanation of the service architecture and communication flow, see:

```text
ARCHITECTURE.md
```

---

# 🎯 Why This Project

GREEN COINS was built to explore how **AI/ML, distributed services, blockchain, payments, and full-stack engineering** can be combined into a complete product workflow.

The goal was not only to build individual features, but to connect them into a system where a user action can travel across multiple services:

```text
Frontend
   ↓
API
   ↓
ML / Payment / Blockchain
   ↓
Database
   ↓
Dashboard
```

---

## 👨‍💻 Author

**Dhananjayan S**

AI & Data Science Engineer

GitHub:
https://github.com/DJ-Dhananjayan

Portfolio:
https://itsdjportfolio.netlify.app/
