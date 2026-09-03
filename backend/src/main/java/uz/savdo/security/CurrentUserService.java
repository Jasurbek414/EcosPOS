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
}
