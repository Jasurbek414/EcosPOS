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
import java.math.RoundingMode;
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
                    itemRequest.getUnitCost(), receipt.getId(), currentUserId);
        }

        return receipt;
    }

    private void applyStockReceipt(Long productId, Long branchId, BigDecimal quantity,
                                    BigDecimal unitCost, Long receiptId, Long currentUserId) {
        StockLevel stockLevel = stockLevelRepository.findWithLockByProductIdAndBranchIdAndIsDeletedFalse(productId, branchId)
                .orElseGet(() -> StockLevel.builder()
                        .productId(productId)
                        .branchId(branchId)
                        .quantity(BigDecimal.ZERO)
                        .build());
        BigDecimal oldingiQoldiq = stockLevel.getQuantity();
        stockLevel.setQuantity(oldingiQoldiq.add(quantity));
        stockLevelRepository.save(stockLevel);

        tannarxniYangila(productId, oldingiQoldiq, quantity, unitCost);

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

    /**
     * O'rtacha vaznli tannarx (weighted average cost).
     *
     * Avval kirim mahsulotning tannarxiga UMUMAN tegmasdi: tovar yangi narxda
     * kelsa ham foyda qo'lda kiritilgan eski tannarxdan hisoblanardi va barcha
     * marja ko'rsatkichlari ishonchsiz bo'lib qolardi (SaleService savdo paytida
     * aynan shu costPrice'ni snapshot qiladi).
     *
     * Formula: (eski_qoldiq * eski_tannarx + kelgan_miqdor * kelish_narxi)
     *          / (eski_qoldiq + kelgan_miqdor)
     *
     * Qoldiq nol yoki manfiy bo'lsa (yoki eski tannarx belgilanmagan bo'lsa)
     * o'rtachani hisoblashning ma'nosi yo'q — kelish narxi to'g'ridan-to'g'ri
     * yangi tannarx bo'ladi. Fraksion birliklar (kg/litr) uchun oraliq bo'linish
     * 6 kasrda olib borilib, natija 2 kasrga yaxlitlanadi.
     */
    private void tannarxniYangila(Long productId, BigDecimal oldingiQoldiq,
                                   BigDecimal kelganMiqdor, BigDecimal kelishNarxi) {
        if (kelishNarxi == null || kelganMiqdor == null || kelganMiqdor.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        Product product = productRepository.findByIdAndIsDeletedFalse(productId).orElse(null);
        if (product == null) return;

        BigDecimal eskiTannarx = product.getCostPrice();
        BigDecimal yangiTannarx;

        // Tannarx NOL bo'lishi ham "belgilanmagan" degani: mahsulot qo'lda tannarxsiz
        // yaratilgan bo'lsa, nolni o'rtachaga qo'shish yangi tannarxni sun'iy ravishda
        // ikki barobar pasaytirib yuborardi (buni GoodsReceiptServiceTest ushlagan).
        boolean tannarxYoq = eskiTannarx == null || eskiTannarx.compareTo(BigDecimal.ZERO) <= 0;
        boolean qoldiqYoq = oldingiQoldiq == null || oldingiQoldiq.compareTo(BigDecimal.ZERO) <= 0;

        if (tannarxYoq || qoldiqYoq) {
            yangiTannarx = kelishNarxi;
        } else {
            BigDecimal eskiQiymat = oldingiQoldiq.multiply(eskiTannarx);
            BigDecimal yangiQiymat = kelganMiqdor.multiply(kelishNarxi);
            BigDecimal jamiMiqdor = oldingiQoldiq.add(kelganMiqdor);
            yangiTannarx = eskiQiymat.add(yangiQiymat)
                    .divide(jamiMiqdor, 6, RoundingMode.HALF_UP);
        }

        product.setCostPrice(yangiTannarx.setScale(2, RoundingMode.HALF_UP));
        productRepository.save(product);
    }
}
