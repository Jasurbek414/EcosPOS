-- =============================================
-- V3: Superadmin hisoblarini faol/nofaol qilish imkoniyati
-- =============================================

ALTER TABLE platform_users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
