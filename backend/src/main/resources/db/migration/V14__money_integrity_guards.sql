-- V14: pul va qoldiq yaxlitligini baza darajasida himoyalash.
--
-- Sabab: 2026-09-13 auditi dasturda bir nechta poyga holati va tekshiruv
-- yetishmasligini aniqladi. Dastur kodidagi tuzatishlar yetarli emas — oxirgi
-- himoya chegarasi bazada bo'lishi kerak, chunki bitta yangi xato ham pul
-- ma'lumotini jimgina buzib qo'yishi mumkin.

-- ---------------------------------------------------------------------------
-- 1) Bitta kassirda bir vaqtda faqat BITTA ochiq smena bo'lishi mumkin.
--    Avval dastur faqat "ochiq smena bormi?" deb qarardi, lekin bu tekshiruv
--    qulflanmagan edi: ikki tez so'rov ikkalasi ham o'tib ketardi va shundan
--    keyin har bir savdo 500 xatosi berardi.
-- ---------------------------------------------------------------------------

-- Indeks yaratishdan oldin mavjud dublikatlarni yopamiz: har bir kassirda eng
-- eski ochiq smena qoladi, keyingilari avtomatik yopilgan deb belgilanadi.
UPDATE cash_shifts s
SET status = 'CLOSED',
    closed_at = COALESCE(s.closed_at, NOW()),
    note = COALESCE(s.note || ' | ', '') || 'Avtomatik yopildi: dublikat ochiq smena (V14)'
WHERE s.status = 'OPEN'
  AND s.is_deleted = FALSE
  AND EXISTS (
      SELECT 1 FROM cash_shifts oldingi
      WHERE oldingi.cashier_id = s.cashier_id
        AND oldingi.status = 'OPEN'
        AND oldingi.is_deleted = FALSE
        AND oldingi.id < s.id
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_shifts_one_open_per_cashier
    ON cash_shifts (cashier_id)
    WHERE status = 'OPEN' AND is_deleted = FALSE;

-- ---------------------------------------------------------------------------
-- 2) Mijozning qarz chegarasi (nasiya limiti).
--    NULL = chegara belgilanmagan (eski xatti-harakat saqlanadi).
-- ---------------------------------------------------------------------------

ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(14,2);

COMMENT ON COLUMN customers.credit_limit IS
    'Nasiya chegarasi. NULL - chegara yoq. Savdo paytida joriy qarz + yangi summa shu qiymatdan oshsa rad etiladi.';

-- ---------------------------------------------------------------------------
-- 3) Pul va miqdor ustunlari uchun CHECK cheklovlari.
--
--    NOT VALID ATAYLAB: mavjud yozuvlar qayta tekshirilmaydi (agar eski
--    ma'lumotda allaqachon manfiy qiymat bo'lsa, migratsiya yiqilib butun
--    kompaniyani ishdan chiqarmasligi kerak). Cheklov YANGI va YANGILANGAN
--    yozuvlarga to'liq kuchda qo'llanadi. Eski ma'lumot tozalangandan keyin
--    ularni "ALTER TABLE ... VALIDATE CONSTRAINT ..." bilan to'liq yoqish mumkin.
-- ---------------------------------------------------------------------------

ALTER TABLE sale_items
    ADD CONSTRAINT chk_sale_items_quantity_positive CHECK (quantity > 0) NOT VALID;
ALTER TABLE sale_items
    ADD CONSTRAINT chk_sale_items_unit_price_nonneg CHECK (unit_price >= 0) NOT VALID;

ALTER TABLE sales
    ADD CONSTRAINT chk_sales_total_nonneg CHECK (total_amount >= 0) NOT VALID;
ALTER TABLE sales
    ADD CONSTRAINT chk_sales_amount_paid_nonneg CHECK (amount_paid >= 0) NOT VALID;

ALTER TABLE stock_levels
    ADD CONSTRAINT chk_stock_levels_quantity_nonneg CHECK (quantity >= 0) NOT VALID;

ALTER TABLE goods_receipt_items
    ADD CONSTRAINT chk_gri_quantity_positive CHECK (quantity > 0) NOT VALID;

ALTER TABLE customer_debt_transactions
    ADD CONSTRAINT chk_debt_amount_positive CHECK (amount > 0) NOT VALID;

ALTER TABLE cash_shifts
    ADD CONSTRAINT chk_cash_shifts_opening_nonneg CHECK (opening_cash >= 0) NOT VALID;
