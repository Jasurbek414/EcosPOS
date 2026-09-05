package uz.savdo.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import uz.savdo.entity.User;
import uz.savdo.enums.UserRole;
import uz.savdo.exception.ForbiddenException;
import uz.savdo.exception.UnauthorizedException;

import java.util.List;

/**
 * Manual scope-check helper — bu loyihada @PreAuthorize ISHLATILMAYDI, buning o'rniga
 * controller'lar shu servisning metodlarini chaqiradi. Uslub maktab_davomad loyihasidagi
 * CurrentUserService'dan olingan, lekin savdo'ning ancha soddaroq 3 rolli/filialli
 * iyerarxiyasiga moslashtirilgan:
 *
 *   OWNER   -> hamma narsa, cheklovsiz (barcha filiallar)
 *   MANAGER -> faqat o'z filiali (branchId majburiy, boshqa filialga tegolmaydi)
 *   CASHIER -> faqat o'z filiali (branchId majburiy, boshqa filialga tegolmaydi)
 */
@Component
public class CurrentUserService {

    /** Joriy autentifikatsiyalangan foydalanuvchini SecurityContext'dan oladi. */
    public User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getPrincipal()
                : null;
        if (!(principal instanceof User user)) {
            throw new UnauthorizedException("Autentifikatsiya talab qilinadi");
        }
        return user;
    }

    public boolean isOwner() {
        return getCurrentUser().getRole() == UserRole.OWNER;
    }

    /** OWNER har doim o'tadi; MANAGER/CASHIER faqat o'z filialiga tegishli bo'lsa. */
    public void assertCanAccessBranch(Long branchId) {
        User user = getCurrentUser();
        if (user.getRole() == UserRole.OWNER) {
            return;
        }
        if (branchId != null && branchId.equals(user.getBranchId())) {
            return;
        }
        throw new ForbiddenException("Bu filialga kirish huquqingiz yo'q");
    }

    /** Filial/xodimlar boshqaruvi kabi faqat OWNER'ga ruxsat etilgan amallar uchun. */
    public void assertIsOwner() {
        if (!isOwner()) {
            throw new ForbiddenException("Bu amal faqat kompaniya egasi (OWNER) uchun ruxsat etilgan");
        }
    }

    /**
     * OWNER uchun {@code null} qaytaradi ("cheklov yo'q, barcha filiallar ko'rinadi") —
     * chaqiruvchi buni maxsus tekshirishi kerak. MANAGER/CASHIER uchun faqat o'z
     * filiali bilan cheklangan ro'yxat qaytadi.
     */
    public List<Long> allowedBranchIds() {
        User user = getCurrentUser();
        if (user.getRole() == UserRole.OWNER) {
            return null;
        }
        return List.of(user.getBranchId());
    }

    /** Katalog (Category/Product/Supplier) yozish huquqi — OWNER va MANAGER; CASHIER faqat o'qiydi. */
    public void assertCanManageCatalog() {
        UserRole role = getCurrentUser().getRole();
        if (role != UserRole.OWNER && role != UserRole.MANAGER) {
            throw new ForbiddenException("Katalogni tahrirlash huquqi yo'q");
        }
    }

    /**
     * Hisobotlarni (sotuv/foyda analitikasi) ko'rish huquqi — OWNER va MANAGER; CASHIER'ga
     * moliyaviy/foyda ma'lumotlari ko'rsatilmaydi. Mantiqan assertCanManageCatalog bilan
     * bir xil, lekin chaqiruv nuqtalarida aniqlik uchun alohida metod sifatida ajratilgan.
     */
    public void assertCanViewReports() {
        UserRole role = getCurrentUser().getRole();
        if (role != UserRole.OWNER && role != UserRole.MANAGER) {
            throw new ForbiddenException("Hisobotlarni ko'rish huquqi yo'q");
        }
    }

    /**
     * Ombor yozish huquqi (kirim hujjatlari / qo'lda tuzatish) — OWNER istalgan filialda,
     * MANAGER faqat o'z filialida. CASHIER hech qachon yoza olmaydi (faqat ko'rish uchun
     * mavjud bo'lgan assertCanAccessBranch'dan foydalanadi).
     */
    public void assertCanWriteInventory(Long branchId) {
        User user = getCurrentUser();
        if (user.getRole() == UserRole.OWNER) {
            return;
        }
        if (user.getRole() == UserRole.MANAGER && branchId != null && branchId.equals(user.getBranchId())) {
            return;
        }
        throw new ForbiddenException("Ombor ma'lumotlarini o'zgartirish huquqingiz yo'q");
    }

    /**
     * Filiallar orasida ko'chirish huquqi — OWNER istalgan ikki filial orasida ko'chira
     * oladi. MANAGER esa faqat IKKI TOMONDAN KAMIDA BITTASI o'z filiali bo'lsa (chiqish
     * o'z filialidan YOKI kirish o'z filialiga) — {@code assertCanWriteInventory}'ni
     * ikkala tomonga alohida-alohida qo'llash noto'g'ri, chunki transfer'da ikki filial
     * har doim har xil bo'ladi va MANAGER'ning bittagina o'z filiali bor: shu sababli
     * "ikkalasi ham mening filialim" talabi hech qachon bajarilmas edi. CASHIER
     * hech qachon ko'chira olmaydi.
     */
    public void assertCanTransferStock(Long fromBranchId, Long toBranchId) {
        User user = getCurrentUser();
        if (user.getRole() == UserRole.OWNER) {
            return;
        }
        if (user.getRole() == UserRole.MANAGER
                && user.getBranchId() != null
                && (user.getBranchId().equals(fromBranchId) || user.getBranchId().equals(toBranchId))) {
            return;
        }
        throw new ForbiddenException("Bu filiallar orasida ko'chirish huquqingiz yo'q");
    }

    /**
     * Xarajat (expense) yozish huquqi — OWNER istalgan filialda (yoki branchId=null,
     * kompaniya bo'ylab — bu holni chaqiruvchi controller alohida assertIsOwner() bilan
     * talab qilishi kerak, bu metod null'ni o'zi rad etmaydi/tekshirmaydi). MANAGER faqat
     * o'z filialida (branchId!=null va o'ziniki bo'lsa). CASHIER hech qachon yoza olmaydi.
     * Naqsh assertCanWriteInventory(Long) bilan bir xil.
     */
    public void assertCanManageExpenses(Long branchId) {
        User user = getCurrentUser();
        if (user.getRole() == UserRole.OWNER) {
            return;
        }
        if (user.getRole() == UserRole.MANAGER && branchId != null && branchId.equals(user.getBranchId())) {
            return;
        }
        throw new ForbiddenException("Xarajatlarni boshqarish huquqingiz yo'q");
    }

    /**
     * Davomat (attendance) yozish huquqi — OWNER istalgan filialda, MANAGER faqat o'z
     * filialida. CASHIER hech qachon yoza olmaydi. Naqsh assertCanWriteInventory(Long)
     * bilan bir xil.
     */
    public void assertCanManageAttendance(Long branchId) {
        User user = getCurrentUser();
        if (user.getRole() == UserRole.OWNER) {
            return;
        }
        if (user.getRole() == UserRole.MANAGER && branchId != null && branchId.equals(user.getBranchId())) {
            return;
        }
        throw new ForbiddenException("Davomatni boshqarish huquqingiz yo'q");
    }
}
