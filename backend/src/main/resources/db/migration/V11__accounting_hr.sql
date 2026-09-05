-- =============================================
-- V11: Kompaniya xarajatlari + HR/ish haqi moduli. Xarajat ("expenses") va ish haqi
-- ("salary_payments") ATAYLAB ALOHIDA jadvallar — ish haqi hech qachon oddiy xarajat
-- sifatida hisoblanmaydi (ikki marta hisoblashning oldini olish uchun, qarang:
-- ExpenseCategory enum'ida SALARY yo'qligi).
-- =============================================

ALTER TABLE users ADD COLUMN base_salary NUMERIC(14,2);

CREATE TABLE expenses (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT REFERENCES branches(id),
    category VARCHAR(30) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    description VARCHAR(300),
    expense_date DATE NOT NULL,
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);
CREATE INDEX idx_expenses_branch ON expenses(branch_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

CREATE TABLE employee_attendance (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    branch_id BIGINT NOT NULL REFERENCES branches(id),
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    note VARCHAR(300),
    marked_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX uq_attendance_user_date ON employee_attendance(user_id, attendance_date) WHERE is_deleted = FALSE;
CREATE INDEX idx_attendance_branch ON employee_attendance(branch_id);

CREATE TABLE salary_payments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    branch_id BIGINT REFERENCES branches(id),
    amount NUMERIC(14,2) NOT NULL,
    period_month VARCHAR(7) NOT NULL,
    payment_date DATE NOT NULL,
    note VARCHAR(300),
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);
CREATE INDEX idx_salary_payments_user ON salary_payments(user_id);

CREATE TABLE employee_advance_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    branch_id BIGINT REFERENCES branches(id),
    type VARCHAR(20) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    transaction_date DATE NOT NULL,
    note VARCHAR(300),
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);
CREATE INDEX idx_advance_tx_user ON employee_advance_transactions(user_id);
