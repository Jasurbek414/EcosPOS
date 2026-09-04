package uz.savdo.dto.report;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/** GET /reports/top-products javobidagi bitta mahsulot qatori. */
@Data
@Builder
public class TopProductResponse {
    private Long productId;
    private String productName;
    private String unit;
    private BigDecimal quantitySold;
    private BigDecimal revenue;
    private BigDecimal profit;
}
