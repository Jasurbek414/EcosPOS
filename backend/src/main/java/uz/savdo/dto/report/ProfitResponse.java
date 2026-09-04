package uz.savdo.dto.report;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/** GET /reports/profit javobi — belgilangan davr uchun umumiy foyda ko'rsatkichlari. */
@Data
@Builder
public class ProfitResponse {
    private BigDecimal totalRevenue;
    private BigDecimal totalCost;
    private BigDecimal totalProfit;
    private BigDecimal profitMarginPercent;
}
