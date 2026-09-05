-- =============================================
-- V8: Filiallar (Branches) funksiyasi uchun superadmin darajasidagi yoqish/o'chirish
-- kalitlari — reja (plan) cheklovidan mustaqil, superadminning qo'lda qarori.
-- =============================================

ALTER TABLE companies ADD COLUMN branches_feature_enabled BOOLEAN NOT NULL DEFAULT TRUE;
