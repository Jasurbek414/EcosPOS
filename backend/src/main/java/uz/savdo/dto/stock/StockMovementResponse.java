package uz.savdo.dto.stock;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.Branch;
import uz.savdo.entity.Product;
import uz.savdo.entity.StockMovement;
import uz.savdo.enums.MovementType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Bitta ombor harakati audit yozuvi — frontend N+1 chaqiruv qilmasligi uchun
 * mahsulot/filial/foydalanuvchi nomlari shu javobga qo'shib beriladi
 * (StockLevelResponse bilan bir xil "join in a display name" naqshi).
 */
@Data
@Builder
public class StockMovementResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String unit;
    private Long branchId;
    private String branchName;
    private MovementType type;
    private BigDecimal quantity;
    private String referenceType;
    private Long referenceId;
    private String note;
    private Long createdByUserId;
    private String createdByUserName;
    private LocalDateTime createdAt;

    public static StockMovementResponse from(StockMovement m, Product product, Branch branch, String createdByUserName) {
        return StockMovementResponse.builder()
                .id(m.getId())
                .productId(m.getProductId())
                .productName(product != null ? product.getName() : null)
                .unit(product != null ? product.getUnit() : null)
                .branchId(m.getBranchId())
                .branchName(branch != null ? branch.getName() : null)
                .type(m.getType())
                .quantity(m.getQuantity())
                .referenceType(m.getReferenceType())
                .referenceId(m.getReferenceId())
                .note(m.getNote())
                .createdByUserId(m.getCreatedByUserId())
                .createdByUserName(createdByUserName)
                .createdAt(m.getCreatedAt())
                .build();
    }
}
