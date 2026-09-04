package uz.savdo.dto.goodsreceipt;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class GoodsReceiptRequest {

    @NotNull(message = "Filial (branchId) kiritilishi shart")
    private Long branchId;

    /** Yetkazib beruvchi noma'lum/o'tkazib yuborilgan bo'lishi mumkin. */
    private Long supplierId;

    /** Kiritilmasa bugungi sana ishlatiladi. */
    private LocalDate receiptDate;

    private String note;

    @NotEmpty(message = "Kamida bitta mahsulot qatori bo'lishi kerak")
    @Valid
    private List<GoodsReceiptItemRequest> items;
}
