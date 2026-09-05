package uz.savdo.dto.branch;

import lombok.Builder;
import lombok.Data;

/**
 * GET /api/v1/branches/limits javobi — kompaniyaning joriy filiallar soni, rejadan
 * kelgan yuqori chegara (maxBranches, null = cheksiz) va superadmin tomonidan
 * yoqilgan/o'chirilgan "Filiallar" funksiyasi holati. Frontend "X / Y filiallar"
 * ko'rsatishi va limit to'lganda "Yangi filial" tugmasini oldindan o'chirib qo'yishi
 * uchun ishlatiladi — yaratish so'rovi baribir server tomonda ham tekshiriladi.
 */
@Data
@Builder
public class BranchLimitsResponse {
    private int currentCount;
    private Integer maxBranches;
    private boolean featureEnabled;
}
