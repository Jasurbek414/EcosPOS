package uz.savdo.dto.goodsreceipt;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.GoodsReceipt;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** To'liq javob — bitta hujjatning items ro'yxati bilan (GET /goods-receipts/{id}). */
@Data
@Builder
public class GoodsReceiptResponse {
    private Long id;
    private Long branchId;
    private Long supplierId;
    private String supplierName;
    private LocalDate receiptDate;
    private String note;
    private BigDecimal totalAmount;
    private Long createdByUserId;
    private LocalDateTime createdAt;
    private List<GoodsReceiptItemResponse> items;

    public static GoodsReceiptResponse from(GoodsReceipt r, String supplierName, List<GoodsReceiptItemResponse> items) {
        return GoodsReceiptResponse.builder()
                .id(r.getId())
                .branchId(r.getBranchId())
                .supplierId(r.getSupplierId())
                .supplierName(supplierName)
                .receiptDate(r.getReceiptDate())
                .note(r.getNote())
                .totalAmount(r.getTotalAmount())
                .createdByUserId(r.getCreatedByUserId())
                .createdAt(r.getCreatedAt())
                .items(items)
                .build();
    }
}
