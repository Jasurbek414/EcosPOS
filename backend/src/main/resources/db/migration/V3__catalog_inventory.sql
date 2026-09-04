-- =============================================
-- V3: Mahsulot katalogi va filial darajasidagi ombor (tenant sxemasi)
-- =============================================

-- Kategoriyalar
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

-- Mahsulotlar (katalog — kompaniya bo'ylab umumiy, filialga bog'liq emas)
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT REFERENCES categories(id),
    name VARCHAR(200) NOT NULL,
    barcode VARCHAR(64) UNIQUE,
    unit VARCHAR(20) NOT NULL,
    cost_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    sale_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    min_stock_level NUMERIC(12,3),
    image_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_barcode ON products(barcode);

-- Yetkazib beruvchilar
CREATE TABLE suppliers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(30),
    address VARCHAR(300),
    contact_person VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

-- Joriy zaxira miqdori (filial + mahsulot bo'yicha upsert qilinadigan holat)
CREATE TABLE stock_levels (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    branch_id BIGINT NOT NULL REFERENCES branches(id),
    quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    CONSTRAINT uq_stock_levels_product_branch UNIQUE (product_id, branch_id)
);

CREATE INDEX idx_stock_levels_branch ON stock_levels(branch_id);
CREATE INDEX idx_stock_levels_product ON stock_levels(product_id);

-- Ombor harakatlari (append-only audit jurnali)
CREATE TABLE stock_movements (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    branch_id BIGINT NOT NULL REFERENCES branches(id),
    type VARCHAR(20) NOT NULL,
    quantity NUMERIC(12,3) NOT NULL,
    reference_type VARCHAR(30),
    reference_id BIGINT,
    note VARCHAR(300),
    created_by_user_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_stock_movements_branch ON stock_movements(branch_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- Ombor kirim hujjatlari
CREATE TABLE goods_receipts (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT NOT NULL REFERENCES branches(id),
    supplier_id BIGINT REFERENCES suppliers(id),
    receipt_date DATE NOT NULL,
    note VARCHAR(300),
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_by_user_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_goods_receipts_branch ON goods_receipts(branch_id);
CREATE INDEX idx_goods_receipts_supplier ON goods_receipts(supplier_id);

-- Ombor kirim hujjati qatorlari
CREATE TABLE goods_receipt_items (
    id BIGSERIAL PRIMARY KEY,
    goods_receipt_id BIGINT NOT NULL REFERENCES goods_receipts(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity NUMERIC(12,3) NOT NULL,
    unit_cost NUMERIC(14,2) NOT NULL,
    subtotal NUMERIC(14,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_goods_receipt_items_receipt ON goods_receipt_items(goods_receipt_id);
CREATE INDEX idx_goods_receipt_items_product ON goods_receipt_items(product_id);
