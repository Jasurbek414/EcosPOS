-- =============================================
-- V12: Xarajat kategoriyalari (expense_categories) — endi qattiq Java enum emas,
-- OWNER/MANAGER Sozlamalar bo'limi orqali o'z kategoriyalarini boshqaradi.
-- Mavjud 8 ta enum qiymati bilan bir xil kod/nom bilan urug'lantiriladi, shunda
-- mavjud xarajatlarning category ustuni hech qanday qo'shimcha ma'lumot
-- migratsiyasisiz to'g'ri qoladi (measurement_units bilan bir xil naqsh).
-- =============================================

CREATE TABLE expense_categories (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

INSERT INTO expense_categories (code, name) VALUES
  ('RENT', 'Ijara'),
  ('UTILITIES', 'Kommunal xizmatlar'),
  ('TRANSPORT', 'Transport'),
  ('MAINTENANCE', 'Ta''mirlash va xizmat ko''rsatish'),
  ('MARKETING', 'Marketing'),
  ('TAX', 'Soliq'),
  ('SUPPLIES', 'Xo''jalik buyumlari'),
  ('OTHER', 'Boshqa');
