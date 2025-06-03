-- Database Schema for Transaction History and Portfolio Tracking

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asset types (stocks, crypto, bonds, etc.)
CREATE TABLE asset_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(20),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction categories
CREATE TABLE transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- hex color code
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction tags
CREATE TABLE transaction_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolios
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    total_value DECIMAL(20,8) DEFAULT 0,
    total_cost DECIMAL(20,8) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio holdings
CREATE TABLE portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_type_id UUID NOT NULL REFERENCES asset_types(id),
    quantity DECIMAL(20,8) NOT NULL DEFAULT 0,
    average_cost DECIMAL(20,8) NOT NULL DEFAULT 0,
    current_price DECIMAL(20,8) DEFAULT 0,
    total_value DECIMAL(20,8) DEFAULT 0,
    unrealized_pnl DECIMAL(20,8) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(portfolio_id, asset_type_id)
);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_type_id UUID NOT NULL REFERENCES asset_types(id),
    category_id UUID REFERENCES transaction_categories(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'TRANSFER_IN', 'TRANSFER_OUT')),
    quantity DECIMAL(20,8) NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    total_amount DECIMAL(20,8) NOT NULL,
    fees DECIMAL(20,8) DEFAULT 0,
    notes TEXT,
    executed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction tags junction table
CREATE TABLE transaction_tag_relations (
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES transaction_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

-- Portfolio balance history (for historical tracking)
CREATE TABLE portfolio_balance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    total_value DECIMAL(20,8) NOT NULL,
    total_cost DECIMAL(20,8) NOT NULL,
    realized_pnl DECIMAL(20,8) DEFAULT 0,
    unrealized_pnl DECIMAL(20,8) DEFAULT 0,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asset price history
CREATE TABLE asset_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_type_id UUID NOT NULL REFERENCES asset_types(id) ON DELETE CASCADE,
    price DECIMAL(20,8) NOT NULL,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(asset_type_id, recorded_at)
);

-- Tax events for reporting
CREATE TABLE tax_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- CAPITAL_GAIN, CAPITAL_LOSS, DIVIDEND, etc.
    amount DECIMAL(20,8) NOT NULL,
    cost_basis DECIMAL(20,8),
    gain_loss DECIMAL(20,8),
    holding_period INTEGER, -- days held
    tax_year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_portfolio_id ON transactions(portfolio_id);
CREATE INDEX idx_transactions_executed_at ON transactions(executed_at);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_portfolio_holdings_portfolio_id ON portfolio_holdings(portfolio_id);
CREATE INDEX idx_portfolio_balance_history_portfolio_id ON portfolio_balance_history(portfolio_id);
CREATE INDEX idx_portfolio_balance_history_recorded_at ON portfolio_balance_history(recorded_at);
CREATE INDEX idx_asset_price_history_asset_type_id ON asset_price_history(asset_type_id);
CREATE INDEX idx_asset_price_history_recorded_at ON asset_price_history(recorded_at);
CREATE INDEX idx_tax_events_user_id ON tax_events(user_id);
CREATE INDEX idx_tax_events_tax_year ON tax_events(tax_year);

-- Insert default transaction categories
INSERT INTO transaction_categories (name, description, color) VALUES
('Investment', 'Investment transactions', '#22c55e'),
('Trading', 'Active trading transactions', '#3b82f6'),
('Income', 'Dividend and income transactions', '#10b981'),
('Fees', 'Transaction fees and expenses', '#ef4444'),
('Transfer', 'Account transfers', '#8b5cf6'),
('Other', 'Other transactions', '#6b7280');

-- Insert common asset types
INSERT INTO asset_types (name, symbol, description) VALUES
('Apple Inc.', 'AAPL', 'Technology company stock'),
('Microsoft Corporation', 'MSFT', 'Technology company stock'),
('Amazon.com Inc.', 'AMZN', 'E-commerce and cloud computing'),
('Tesla Inc.', 'TSLA', 'Electric vehicle manufacturer'),
('Bitcoin', 'BTC', 'Cryptocurrency'),
('Ethereum', 'ETH', 'Cryptocurrency'),
('S&P 500 ETF', 'SPY', 'Exchange-traded fund'),
('US Treasury 10Y', 'UST10Y', 'Government bond');