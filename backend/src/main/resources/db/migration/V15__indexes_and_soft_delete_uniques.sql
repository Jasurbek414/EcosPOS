-- V15: hisobot tezligi va soft-delete bilan to'g'ri ishlaydigan unique cheklovlar.
--
-- Sabab (2026-09-13 auditi):
--   1) Sana bo'yicha hisobotlar indekssiz ishlardi — savdo tarixi o'sgani sari
--      har bir dashboard ochilishi sekinlashib boradi.
--   2) barcode va username uchun UNIQUE cheklovlar o'chirilgan yozuvlarni ham
--      hisobga olardi: mahsulot yoki xodim o'chirilib, keyin xuddi shu kod/login
--      bilan yangisi yaratilsa, foydalanuvchi tushunarsiz 500 xatosini ko'rardi.

-- ---------------------------------------------------------------------------
-- 1) Sana indekslari
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_sales_created_at
    ON sales (created_at);

CREATE INDEX IF NOT EXISTS idx_sales_customer
    ON sales (customer_id)
    WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_debt_tx_date
    ON customer_debt_transactions (transaction_date);

CREATE INDEX IF NOT EXISTS idx_customer_debt_tx_customer
    ON customer_debt_transactions (customer_id);

CREATE INDEX IF NOT EXISTS idx_salary_payments_date
    ON salary_payments (payment_date);

CREATE INDEX IF NOT EXISTS idx_advance_tx_date
    ON employee_advance_transactions (transaction_date);

CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at
    ON stock_movements (created_at);

-- ---------------------------------------------------------------------------
-- 2) Soft-delete'ni hisobga oladigan unique cheklovlar
--
--    Eski to'liq UNIQUE cheklovlar olib tashlanib, o'rniga faqat
--    is_deleted = FALSE yozuvlarga qo'llanadigan partial unique indeks qo'yiladi.
--    Dastur kodi allaqachon aynan shunday tekshiradi (findBy...AndIsDeletedFalse),
--    ya'ni bu o'zgarish bazani kodga moslashtiradi.
-- ---------------------------------------------------------------------------

-- Mahsulot shtrix-kodi
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_barcode_key;
DROP INDEX IF EXISTS products_barcode_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_barcode_active
    ON products (barcode)
    WHERE barcode IS NOT NULL AND is_deleted = FALSE;

-- Xodim login'i
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
DROP INDEX IF EXISTS users_username_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_active
    ON users (username)
    WHERE is_deleted = FALSE;
