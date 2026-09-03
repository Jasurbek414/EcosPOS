-- =============================================
-- V2: Boshlang'ich seed shabloni (tenant sxemasi)
-- =============================================
-- DIQQAT: bu FAQAT provisioning shabloni — pastdagi "admin" qatori HAR BIR yangi
-- kompaniya yaratilganda CompanyProvisioningService.replaceSeededAdmin() tomonidan
-- darhol superadmin tanlagan haqiqiy username/full name va yangi tasodifiy parolga
-- almashtiriladi. Shu sababli quyidagi parol hash'i hech qachon haqiqiy hisobda
-- ishlatilmaydi — real qiymat emas, faqat NOT NULL ustunni to'ldirish uchun.

INSERT INTO branches (name, address)
VALUES ('Bosh filial', NULL);

INSERT INTO users (username, password, full_name, role, branch_id)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Administrator', 'OWNER', NULL);
