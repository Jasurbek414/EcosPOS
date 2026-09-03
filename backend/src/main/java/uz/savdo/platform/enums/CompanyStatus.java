package uz.savdo.platform.enums;

/**
 * Kompaniya (tenant) holati.
 * PROVISIONING - baza yaratilmoqda
 * ACTIVE - normal ishlayapti
 * BLOCKED - superadmin tomonidan bloklangan
 * SUSPENDED_UNPAID - to'lov qilinmagani uchun to'xtatilgan
 * FAILED - provisioning muvaffaqiyatsiz tugagan
 */
public enum CompanyStatus {
    PROVISIONING,
    ACTIVE,
    BLOCKED,
    SUSPENDED_UNPAID,
    FAILED
}
