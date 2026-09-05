package uz.savdo.dto.company;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * PATCH /api/v1/company/credit-sales so'rovi — tenant OWNER'ining o'z-o'ziga xizmat
 * ko'rsatish darajasida "Nasiya savdo" funksiyasini yoqish/o'chirishi.
 */
@Data
public class CreditSalesSettingsUpdateRequest {

    @NotNull(message = "creditSalesEnabled kiritilishi shart")
    private Boolean creditSalesEnabled;
}
