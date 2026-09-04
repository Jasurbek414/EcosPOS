package uz.savdo.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.savdo.dto.goodsreceipt.GoodsReceiptItemRequest;
import uz.savdo.dto.goodsreceipt.GoodsReceiptRequest;
import uz.savdo.entity.*;
import uz.savdo.enums.MovementType;
import uz.savdo.exception.BadRequestException;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Ombor kirim hujjatini yaratish — bitta atomik operatsiya sifatida: hujjat + qatorlar
 * saqlanadi, har bir mahsulot uchun StockLevel oshiriladi (yo'q bo'lsa 0'dan yaratiladi)
 * va StockMovement (RECEIPT) audit yozuvi qo'shiladi.
 */
@Service
@RequiredArgsConstructor
public class GoodsReceiptService {

    private final BranchRepository branchRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final GoodsReceiptRepository goodsReceiptRepository;
    private final GoodsReceiptItemRepository goodsReceiptItemRepository;
    private final StockLevelRepository stockLevelRepository;
    private final StockMovementRepository stockMovementRepository;

    @Transactional
    public GoodsReceipt createReceipt(GoodsReceiptRequest request, Long currentUserId) {
        Branch branch = branchRepository.findByIdAndIsDeletedFalse(request.getBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Filial topilmadi: " + request.getBranchId()));

        if (request.getSupplierId() != null) {
            supplierRepository.findByIdAndIsDeletedFalse(request.getSupplierId())
                    .orElseThrow(() -> new ResourceNotFoundException("Yetkazib beruvchi topilmadi: " + request.getSupplierId()));
        }

        BigDecimal totalAmount = BigDecimal.ZERO;
        for (GoodsReceiptItemRequest itemRequest : request.getItems()) {
            Product product = productRepository.findByIdAndIsDeletedFalse(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Mahsulot topilmadi: " + itemRequest.getProductId()));
            if (!product.getIsActive()) {
                throw new BadRequestException("Mahsulot faol emas: " + product.getName());
            }
            totalAmount = totalAmount.add(itemRequest.getQuantity().multiply(itemRequest.getUnitCost()));
        }

        GoodsReceipt receipt = GoodsReceipt.builder()
                .branchId(branch.getId())
                .supplierId(request.getSupplierId())
                .receiptDate(request.getReceiptDate() != null ? request.getReceiptDate() : LocalDate.now())
                .note(request.getNote())
                .totalAmount(totalAmount)
                .createdByUserId(currentUserId)
                .build();
        receipt = goodsReceiptRepository.save(receipt);

        for (GoodsReceiptItemRequest itemRequest : request.getItems()) {
            BigDecimal subtotal = itemRequest.getQuantity().multiply(itemRequest.getUnitCost());

            GoodsReceiptItem item = GoodsReceiptItem.builder()
                    .goodsReceiptId(receipt.getId())
                    .productId(itemRequest.getProductId())
                    .quantity(itemRequest.getQuantity())
                    .unitCost(itemRequest.getUnitCost())
                    .subtotal(subtotal)
                    .build();
            goodsReceiptItemRepository.save(item);

            applyStockReceipt(itemRequest.getProductId(), branch.getId(), itemRequest.getQuantity(),
                    receipt.getId(), currentUserId);
        }

        return receipt;
    }

    private void applyStockReceipt(Long productId, Long branchId, BigDecimal quantity,
                                    Long receiptId, Long currentUserId) {
        StockLevel stockLevel = stockLevelRepository.findByProductIdAndBranchIdAndIsDeletedFalse(productId, branchId)
                .orElseGet(() -> StockLevel.builder()
                        .productId(productId)
                        .branchId(branchId)
                        .quantity(BigDecimal.ZERO)
                        .build());
        stockLevel.setQuantity(stockLevel.getQuantity().add(quantity));
        stockLevelRepository.save(stockLevel);

        StockMovement movement = StockMovement.builder()
                .productId(productId)
                .branchId(branchId)
                .type(MovementType.RECEIPT)
                .quantity(quantity)
                .referenceType("GOODS_RECEIPT")
                .referenceId(receiptId)
                .createdByUserId(currentUserId)
                .build();
        stockMovementRepository.save(movement);
    }
}
