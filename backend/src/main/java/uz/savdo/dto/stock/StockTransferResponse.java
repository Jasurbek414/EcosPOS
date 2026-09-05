package uz.savdo.dto.stock;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.Branch;
import uz.savdo.entity.Product;
import uz.savdo.entity.StockTransfer;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Filiallar orasidagi ko'chirish hujjati javobi — StockLevelResponse/GoodsReceiptResponse
 * bilan bir xil "join in a display name" naqshi (bu loyihada @ManyToOne yo'q, plain
 * Long FK ustunlar ishlatiladi).
 */
@Data
@Builder
public class StockTransferResponse {
    private Long id;
    private Long fromBranchId;
    private String fromBranchName;
    private Long toBranchId;
    private String toBranchName;
    private Long productId;
    private String productName;
    private String unit;
    private BigDecimal quantity;
    private String note;
    private Long createdByUserId;
    private LocalDateTime createdAt;

    public static StockTransferResponse from(StockTransfer t, Branch fromBranch, Branch toBranch, Product product) {
        return StockTransferResponse.builder()
                .id(t.getId())
                .fromBranchId(t.getFromBranchId())
                .fromBranchName(fromBranch != null ? fromBranch.getName() : null)
                .toBranchId(t.getToBranchId())
                .toBranchName(toBranch != null ? toBranch.getName() : null)
                .productId(t.getProductId())
                .productName(product != null ? product.getName() : null)
                .unit(product != null ? product.getUnit() : null)
                .quantity(t.getQuantity())
                .note(t.getNote())
                .createdByUserId(t.getCreatedByUserId())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
