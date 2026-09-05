package uz.savdo.dto.company;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * PUT /api/v1/company/receipt-settings so'rovi — POS chekining ko'rinishi va chop
 * etilish tartibini sozlash. Kompaniya darajasida (barcha filiallar uchun bir xil).
 */
@Data
public class ReceiptSettingsUpdateRequest {

    @NotBlank(message = "Qog'oz kengligi kiritilishi shart")
    @Pattern(regexp = "^(58mm|80mm)$", message = "Qog'oz kengligi 58mm yoki 80mm bo'lishi kerak")
    private String receiptPaperWidth;

    @Size(max = 300, message = "Pastki matn 300 belgidan oshmasligi kerak")
    private String receiptFooterText;

    @NotNull(message = "receiptShowLogo kiritilishi shart")
    private Boolean receiptShowLogo;

    @NotNull(message = "receiptShowCashierName kiritilishi shart")
    private Boolean receiptShowCashierName;

    @NotNull(message = "receiptAutoPrint kiritilishi shart")
    private Boolean receiptAutoPrint;
}
