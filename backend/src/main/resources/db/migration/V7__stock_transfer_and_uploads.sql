-- =============================================
-- V7: Filiallar orasida ombor ko'chirish (stock_transfers) va mahsulot rasm
-- yuklash uchun infratuzilma. Rasm yuklash (uz.savdo.controller.FileController)
-- faqat filesystem'da yashaydi - bu migratsiyada DB tomoni yo'q, products.image_url
-- ustuni V3'da allaqachon mavjud.
-- =============================================

CREATE TABLE stock_transfers (
    id BIGSERIAL PRIMARY KEY,
    from_branch_id BIGINT NOT NULL REFERENCES branches(id),
    to_branch_id BIGINT NOT NULL REFERENCES branches(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity NUMERIC(12,3) NOT NULL,
    note VARCHAR(300),
    created_by_user_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_stock_transfers_from_branch ON stock_transfers(from_branch_id);
CREATE INDEX idx_stock_transfers_to_branch ON stock_transfers(to_branch_id);
CREATE INDEX idx_stock_transfers_product ON stock_transfers(product_id);
