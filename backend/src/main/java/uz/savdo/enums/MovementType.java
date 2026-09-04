package uz.savdo.enums;

/**
 * Ombor harakati turi (StockMovement — append-only audit log).
 * RECEIPT    - kirim (GoodsReceipt orqali)
 * SALE       - sotuv (SaleService orqali, manfiy delta)
 * ADJUSTMENT - qo'lda tuzatish (StockAdjustmentService orqali)
 * TRANSFER   - filiallar orasida ko'chirish (StockTransferService orqali, har bir
 *              transfer ikkita StockMovement yozuvi hosil qiladi: manba filialda
 *              manfiy, qabul qiluvchi filialda musbat delta)
 */
public enum MovementType {
    RECEIPT,
    SALE,
    ADJUSTMENT,
    TRANSFER
}
