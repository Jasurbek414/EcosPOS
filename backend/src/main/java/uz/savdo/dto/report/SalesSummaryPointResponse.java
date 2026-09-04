package uz.savdo.dto.report;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/** GET /reports/sales-summary javobidagi bitta davr (kun yoki oy) nuqtasi. */
@Data
@Builder
public class SalesSummaryPointResponse {
    private String period;
    private BigDecimal revenue;
    private BigDecimal profit;
    private int saleCount;
}
