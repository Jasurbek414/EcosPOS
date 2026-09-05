package uz.savdo.dto.branch;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Bitta filial uchun tezkor ko'rsatkichlar (Filiallar bo'limidagi tafsilot sahifasi
 * uchun) — xodimlar soni, mahsulotlar/kam qolgan mahsulotlar soni va bugungi/oylik
 * sotuv ko'rsatkichlari. Hisoblash ReportService'ning mavjud yordamchi metodlaridan
 * foydalanadi (ReportController#dashboard bilan bir xil naqsh, faqat bitta filial
 * uchun).
 */
@Data
@Builder
public class BranchStatsResponse {
    private int staffCount;
    private int productCount;
    private int lowStockCount;
    private BigDecimal todaySalesTotal;
    private int todaySalesCount;
    private BigDecimal monthSalesTotal;
}
