-- =============================================
-- V5: Kompaniya profili tafsilotlari — manzil, telefon, logo (chek/kvitansiyalarda
-- biznes ma'lumotlarini ko'rsatish uchun). Barchasi ixtiyoriy (NULL bo'lishi mumkin).
-- =============================================

ALTER TABLE companies ADD COLUMN address VARCHAR(300);
ALTER TABLE companies ADD COLUMN phone VARCHAR(30);
ALTER TABLE companies ADD COLUMN logo_url VARCHAR(500);
