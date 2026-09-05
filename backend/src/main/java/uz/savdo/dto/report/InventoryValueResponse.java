package uz.savdo.dto.report;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/** GET /reports/inventory-value javobi — qoldiqlarning tannarx bo'yicha umumiy qiymati. */
@Data
@Builder
public class InventoryValueResponse {
    private BigDecimal totalValue;
    private int totalSkuCount;
    private List<InventoryValueBranchResponse> branches;
}
