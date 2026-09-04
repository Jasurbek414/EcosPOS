package uz.savdo.enums;

/**
 * Ombor harakati turi (StockMovement — append-only audit log).
 * RECEIPT    - kirim (GoodsReceipt orqali)
 * SALE       - sotuv (SaleService orqali, manfiy delta)
 * ADJUSTMENT - qo'lda tuzatish (StockAdjustmentService orqali)
 */
public enum MovementType {
    RECEIPT,
    SALE,
    ADJUSTMENT
}
