-- =============================================
-- V9: Nasiya savdo (Credit sales) funksiyasi uchun kompaniya OWNER'ining o'z-o'ziga
-- xizmat ko'rsatish darajasidagi yoqish/o'chirish kaliti — superadmin emas, tenant
-- OWNER'ining o'zi boshqaradi (qarang: CompanyProfileController). Standart FALSE —
-- nasiya berish superadmin tomonidan majburiy yoqilgan branchesFeatureEnabled'dan
-- farqli o'laroq, kompaniyaning o'zi qabul qiladigan ixtiyoriy biznes qarori.
-- =============================================

ALTER TABLE companies ADD COLUMN credit_sales_enabled BOOLEAN NOT NULL DEFAULT FALSE;
