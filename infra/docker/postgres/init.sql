-- Init Script for PTMS Database
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE ptms_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    callback_url TEXT,
    callback_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_api_key ON ptms_users(api_key);

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendor_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    account_name VARCHAR(255) NOT NULL,
    credentials JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendor_accounts_vendor_id ON vendor_accounts(vendor_id);

CREATE TABLE user_account_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES ptms_users(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    account_id UUID NOT NULL UNIQUE REFERENCES vendor_accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_account_assignments_user_id ON user_account_assignments(user_id);
CREATE INDEX idx_user_account_assignments_vendor_id ON user_account_assignments(vendor_id);

CREATE TABLE routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    min_amount NUMERIC(15, 2) NOT NULL,
    max_amount NUMERIC(15, 2) NOT NULL,
    priority INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_routing_rules_amount ON routing_rules(min_amount, max_amount);

CREATE TABLE transaction_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transaction_events_transaction_id ON transaction_events(transaction_id);
CREATE INDEX idx_transaction_events_unprocessed ON transaction_events(created_at) WHERE processed_at IS NULL;

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES ptms_users(id),
    vendor_id UUID REFERENCES vendors(id),
    account_id UUID REFERENCES vendor_accounts(id),
    amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'IDR',
    payment_channel VARCHAR(50) DEFAULT 'qris',
    status VARCHAR(50) NOT NULL DEFAULT 'pending_payment',
    idempotency_key VARCHAR(255),
    qris_code TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    expired_at TIMESTAMP WITH TIME ZONE,
    callback_delivered BOOLEAN DEFAULT false,
    reconciliation_attempts INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_vendor_id ON transactions(vendor_id);
CREATE INDEX idx_transactions_idempotency_key ON transactions(idempotency_key);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

CREATE TABLE vendor_penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    account_id UUID REFERENCES vendor_accounts(id) ON DELETE CASCADE,
    penalty_points INT DEFAULT 0,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_id, account_id)
);

CREATE INDEX idx_vendor_penalties_vendor_id ON vendor_penalties(vendor_id);
CREATE INDEX idx_vendor_penalties_account_id ON vendor_penalties(account_id);

CREATE TABLE rate_limit_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'user', 'vendor', 'account', 'global'
    entity_id UUID, -- NULL for global
    limit_type VARCHAR(50) NOT NULL, -- 'tps', 'daily_count', 'daily_volume'
    limit_value NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rate_limit_configs_entity ON rate_limit_configs(entity_type, entity_id);
