package uz.savdo.dto.branch;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.Branch;

/**
 * Filial nomi/id — faqat tanlov (picker) uchun, masalan filiallar orasida ko'chirish
 * formasidagi "qayerga" maydoni. To'liq {@link BranchResponse}dan farqli, bu ro'yxat
 * rolga qaramasdan (MANAGER/CASHIER ham) BARCHA faol filiallarga ochiq — chunki
 * filial nomi o'zi sezilarli ma'lumot emas, ko'chirish uchun boshqa filialni
 * ko'rsata olish esa shart.
 */
@Data
@Builder
public class BranchNameResponse {
    private Long id;
    private String name;

    public static BranchNameResponse from(Branch b) {
        return BranchNameResponse.builder().id(b.getId()).name(b.getName()).build();
    }
}
