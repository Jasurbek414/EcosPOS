package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.sale.SaleItemResponse;
import uz.savdo.dto.sale.SaleRequest;
import uz.savdo.dto.sale.SaleResponse;
import uz.savdo.dto.sale.SaleSummaryResponse;
import uz.savdo.entity.Product;
import uz.savdo.entity.Sale;
import uz.savdo.entity.SaleItem;
import uz.savdo.entity.User;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.ProductRepository;
import uz.savdo.repository.SaleItemRepository;
import uz.savdo.repository.SaleRepository;
import uz.savdo.repository.UserRepository;
import uz.savdo.security.CurrentUserService;
import uz.savdo.service.SaleService;

import java.time.LocalDate;
import java.util.List;

/**
 * Sotuvlar. Yaratish — barcha uch rol uchun ham ruxsat etilgan: filial client'dan emas,
 * kassirning joriy ochiq kassa smenasidan olinadi (qarang: SaleService), shu sababli
 * bu yerda alohida assertCanAccessBranch/assertCanWriteInventory chaqirilmaydi. Ko'rish —
 * GoodsReceiptController bilan bir xil filial-scoping naqshi (OWNER: barchasi/aniq
 * filial, MANAGER/CASHIER: faqat o'z filiali).
 */
@RestController
@RequestMapping("/api/v1/sales")
@RequiredArgsConstructor
public class SaleController {

    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final SaleService saleService;

    @GetMapping
    public List<SaleSummaryResponse> list(@RequestParam(required = false) Long branchId,
                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        List<Sale> sales;
        if (branchId != null) {
            currentUserService.assertCanAccessBranch(branchId);
            sales = saleRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdDesc(branchId);
        } else {
            List<Long> allowedBranchIds = currentUserService.allowedBranchIds();
            sales = allowedBranchIds == null
                    ? saleRepository.findAllByIsDeletedFalseOrderByIdDesc()
                    : allowedBranchIds.stream()
                            .flatMap(id -> saleRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdDesc(id).stream())
                            .toList();
        }

        return sales.stream()
                .filter(s -> from == null || !s.getCreatedAt().toLocalDate().isBefore(from))
                .filter(s -> to == null || !s.getCreatedAt().toLocalDate().isAfter(to))
                .map(s -> SaleSummaryResponse.from(s, resolveCashierName(s.getCashierId()), countItems(s.getId())))
                .toList();
    }

    @GetMapping("/{id}")
    public SaleResponse get(@PathVariable Long id) {
        Sale sale = saleRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sotuv topilmadi: " + id));
        currentUserService.assertCanAccessBranch(sale.getBranchId());

        return SaleResponse.from(sale, resolveCashierName(sale.getCashierId()), loadItemResponses(id));
    }

    @PostMapping
    public ResponseEntity<SaleResponse> create(@Valid @RequestBody SaleRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        Sale sale = saleService.createSale(request, currentUser.getId());

        return ResponseEntity.ok(SaleResponse.from(sale, currentUser.getFullName(), loadItemResponses(sale.getId())));
    }

    private List<SaleItemResponse> loadItemResponses(Long saleId) {
        List<SaleItem> items = saleItemRepository.findAllBySaleIdAndIsDeletedFalseOrderByIdAsc(saleId);
        return items.stream()
                .map(item -> {
                    Product product = productRepository.findById(item.getProductId())
                            .orElseThrow(() -> new ResourceNotFoundException("Mahsulot topilmadi: " + item.getProductId()));
                    return SaleItemResponse.from(item, product);
                })
                .toList();
    }

    private String resolveCashierName(Long cashierId) {
        return userRepository.findById(cashierId).map(User::getFullName).orElse(null);
    }

    private int countItems(Long saleId) {
        return saleItemRepository.findAllBySaleIdAndIsDeletedFalseOrderByIdAsc(saleId).size();
    }
}
