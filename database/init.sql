-- GREEN COINS Database Schema

CREATE TYPE user_role AS ENUM ('USER', 'INDUSTRY', 'GOVERNMENT');
CREATE TYPE credit_status AS ENUM ('PENDING', 'VERIFIED', 'LISTED', 'SOLD', 'REJECTED', 'EXPIRED');
CREATE TYPE tx_type AS ENUM ('CREATION', 'TRANSFER', 'PAYOUT');
CREATE TYPE payment_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
CREATE TYPE verification_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    company_name VARCHAR(255),
    company_registration VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Wallets table
CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(12,2) DEFAULT 0.00,
    carbon_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Industries table
CREATE TABLE industries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(255),
    sector VARCHAR(255),
    carbon_offset_total DECIMAL(12,2) DEFAULT 0.00,
    total_pollution_tons DECIMAL(12,2) DEFAULT 0.00,
    pollution_csv_uploaded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Industry pollution data table
CREATE TABLE industry_pollution_data (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    pollutant_gas VARCHAR(50) NOT NULL,
    pollutant_tons DECIMAL(12,2) NOT NULL,
    manufactured_product VARCHAR(255),
    absorbable VARCHAR(10) DEFAULT 'No',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Carbon credits table
CREATE TABLE carbon_credits (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER REFERENCES users(id),
    owner_id INTEGER REFERENCES users(id),
    plant_species VARCHAR(255),
    plant_image_url VARCHAR(500),
    plant_name VARCHAR(255),
    plant_age_years DECIMAL(5,1) DEFAULT 0,
    plant_health INTEGER DEFAULT 0,
    carbon_per_day_kg DECIMAL(10,4) DEFAULT 0,
    carbon_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    carbon_points INTEGER DEFAULT 0,
    price DECIMAL(10,2) DEFAULT 0,
    status credit_status DEFAULT 'PENDING',
    blockchain_tx_id VARCHAR(255),
    blockchain_asset_id VARCHAR(255),
    ml_prediction JSONB,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    credit_id INTEGER REFERENCES carbon_credits(id),
    from_user_id INTEGER REFERENCES users(id),
    to_user_id INTEGER REFERENCES users(id),
    tx_type tx_type NOT NULL,
    amount DECIMAL(10,2),
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id),
    user_id INTEGER REFERENCES users(id),
    razorpay_order_id VARCHAR(255),
    razorpay_payment_id VARCHAR(255),
    razorpay_signature VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status payment_status DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Verification requests table
CREATE TABLE verification_requests (
    id SERIAL PRIMARY KEY,
    credit_id INTEGER REFERENCES carbon_credits(id),
    requested_by INTEGER REFERENCES users(id),
    reviewed_by INTEGER REFERENCES users(id),
    status verification_status DEFAULT 'PENDING',
    video_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_credits_creator ON carbon_credits(creator_id);
CREATE INDEX idx_credits_owner ON carbon_credits(owner_id);
CREATE INDEX idx_credits_status ON carbon_credits(status);
CREATE INDEX idx_credits_expires ON carbon_credits(expires_at);
CREATE INDEX idx_transactions_credit ON transactions(credit_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_pollution_user ON industry_pollution_data(user_id);

-- Seed government user (password: admin123)
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@greencoins.gov', '$2b$10$frd6yOWXo19rpRj/CG4EceyEe5qFVjijotnBOLwkQDvmIteI1glXy', 'Government Admin', 'GOVERNMENT');

INSERT INTO wallets (user_id, balance, carbon_points) VALUES (1, 0, 0);
