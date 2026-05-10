-- Routex Final Database Schema
-- Greenfield Initialization Script

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. ADMINS (Filament Admin Users)
CREATE TABLE admins (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
    remember_token VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MERCHANTS (API Consumers)
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    use_case TEXT,
    expected_monthly_volume BIGINT,
    industry VARCHAR(100),
    phone_number VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending_verification'
        CHECK (status IN ('pending_verification', 'pending_approval', 'active', 'suspended', 'rejected')),
    approved_by BIGINT REFERENCES admins(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    suspended_at TIMESTAMP WITH TIME ZONE,
    suspension_reason TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_merchants_email ON merchants(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_merchants_status ON merchants(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_merchants_pending_approval ON merchants(created_at) 
    WHERE status = 'pending_approval' AND deleted_at IS NULL;

-- 4. API KEYS (Decoupled from merchants)
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    key_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA256 hex
    key_prefix VARCHAR(20) NOT NULL,     -- 'ptms_sb_xxxx'
    name VARCHAR(100) NOT NULL DEFAULT 'Default',
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('sandbox', 'production')),
    scopes JSONB DEFAULT '["transactions:write", "transactions:read"]',
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by BIGINT REFERENCES admins(id),
    revoked_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_ip INET,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_merchant ON api_keys(merchant_id, environment);

-- 5. EMAIL VERIFICATION TOKENS
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_evt_token_hash ON email_verification_tokens(token_hash) WHERE used_at IS NULL;

-- 6. VENDORS
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    supported_channels JSONB DEFAULT '["qris"]',
    supported_currencies JSONB DEFAULT '["IDR"]',
    sandbox_base_url TEXT NOT NULL,
    production_base_url TEXT NOT NULL,
    default_timeout_ms INT DEFAULT 5000,
    is_active BOOLEAN DEFAULT true,
    integration_doc_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Vendors
INSERT INTO vendors (code, name, sandbox_base_url, production_base_url) VALUES 
('QOINHUB', 'Qoinhub', 'https://sandbox.qoinhub.id', 'https://api.qoinhub.id'),
('MIDTRANS', 'Midtrans', 'https://api.sandbox.midtrans.com', 'https://api.midtrans.com'),
('XENDIT', 'Xendit', 'https://api.xendit.co', 'https://api.xendit.co');

-- Default routing rules (sandbox)
-- Round-robin dengan priority sama untuk semua vendor
INSERT INTO routing_rules_global 
  (id, environment, vendor_id, min_amount, max_amount, priority, is_active) 
SELECT 
  gen_random_uuid(),
  'sandbox',
  id,
  0,
  999999999,
  0,
  true
FROM vendors
WHERE is_active = true;

-- Sama untuk production
INSERT INTO routing_rules_global 
  (id, environment, vendor_id, min_amount, max_amount, priority, is_active)
SELECT 
  gen_random_uuid(),
  'production',
  id,
  0,
  999999999,
  0,
  true
FROM vendors
WHERE is_active = true;

-- 7. MERCHANT VENDOR CREDENTIALS
CREATE TABLE merchant_vendor_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('sandbox', 'production')),
    credentials_encrypted TEXT NOT NULL,
    credentials_fingerprint VARCHAR(64),
    validation_status VARCHAR(20) DEFAULT 'unchecked'
        CHECK (validation_status IN ('unchecked', 'valid', 'invalid')),
    last_validated_at TIMESTAMP WITH TIME ZONE,
    validation_error TEXT,
    is_enabled BOOLEAN DEFAULT true,
    priority INT DEFAULT 0,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (merchant_id, vendor_id, environment)
);

CREATE INDEX idx_mvc_merchant ON merchant_vendor_credentials(merchant_id);
CREATE INDEX idx_mvc_lookup ON merchant_vendor_credentials(merchant_id, environment, is_enabled) 
    WHERE is_enabled = true;

-- 8. GLOBAL ROUTING RULES
CREATE TABLE routing_rules_global (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('sandbox', 'production')),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    min_amount NUMERIC(15,2) NOT NULL,
    max_amount NUMERIC(15,2) NOT NULL,
    priority INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (max_amount >= min_amount)
);

CREATE INDEX idx_routing_global ON routing_rules_global(environment, min_amount, max_amount, priority DESC) 
    WHERE is_active = true;

-- 9. MERCHANT ROUTING RULES (Enterprise override)
CREATE TABLE routing_rules_merchant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('sandbox', 'production')),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    min_amount NUMERIC(15,2) NOT NULL,
    max_amount NUMERIC(15,2) NOT NULL,
    priority INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (max_amount >= min_amount)
);

CREATE INDEX idx_routing_merchant ON routing_rules_merchant(merchant_id, environment, min_amount, max_amount, priority DESC) 
    WHERE is_active = true;

