-- =============================================
-- V6: MIXED to'lov usuli uchun sales.card_amount
-- MIXED to'lovda sotuv summasi qisman naqd, qisman karta bilan yopiladi. card_amount —
-- karta bilan qoplangan qism (amountPaid semantikasi o'zgarmaydi: u har doim mijoz
-- qo'lga bergan/hisobiga o'tkazgan naqd summani bildiradi). Eski qatorlar backfill
-- qilinadi: CARD sotuvlarda card_amount = total_amount (mos, chunki CARD'da qadimdan
-- amountPaid = totalAmount bo'lgan), CASH sotuvlarda card_amount = 0.
-- =============================================

ALTER TABLE sales ADD COLUMN card_amount NUMERIC(14,2);

UPDATE sales SET card_amount = CASE WHEN payment_method = 'CARD' THEN total_amount ELSE 0 END;

ALTER TABLE sales ALTER COLUMN card_amount SET NOT NULL;
ALTER TABLE sales ALTER COLUMN card_amount SET DEFAULT 0;
