package uz.savdo.enums;

/**
 * Sotuv uchun to'lov usuli.
 * CASH - naqd (kassa qutisiga qaytim berilishi mumkin)
 * CARD - plastik karta (amountPaid har doim totalAmount'ga teng)
 * MIXED - aralash: bir qismi naqd, bir qismi karta (qarang: Sale#cardAmount, SaleService)
 */
public enum PaymentMethod {
    CASH,
    CARD,
    MIXED
}
