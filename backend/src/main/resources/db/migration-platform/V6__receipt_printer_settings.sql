-- =============================================
-- V6: Chek/printer sozlamalari — POS chekining ko'rinishi va chop etilish tartibi
-- kompaniya darajasida (barcha filiallar uchun bir xil) sozlanadi.
-- =============================================

ALTER TABLE companies ADD COLUMN receipt_paper_width VARCHAR(10) NOT NULL DEFAULT '80mm';
ALTER TABLE companies ADD COLUMN receipt_footer_text VARCHAR(300);
ALTER TABLE companies ADD COLUMN receipt_show_logo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE companies ADD COLUMN receipt_show_cashier_name BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE companies ADD COLUMN receipt_auto_print BOOLEAN NOT NULL DEFAULT FALSE;
