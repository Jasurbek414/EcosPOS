-- =============================================
-- V1: Platform (master) sxemasi — kompaniyalar, superadmin, audit
-- =============================================

CREATE TABLE companies (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    db_host VARCHAR(255) NOT NULL DEFAULT 'postgres',
    db_port INT NOT NULL DEFAULT 5432,
    db_name VARCHAR(100) NOT NULL UNIQUE,
    db_username VARCHAR(100) NOT NULL DEFAULT 'postgres',
    status VARCHAR(20) NOT NULL DEFAULT 'PROVISIONING',
    blocked_reason VARCHAR(500),
    blocked_at TIMESTAMP,
    plan VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_status ON companies(status);

-- Platform darajasidagi superadmin foydalanuvchilar (hech qaysi kompaniyaga tegishli emas)
CREATE TABLE platform_users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(150),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE platform_audit_log (
    id BIGSERIAL PRIMARY KEY,
    platform_user_id BIGINT REFERENCES platform_users(id),
    action VARCHAR(100) NOT NULL,
    company_id BIGINT REFERENCES companies(id),
    details TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_platform_audit_log_company ON platform_audit_log(company_id);
