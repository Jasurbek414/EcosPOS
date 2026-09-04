package uz.savdo.dto.branch;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BranchRequest {
    @NotBlank(message = "Filial nomi kiritilishi shart")
    private String name;

    private String address;

    /**
     * PUT /branches/{id} uchun majburiy (filialni faol/nofaol qilish) — controller o'zi
     * null tekshiradi. POST (create) paytida e'tiborga olinmaydi — yangi filial har doim
     * faol yaratiladi, shuning uchun bu yerda @NotNull QO'YILMAYDI (aks holda create so'rovi
     * ham isActive yuborishga majbur bo'lib qolardi).
     */
    private Boolean isActive;
}