-- 10. TRANSACTIONS (Partitioned)
CREATE TABLE transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(64) NOT NULL,
    merchant_id UUID NOT NULL,
    environment VARCHAR(20) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    vendor_id UUID NOT NULL,
    vendor_credential_id UUID NOT NULL,
    routing_reason TEXT,
    amount NUMERIC(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'IDR',
    payment_channel VARCHAR(50) DEFAULT 'qris',
    status VARCHAR(20) NOT NULL DEFAULT 'pending_payment',
    vendor_transaction_id VARCHAR(255),
    qris_code TEXT,
    callback_delivered BOOLEAN DEFAULT false,
    reconciliation_attempts INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    expired_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (created_at, id)
) PARTITION BY RANGE (created_at);

-- Monthly Partitions for 2026
CREATE TABLE transactions_2026_05 PARTITION OF transactions FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE transactions_2026_06 PARTITION OF transactions FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE transactions_2026_07 PARTITION OF transactions FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE transactions_2026_08 PARTITION OF transactions FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE transactions_2026_09 PARTITION OF transactions FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE transactions_2026_10 PARTITION OF transactions FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

-- Indexes per partition
-- (Note: In PostgreSQL 11+, indexes on partitioned tables are automatically created on partitions)
CREATE INDEX idx_txn_lookup ON transactions (transaction_id);
CREATE INDEX idx_txn_merchant_recent ON transactions (merchant_id, created_at DESC);
CREATE INDEX idx_txn_pending_reconcile ON transactions (created_at) WHERE status = 'pending_payment';
CREATE UNIQUE INDEX idx_txn_idempotency ON transactions (merchant_id, idempotency_key, request_hash, created_at);

-- 11. TRANSACTION EVENTS (Partitioned)
CREATE TABLE transaction_events (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    transaction_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    transaction_id VARCHAR(64) NOT NULL,
    merchant_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (transaction_created_at, id)
) PARTITION BY RANGE (transaction_created_at);

CREATE TABLE transaction_events_2026_05 PARTITION OF transaction_events FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE transaction_events_2026_06 PARTITION OF transaction_events FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE transaction_events_2026_07 PARTITION OF transaction_events FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE transaction_events_2026_08 PARTITION OF transaction_events FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE transaction_events_2026_09 PARTITION OF transaction_events FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE transaction_events_2026_10 PARTITION OF transaction_events FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE INDEX idx_events_unprocessed ON transaction_events (created_at) WHERE processed_at IS NULL;
CREATE INDEX idx_events_txn_id ON transaction_events (transaction_id);

-- 12. VENDOR PENALTIES
CREATE TABLE vendor_penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    merchant_credential_id UUID REFERENCES merchant_vendor_credentials(id) ON DELETE CASCADE,
    penalty_points INT DEFAULT 0,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_id, merchant_credential_id)
);

-- 13. RATE LIMIT CONFIGS
CREATE TABLE rate_limit_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'user', 'vendor', 'account', 'global'
    entity_id UUID,
    limit_type VARCHAR(50) NOT NULL, -- 'tps', 'daily_count', 'daily_volume'
    limit_value NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rate_limit_configs_entity ON rate_limit_configs(entity_type, entity_id);

-- 14. BILLING & NOTIFICATIONS
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    monthly_price_idr NUMERIC(15, 2) NOT NULL,
    annual_price_idr NUMERIC(15, 2),
    monthly_transaction_limit INT,
    monthly_volume_limit_idr NUMERIC(15, 2),
    max_vendors INT DEFAULT 3,
    max_api_keys INT DEFAULT 5,
    tps_limit INT DEFAULT 100,
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE merchant_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'expired')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    canceled_at TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    transaction_count INT NOT NULL DEFAULT 0,
    successful_count INT NOT NULL DEFAULT 0,
    total_volume_idr NUMERIC(15, 2) NOT NULL DEFAULT 0,
    api_calls_count BIGINT NOT NULL DEFAULT 0,
    by_vendor JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(merchant_id, period_start, period_end)
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    subscription_id UUID REFERENCES merchant_subscriptions(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    subtotal_idr NUMERIC(15, 2) NOT NULL,
    tax_idr NUMERIC(15, 2) DEFAULT 0,
    total_idr NUMERIC(15, 2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'void')),
    issued_at TIMESTAMP WITH TIME ZONE,
    due_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    pdf_url TEXT,
    line_items JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE merchant_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret VARCHAR(255) NOT NULL,
    subscribed_events JSONB DEFAULT '["payment.paid", "payment.failed"]',
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('sandbox', 'production')),
    is_enabled BOOLEAN DEFAULT true,
    consecutive_failure_days INT DEFAULT 0,
    auto_disabled_at TIMESTAMP WITH TIME ZONE,
    last_success_at TIMESTAMP WITH TIME ZONE,
    last_failure_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(merchant_id, environment)
);

-- 15. LARAVEL SYSTEM TABLES
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255), -- Support UUID or BIGINT
    ip_address VARCHAR(45),
    user_agent TEXT,
    payload TEXT NOT NULL,
    last_activity INT NOT NULL
);

CREATE TABLE cache (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    expiration INT NOT NULL
);

CREATE TABLE jobs (
    id BIGSERIAL PRIMARY KEY,
    queue VARCHAR(255) NOT NULL,
    payload TEXT NOT NULL,
    attempts SMALLINT NOT NULL,
    reserved_at INT,
    available_at INT NOT NULL,
    created_at INT NOT NULL
);
