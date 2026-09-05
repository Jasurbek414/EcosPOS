-- =============================================
-- V13: Mijozlar (Customers) va nasiya (qarz) tranzaksiyalari kitobi — "Nasiya savdo"
-- (Credit sales) funksiyasi uchun. Mijozning joriy qarzi = SUM(CREDIT_SALE) -
-- SUM(PAYMENT) - SUM(WRITE_OFF), Java'da hisoblanadi (qarang: CustomerDebtController).
-- =============================================

CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    address VARCHAR(300),
    note VARCHAR(300),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE TABLE customer_debt_transactions (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    branch_id BIGINT REFERENCES branches(id),
    type VARCHAR(20) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    transaction_date DATE NOT NULL,
    related_sale_id BIGINT REFERENCES sales(id),
    note VARCHAR(300),
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);
CREATE INDEX idx_customer_debt_tx_customer ON customer_debt_transactions(customer_id);

ALTER TABLE sales ADD COLUMN customer_id BIGINT REFERENCES customers(id);
