-- =============================================
-- V8: O'lchov birliklari (measurement_units) — endi qattiq Java enum emas, OWNER/MANAGER
-- Sozlamalar bo'limi orqali o'z birliklarini boshqaradi. Mavjud 4 ta enum qiymati bilan
-- bir xil kod/nom bilan urug'lantiriladi, shunda mavjud mahsulotlarning unit ustuni
-- hech qanday qo'shimcha ma'lumot migratsiyasisiz to'g'ri qoladi.
-- =============================================

CREATE TABLE measurement_units (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

INSERT INTO measurement_units (code, name) VALUES
  ('DONA', 'Dona'), ('KG', 'Kilogram'), ('LITR', 'Litr'), ('QUTI', 'Quti');
