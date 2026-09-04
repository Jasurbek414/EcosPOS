package uz.savdo.enums;

/**
 * Ombor harakati turi (StockMovement — append-only audit log).
 * RECEIPT    - kirim (GoodsReceipt orqali)
 * SALE       - sotuv (Phase 3'da ishlatiladi, hozircha yozilmaydi)
 * ADJUSTMENT - qo'lda tuzatish (StockAdjustmentService orqali)
 */
public enum MovementType {
    RECEIPT,
    SALE,
    ADJUSTMENT
}
