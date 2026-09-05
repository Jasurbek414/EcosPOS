-- =============================================
-- V7: Chek/printer sozlamalari kengaytirildi — sarlavha ustidagi ixtiyoriy matn,
-- filial nomini ko'rsatish/yashirish va valyuta yorlig'i (masalan "so'm").
-- =============================================

ALTER TABLE companies ADD COLUMN receipt_header_text VARCHAR(200);
ALTER TABLE companies ADD COLUMN receipt_show_branch_name BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE companies ADD COLUMN receipt_currency_label VARCHAR(10) NOT NULL DEFAULT 'so''m';
