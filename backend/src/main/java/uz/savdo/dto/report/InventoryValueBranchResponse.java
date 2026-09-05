package uz.savdo.dto.report;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/** GET /reports/inventory-value javobidagi filial kesimidagi bitta yozuv. */
@Data
@Builder
public class InventoryValueBranchResponse {
    private Long branchId;
    private String branchName;
    private BigDecimal value;
}
