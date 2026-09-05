package uz.savdo.enums;

/**
 * Mijoz qarz (nasiya) tranzaksiyasi turi.
 * CREDIT_SALE - nasiya savdo (server-internal, faqat SaleService orqali avtomatik yaratiladi)
 * PAYMENT - mijozning qarzni to'lashi
 * WRITE_OFF - qarzni hisobdan chiqarish (moliyaviy qaror, faqat OWNER)
 */
public enum DebtTransactionType {
    CREDIT_SALE,
    PAYMENT,
    WRITE_OFF
}
