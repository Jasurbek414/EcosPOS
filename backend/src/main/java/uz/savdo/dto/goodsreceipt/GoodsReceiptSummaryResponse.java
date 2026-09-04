package uz.savdo.dto.goodsreceipt;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.GoodsReceipt;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Ro'yxat javobi (GET /goods-receipts) — item detallarsiz, faqat qisqacha ma'lumot. */
@Data
@Builder
public class GoodsReceiptSummaryResponse {
    private Long id;
    private Long branchId;
    private Long supplierId;
    private String supplierName;
    private LocalDate receiptDate;
    private BigDecimal totalAmount;
    private int itemCount;

    public static GoodsReceiptSummaryResponse from(GoodsReceipt r, String supplierName, int itemCount) {
        return GoodsReceiptSummaryResponse.builder()
                .id(r.getId())
                .branchId(r.getBranchId())
                .supplierId(r.getSupplierId())
                .supplierName(supplierName)
                .receiptDate(r.getReceiptDate())
                .totalAmount(r.getTotalAmount())
                .itemCount(itemCount)
                .build();
    }
}
