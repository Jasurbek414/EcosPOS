package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.stock.StockTransferRequest;
import uz.savdo.dto.stock.StockTransferResponse;
import uz.savdo.entity.Branch;
import uz.savdo.entity.Product;
import uz.savdo.entity.StockTransfer;
import uz.savdo.entity.User;
import uz.savdo.repository.BranchRepository;
import uz.savdo.repository.ProductRepository;
import uz.savdo.repository.StockTransferRepository;
import uz.savdo.security.CurrentUserService;
import uz.savdo.service.StockTransferService;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Filiallar orasida ombor ko'chirish. Yaratish uchun StockTransferService orqali
 * assertCanTransferStock chaqiriladi (MANAGER uchun kamida bitta tomon o'z filiali
 * bo'lishi kifoya). Ko'rish (tarix/audit) filtri ikkala tomondan (fromBranchId YOKI
 * toBranchId) moslashadi.
 */
@RestController
@RequestMapping("/api/v1/stock/transfers")
@RequiredArgsConstructor
public class StockTransferController {

    private final StockTransferRepository stockTransferRepository;
    private final BranchRepository branchRepository;
    private final ProductRepository productRepository;
    private final CurrentUserService currentUserService;
    private final StockTransferService stockTransferService;

    @PostMapping
    public ResponseEntity<StockTransferResponse> create(@Valid @RequestBody StockTransferRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        StockTransfer transfer = stockTransferService.createTransfer(
                request.getFromBranchId(), request.getToBranchId(), request.getProductId(),
                request.getQuantity(), request.getNote(), currentUser.getId());

        return ResponseEntity.ok(toResponse(transfer));
    }

    @GetMapping
    public List<StockTransferResponse> list(@RequestParam(required = false) Long branchId) {
        List<StockTransfer> transfers;
        if (branchId != null) {
            currentUserService.assertCanAccessBranch(branchId);
            transfers = stockTransferRepository.findAllByIsDeletedFalseOrderByIdDesc().stream()
                    .filter(t -> branchId.equals(t.getFromBranchId()) || branchId.equals(t.getToBranchId()))
                    .toList();
        } else {
            List<Long> allowedBranchIds = currentUserService.allowedBranchIds();
            List<StockTransfer> all = stockTransferRepository.findAllByIsDeletedFalseOrderByIdDesc();
            transfers = allowedBranchIds == null
                    ? all
                    : all.stream()
                            .filter(t -> allowedBranchIds.contains(t.getFromBranchId())
                                    || allowedBranchIds.contains(t.getToBranchId()))
                            .toList();
        }

        Map<Long, Branch> branchesById = loadBranches(transfers);
        Map<Long, Product> productsById = loadProducts(transfers);

        return transfers.stream()
                .sorted(Comparator.comparing(StockTransfer::getId).reversed())
                .map(t -> StockTransferResponse.from(t, branchesById.get(t.getFromBranchId()),
                        branchesById.get(t.getToBranchId()), productsById.get(t.getProductId())))
                .toList();
    }

    private StockTransferResponse toResponse(StockTransfer transfer) {
        Branch fromBranch = branchRepository.findById(transfer.getFromBranchId()).orElse(null);
        Branch toBranch = branchRepository.findById(transfer.getToBranchId()).orElse(null);
        Product product = productRepository.findById(transfer.getProductId()).orElse(null);
        return StockTransferResponse.from(transfer, fromBranch, toBranch, product);
    }

    private Map<Long, Branch> loadBranches(List<StockTransfer> transfers) {
        List<Long> branchIds = transfers.stream()
                .flatMap(t -> java.util.stream.Stream.of(t.getFromBranchId(), t.getToBranchId()))
                .distinct().toList();
        return branchRepository.findAllById(branchIds).stream()
                .collect(Collectors.toMap(Branch::getId, Function.identity()));
    }

    private Map<Long, Product> loadProducts(List<StockTransfer> transfers) {
        List<Long> productIds = transfers.stream().map(StockTransfer::getProductId).distinct().toList();
        return productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));
    }
}
