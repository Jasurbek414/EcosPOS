-- =============================================
-- V5: sale_items uchun cost_price snapshot (tarixiy foyda hisobi to'g'ri bo'lishi uchun)
-- Muammo: SaleItem faqat unitPrice (sotuv narxi) snapshot qilardi, lekin cost_price
-- snapshot qilinmagan edi — shu sababli eski sotuvlar foydasi Product#cost_price BUGUNGI
-- qiymati bilan hisoblanardi, bu esa ta'minotchi narxi keyinroq o'zgarganda noto'g'ri
-- natija berardi. Endi har bir sale_item o'zining sotuv paytidagi cost_price'ini saqlaydi.
-- =============================================

ALTER TABLE sale_items ADD COLUMN cost_price_snapshot NUMERIC(14,2);

UPDATE sale_items si
SET cost_price_snapshot = p.cost_price
FROM products p
WHERE p.id = si.product_id;

ALTER TABLE sale_items ALTER COLUMN cost_price_snapshot SET NOT NULL;
