-- V10: platform_users jadvaliga brute-force himoya maydonlarini qoshish
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
