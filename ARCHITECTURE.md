# 🏗️ GREEN COINS — System Architecture

## High-Level Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend   │────▶│   Backend    │────▶│  PostgreSQL  │
│  React+Vite  │     │  Express.js  │     │  (Main DB)   │
│  Port: 3000  │     │  Port: 5000  │     │  Port: 5432  │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
              ┌────────────┼────────────┬────────────┐
              ▼            ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ML Service│ │Blockchain│ │  Redis   │ │  MinIO   │
        │ FastAPI  │ │ Service  │ │ (Cache)  │ │(Storage) │
        │Port:8000 │ │Port:4000 │ │Port:6379 │ │Port:9000 │
        └──────────┘ └──────────┘ └──────────┘ └──────────┘
                                       │
                                  ┌──────────┐
                                  │ MongoDB  │
                                  │ (Logs)   │
                                  │Port:27017│
                                  └──────────┘
```

## Data Flow

### Credit Creation Flow

```
User (Frontend)
  │
  ├─── POST /api/user/credits (with plant image + details)
  │
  ▼
Backend
  ├─── Upload image → MinIO (S3 storage)
  ├─── POST /predict-plant → ML Service
  │         └─── Returns: species, carbon_value, carbon_points
  ├─── POST /api/credits → Blockchain Service
  │         └─── Returns: transaction_id, asset_id
  ├─── INSERT → PostgreSQL (carbon_credits table)
  ├─── INSERT → PostgreSQL (transactions table)
  └─── UPDATE → PostgreSQL (wallets table, add points)
```

### Credit Purchase Flow

```
Industry (Frontend)
  │
  ├─── POST /api/industry/purchase/:id
  │         └─── Creates Razorpay order
  │
  ├─── Payment completed (Razorpay)
  │
  ├─── POST /api/industry/verify-payment
  │
  ▼
Backend
  ├─── Verify Razorpay signature
  ├─── POST /api/transfer → Blockchain Service
  │         └─── Returns: transaction_id
  ├─── UPDATE → PostgreSQL (credit ownership)
  ├─── UPDATE → PostgreSQL (payment status)
  ├─── INSERT → PostgreSQL (transactions table)
  └─── UPDATE → PostgreSQL (seller wallet + industry offset)
```

## Database Schema

```
users
├── id (PK)
├── email (UNIQUE)
├── password_hash
├── name
├── role (USER | INDUSTRY | GOVERNMENT)
├── company_name
└── created_at

wallets
├── id (PK)
├── user_id (FK → users)
├── balance
├── carbon_points
└── updated_at

industries
├── id (PK)
├── user_id (FK → users)
├── company_name
├── sector
└── carbon_offset_total

carbon_credits
├── id (PK)
├── creator_id (FK → users)
├── owner_id (FK → users)
├── plant_species
├── carbon_value
├── carbon_points
├── price
├── status (PENDING | VERIFIED | LISTED | SOLD)
├── blockchain_tx_id
├── blockchain_asset_id
└── ml_prediction (JSONB)

transactions
├── id (PK)
├── credit_id (FK → carbon_credits)
├── from_user_id (FK → users)
├── to_user_id (FK → users)
├── tx_type (CREATION | TRANSFER | PAYOUT)
├── amount
└── blockchain_tx_id

payments
├── id (PK)
├── transaction_id (FK → transactions)
├── user_id (FK → users)
├── razorpay_order_id
├── razorpay_payment_id
├── amount
└── status (PENDING | COMPLETED | FAILED)

verification_requests
├── id (PK)
├── credit_id (FK → carbon_credits)
├── requested_by (FK → users)
├── status (PENDING | APPROVED | REJECTED)
└── video_url
```

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (USER/INDUSTRY) |
| POST | `/api/auth/login` | Login, returns JWT |

### User Portal (requires USER role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/dashboard` | Dashboard stats |
| POST | `/api/user/credits` | Create credit (multipart) |
| GET | `/api/user/credits` | List my credits |
| GET | `/api/user/wallet` | Wallet + earnings |
| GET | `/api/user/carbon-data` | Carbon points for 3D tree |

### Industry Portal (requires INDUSTRY role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/industry/dashboard` | Dashboard stats |
| GET | `/api/industry/credits/available` | Browse credits |
| POST | `/api/industry/purchase/:id` | Create Razorpay order |
| POST | `/api/industry/verify-payment` | Verify + transfer |

### Government Portal (requires GOVERNMENT role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/government/dashboard` | Platform overview |
| GET | `/api/government/users` | All users |
| GET | `/api/government/credits` | All credits |
| GET | `/api/government/transactions` | All transactions |

### ML Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/predict-plant` | Predict species + carbon |
| POST | `/calculate-carbon` | Calculate carbon value |
| GET | `/species` | List known species |

### Blockchain Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/credits` | Create credit on ledger |
| POST | `/api/transfer` | Transfer ownership |
| GET | `/api/credits/:id` | Query credit |
| GET | `/api/ledger` | List all assets |

## Security

- **JWT Authentication**: All portal routes require valid JWT token
- **Role-Based Access**: Middleware enforces USER/INDUSTRY/GOVERNMENT separation
- **Password Hashing**: bcrypt with 10 salt rounds
- **Payment Verification**: Razorpay HMAC signature verification

## Docker Services

| Service | Image/Build | Port | Purpose |
|---------|------------|------|---------|
| postgres | postgres:16-alpine | 5432 | Main database |
| redis | redis:7-alpine | 6379 | Cache/sessions |
| mongo | mongo:7 | 27017 | Logs |
| minio | minio/minio | 9000, 9001 | File storage |
| ml-service | ./ml-service | 8000 | ML predictions |
| blockchain | ./blockchain | 4000 | Blockchain ledger |
| backend | ./backend | 5000 | API server |
| frontend | ./frontend | 3000 | Web UI |
