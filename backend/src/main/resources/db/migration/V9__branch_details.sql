-- =============================================
-- V9: Filial tafsilotlari (phone, working_hours) — Filiallar bo'limini
-- kengaytirish, mavjud filiallarga qo'shimcha kontakt/ish vaqti ma'lumoti.
-- =============================================

ALTER TABLE branches ADD COLUMN phone VARCHAR(30);
ALTER TABLE branches ADD COLUMN working_hours VARCHAR(100);
