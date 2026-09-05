package uz.savdo.enums;

/**
 * Kompaniya xarajati turi. DIQQAT: bu yerda ish haqi/oylik (SALARY) kategoriyasi
 * ATAYLAB YO'Q — ish haqi hech qachon oddiy Expense sifatida yozilmaydi, faqat
 * SalaryPayment orqali hisoblanadi (ikki marta hisoblashning oldini olish qoidasi).
 */
public enum ExpenseCategory {
    RENT,
    UTILITIES,
    TRANSPORT,
    MAINTENANCE,
    MARKETING,
    TAX,
    SUPPLIES,
    OTHER
}
