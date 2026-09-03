package uz.savdo.enums;

/**
 * Foydalanuvchi rollari (tenant bazasi ichida).
 * OWNER   - Kompaniya egasi (to'liq kirish, filiallarga bog'liq emas)
 * MANAGER - Filial menejeri (faqat o'z filiali doirasida boshqaruv)
 * CASHIER - Kassir (faqat o'z filiali doirasida sotuv)
 */
public enum UserRole {
    OWNER,
    MANAGER,
    CASHIER
}
