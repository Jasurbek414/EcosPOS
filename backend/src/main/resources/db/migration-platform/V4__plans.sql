-- =============================================
-- V4: Tariflar (Plans) — obuna rejalari va kompaniyaga biriktirish
-- =============================================

CREATE TABLE plans (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    price_monthly NUMERIC(12,2) NOT NULL DEFAULT 0,
    max_branches INT,
    max_users INT,
    max_products INT,
    description VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- max_branches / max_users / max_products ustunlarida NULL = CHEKSIZ (limit yo'q).

ALTER TABLE companies ADD COLUMN plan_id BIGINT REFERENCES plans(id);

-- Eslatma: eski companies.plan (VARCHAR) ustuni ATAYLAB o'chirilmadi/ko'chirilmadi —
-- endi ishlatilmaydi, lekin mavjud qatorlarni buzmaslik uchun bazada dormant holda qoladi.

INSERT INTO plans (name, price_monthly, max_branches, max_users, max_products, description) VALUES
  ('Boshlang''ich', 0, 1, 3, 200, 'Kichik do''konlar uchun bepul reja'),
  ('Standart', 250000, 3, 10, 2000, 'O''rta biznes uchun'),
  ('Professional', 600000, NULL, NULL, NULL, 'Cheksiz filial/xodim/mahsulot');
