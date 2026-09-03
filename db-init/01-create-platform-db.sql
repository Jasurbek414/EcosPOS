-- Postgres init-skript FAQAT bo'sh data-katalogda (birinchi konteyner ishga
-- tushishida) avtomatik bajariladi. "postgres" (bootstrap) bazasidan tashqari
-- platform_db kerak - backend'dagi Company/PlatformAuditLog kabi jadvallar
-- shu yerda, plain JdbcTemplate orqali (JPA emas) yashaydi. Har bir tenant
-- (do'kon) uchun alohida baza esa runtime'da CompanyProvisioningService
-- tomonidan "CREATE DATABASE" bilan yaratiladi - bu yerda oldindan yozilmaydi.
CREATE DATABASE platform_db;
