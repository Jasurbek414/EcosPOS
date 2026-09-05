package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.goodsreceipt.GoodsReceiptItemResponse;
import uz.savdo.dto.goodsreceipt.GoodsReceiptRequest;
import uz.savdo.dto.goodsreceipt.GoodsReceiptResponse;
import uz.savdo.dto.goodsreceipt.GoodsReceiptSummaryResponse;
import uz.savdo.entity.GoodsReceipt;
import uz.savdo.entity.GoodsReceiptItem;
import uz.savdo.entity.Product;
import uz.savdo.entity.Supplier;
import uz.savdo.entity.User;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.GoodsReceiptItemRepository;
import uz.savdo.repository.GoodsReceiptRepository;
import uz.savdo.repository.ProductRepository;
import uz.savdo.repository.SupplierRepository;
import uz.savdo.security.CurrentUserService;
import uz.savdo.service.GoodsReceiptService;

import java.util.List;

/**
 * Ombor kirim hujjatlari. Ko'rish uchun assertCanAccessBranch (filial bo'yicha), yaratish
 * uchun assertCanWriteInventory (OWNER hamma filial, MANAGER faqat o'zi, CASHIER hech qachon).
 */
@RestController
@RequestMapping("/api/v1/goods-receipts")
@RequiredArgsConstructor
public class GoodsReceiptController {

    private final GoodsReceiptRepository goodsReceiptRepository;
    private final GoodsReceiptItemRepository goodsReceiptItemRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final CurrentUserService currentUserService;
    private final GoodsReceiptService goodsReceiptService;

    @GetMapping
    public List<GoodsReceiptSummaryResponse> list(@RequestParam(required = false) Long branchId,
                                                   @RequestParam(required = false) Long supplierId) {
        List<GoodsReceipt> receipts;
        if (branchId != null) {
            currentUserService.assertCanAccessBranch(branchId);
            receipts = goodsReceiptRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdDesc(branchId);
        } else {
            List<Long> allowedBranchIds = currentUserService.allowedBranchIds();
            receipts = allowedBranchIds == null
                    ? goodsReceiptRepository.findAllByIsDeletedFalseOrderByIdDesc()
                    : allowedBranchIds.stream()
                            .flatMap(id -> goodsReceiptRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdDesc(id).stream())
                            .toList();
        }

        if (supplierId != null) {
            receipts = receipts.stream()
                    .filter(r -> supplierId.equals(r.getSupplierId()))
                    .toList();
        }

        return receipts.stream()
                .map(r -> GoodsReceiptSummaryResponse.from(r, resolveSupplierName(r.getSupplierId()), countItems(r.getId())))
                .toList();
    }

    @GetMapping("/{id}")
    public GoodsReceiptResponse get(@PathVariable Long id) {
        GoodsReceipt receipt = goodsReceiptRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kirim hujjati topilmadi: " + id));
        currentUserService.assertCanAccessBranch(receipt.getBranchId());

        List<GoodsReceiptItem> items = goodsReceiptItemRepository.findAllByGoodsReceiptIdAndIsDeletedFalseOrderByIdAsc(id);
        List<GoodsReceiptItemResponse> itemResponses = items.stream()
                .map(item -> {
                    Product product = productRepository.findById(item.getProductId())
                            .orElseThrow(() -> new ResourceNotFoundException("Mahsulot topilmadi: " + item.getProductId()));
                    return GoodsReceiptItemResponse.from(item, product);
                })
                .toList();

        return GoodsReceiptResponse.from(receipt, resolveSupplierName(receipt.getSupplierId()), itemResponses);
    }

    @PostMapping
    public ResponseEntity<GoodsReceiptResponse> create(@Valid @RequestBody GoodsReceiptRequest request) {
        currentUserService.assertCanWriteInventory(request.getBranchId());

        User currentUser = currentUserService.getCurrentUser();
        GoodsReceipt receipt = goodsReceiptService.createReceipt(request, currentUser.getId());

        List<GoodsReceiptItem> items = goodsReceiptItemRepository.findAllByGoodsReceiptIdAndIsDeletedFalseOrderByIdAsc(receipt.getId());
        List<GoodsReceiptItemResponse> itemResponses = items.stream()
                .map(item -> {
                    Product product = productRepository.findById(item.getProductId())
                            .orElseThrow(() -> new ResourceNotFoundException("Mahsulot topilmadi: " + item.getProductId()));
                    return GoodsReceiptItemResponse.from(item, product);
                })
                .toList();

        return ResponseEntity.ok(GoodsReceiptResponse.from(receipt, resolveSupplierName(receipt.getSupplierId()), itemResponses));
    }

    private String resolveSupplierName(Long supplierId) {
        if (supplierId == null) {
            return null;
        }
        return supplierRepository.findById(supplierId).map(Supplier::getName).orElse(null);
    }

    private int countItems(Long goodsReceiptId) {
        return goodsReceiptItemRepository.findAllByGoodsReceiptIdAndIsDeletedFalseOrderByIdAsc(goodsReceiptId).size();
    }
}
