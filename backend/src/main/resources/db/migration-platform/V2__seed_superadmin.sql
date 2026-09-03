-- =============================================
-- V2: Boshlang'ich superadmin foydalanuvchi
-- =============================================

-- MUHIM: bu standart parol, production'ga chiqishdan oldin ALMASHTIRILISHI SHART.
-- username: superadmin, parol: ChangeMe123! (bcrypt hash quyida, Spring BCryptPasswordEncoder
-- bilan generatsiya qilingan va tekshirilgan).
INSERT INTO platform_users (username, password, full_name)
VALUES ('superadmin', '$2b$10$nzSVDnK5KUBElqVPKn9uiefFqfG3EXHgAs5B6C9mmCoGAF/eOVV4O', 'Super Administrator');
