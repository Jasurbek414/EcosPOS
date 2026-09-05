package uz.savdo.enums;

/**
 * Sotuv uchun to'lov usuli.
 * CASH - naqd (kassa qutisiga qaytim berilishi mumkin)
 * CARD - plastik karta (amountPaid har doim totalAmount'ga teng)
 * MIXED - aralash: bir qismi naqd, bir qismi karta (qarang: Sale#cardAmount, SaleService)
 * CREDIT - nasiya (mijozga qarzga): amountPaid/changeAmount/cardAmount har doim 0,
 * butun totalAmount mijoz qarziga aylanadi (qarang: SaleService, CustomerDebtTransaction).
 * Kassaga hech narsa tushmaydi — SaleRepository'ning expectedCash so'rovlari
 * paymentMethod bo'yicha ANIQ moslikka asoslangani uchun bu avtomatik chiqarib
 * tashlanadi, alohida istisno mantiq shart emas.
 */
public enum PaymentMethod {
    CASH,
    CARD,
    MIXED,
    CREDIT
}
