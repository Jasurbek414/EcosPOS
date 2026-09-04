-- =============================================
-- V4: Kassa smenalari va sotuvlar (POS yadrosi, tenant sxemasi)
-- =============================================

-- Kassa smenalari (kassir ish boshlaganda ochadi, tugaganda yopadi)
CREATE TABLE cash_shifts (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT NOT NULL REFERENCES branches(id),
    cashier_id BIGINT NOT NULL REFERENCES users(id),
    opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    opening_cash NUMERIC(14,2) NOT NULL,
    closing_cash NUMERIC(14,2),
    expected_cash NUMERIC(14,2),
    status VARCHAR(20) NOT NULL,
    note VARCHAR(300),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_cash_shifts_branch ON cash_shifts(branch_id);
CREATE INDEX idx_cash_shifts_cashier ON cash_shifts(cashier_id);
CREATE INDEX idx_cash_shifts_status ON cash_shifts(status);

-- Sotuvlar (chek) — har biri bitta ochiq kassa smenasiga bog'liq
CREATE TABLE sales (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT NOT NULL REFERENCES branches(id),
    cash_shift_id BIGINT NOT NULL REFERENCES cash_shifts(id),
    cashier_id BIGINT NOT NULL REFERENCES users(id),
    total_amount NUMERIC(14,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    amount_paid NUMERIC(14,2) NOT NULL,
    change_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_sales_branch ON sales(branch_id);
CREATE INDEX idx_sales_cash_shift ON sales(cash_shift_id);
CREATE INDEX idx_sales_cashier ON sales(cashier_id);

-- Sotuv qatorlari (chekdagi har bir mahsulot qatori)
CREATE TABLE sale_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT NOT NULL REFERENCES sales(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity NUMERIC(12,3) NOT NULL,
    unit_price NUMERIC(14,2) NOT NULL,
    subtotal NUMERIC(14,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
