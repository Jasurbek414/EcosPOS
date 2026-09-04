package uz.savdo.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.savdo.entity.Branch;
import uz.savdo.entity.Product;
import uz.savdo.entity.StockLevel;
import uz.savdo.entity.StockMovement;
import uz.savdo.entity.StockTransfer;
import uz.savdo.enums.MovementType;
import uz.savdo.exception.BadRequestException;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.BranchRepository;
import uz.savdo.repository.ProductRepository;
import uz.savdo.repository.StockLevelRepository;
import uz.savdo.repository.StockMovementRepository;
import uz.savdo.repository.StockTransferRepository;
import uz.savdo.security.CurrentUserService;

import java.math.BigDecimal;

/**
 * Filiallar orasida mahsulot ko'chirish — bitta atomik operatsiya sifatida: hujjat
 * saqlanadi, manba filialning StockLevel'i kamaytiriladi + StockMovement (TRANSFER,
 * manfiy) yoziladi, so'ng qabul qiluvchi filialning StockLevel'i oshiriladi (yo'q
 * bo'lsa 0'dan yaratiladi, GoodsReceiptService#applyStockReceipt bilan bir xil upsert
 * naqshi) + ikkinchi StockMovement (TRANSFER, musbat) yoziladi.
 *
 * Ruxsat tekshiruvi CurrentUserService#assertCanTransferStock orqali — MANAGER faqat
 * o'z filialiga tegishli tomon (chiqish YOKI kirish) bo'lgan transferlarni amalga
 * oshira oladi, hech qachon ikkita begona filial orasida emas.
 */
@Service
@RequiredArgsConstructor
public class StockTransferService {

    private final BranchRepository branchRepository;
    private final ProductRepository productRepository;
    private final StockLevelRepository stockLevelRepository;
    private final StockMovementRepository stockMovementRepository;
    private final StockTransferRepository stockTransferRepository;
    private final CurrentUserService currentUserService;

    @Transactional
    public StockTransfer createTransfer(Long fromBranchId, Long toBranchId, Long productId,
                                         BigDecimal quantity, String note, Long currentUserId) {
        if (fromBranchId.equals(toBranchId)) {
            throw new BadRequestException("Bir xil filialga ko'chirib bo'lmaydi");
        }

        // MANAGER faqat o'z filiali ishtirok etgan (chiqish YOKI kirish tomonidan)
        // transferni amalga oshira oladi, lekin ikkita begona filial orasida emas.
        currentUserService.assertCanTransferStock(fromBranchId, toBranchId);

        Branch fromBranch = branchRepository.findByIdAndIsDeletedFalse(fromBranchId)
                .orElseThrow(() -> new ResourceNotFoundException("Filial topilmadi: " + fromBranchId));
        Branch toBranch = branchRepository.findByIdAndIsDeletedFalse(toBranchId)
                .orElseThrow(() -> new ResourceNotFoundException("Filial topilmadi: " + toBranchId));
        Product product = productRepository.findByIdAndIsDeletedFalse(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Mahsulot topilmadi: " + productId));
        if (!product.getIsActive()) {
            throw new BadRequestException("Mahsulot faol emas: " + product.getName());
        }

        StockLevel sourceLevel = stockLevelRepository.findByProductIdAndBranchIdAndIsDeletedFalse(productId, fromBranchId)
                .orElse(null);
        BigDecimal available = sourceLevel != null ? sourceLevel.getQuantity() : BigDecimal.ZERO;
        if (available.compareTo(quantity) < 0) {
            throw new BadRequestException("Omborda yetarli mahsulot yo'q: " + product.getName()
                    + " (mavjud: " + available + ", so'ralgan: " + quantity + ")");
        }

        StockTransfer transfer = StockTransfer.builder()
                .fromBranchId(fromBranchId)
                .toBranchId(toBranchId)
                .productId(productId)
                .quantity(quantity)
                .note(note)
                .createdByUserId(currentUserId)
                .build();
        transfer = stockTransferRepository.save(transfer);

        // Manba filial: kamaytirish + manfiy StockMovement.
        sourceLevel.setQuantity(sourceLevel.getQuantity().subtract(quantity));
        stockLevelRepository.save(sourceLevel);

        StockMovement outMovement = StockMovement.builder()
                .productId(productId)
                .branchId(fromBranchId)
                .type(MovementType.TRANSFER)
                .quantity(quantity.negate())
                .referenceType("STOCK_TRANSFER")
                .referenceId(transfer.getId())
                .note("Ko'chirildi: " + toBranch.getName() + (note != null ? " — " + note : ""))
                .createdByUserId(currentUserId)
                .build();
        stockMovementRepository.save(outMovement);

        // Qabul qiluvchi filial: upsert (yo'q bo'lsa 0'dan yaratiladi) + musbat StockMovement.
        StockLevel destLevel = stockLevelRepository.findByProductIdAndBranchIdAndIsDeletedFalse(productId, toBranchId)
                .orElseGet(() -> StockLevel.builder()
                        .productId(productId)
                        .branchId(toBranchId)
                        .quantity(BigDecimal.ZERO)
                        .build());
        destLevel.setQuantity(destLevel.getQuantity().add(quantity));
        stockLevelRepository.save(destLevel);

        StockMovement inMovement = StockMovement.builder()
                .productId(productId)
                .branchId(toBranchId)
                .type(MovementType.TRANSFER)
                .quantity(quantity)
                .referenceType("STOCK_TRANSFER")
                .referenceId(transfer.getId())
                .note("Qabul qilindi: " + fromBranch.getName() + (note != null ? " — " + note : ""))
                .createdByUserId(currentUserId)
                .build();
        stockMovementRepository.save(inMovement);

        return transfer;
    }
}
