package uz.savdo.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.savdo.dto.sale.SaleItemRequest;
import uz.savdo.dto.sale.SaleRequest;
import uz.savdo.entity.CashShift;
import uz.savdo.entity.Customer;
import uz.savdo.entity.CustomerDebtTransaction;
import uz.savdo.entity.Product;
import uz.savdo.entity.Sale;
import uz.savdo.entity.SaleItem;
import uz.savdo.entity.StockLevel;
import uz.savdo.entity.StockMovement;
import uz.savdo.enums.DebtTransactionType;
import uz.savdo.enums.MovementType;
import uz.savdo.enums.PaymentMethod;
import uz.savdo.enums.ShiftStatus;
import uz.savdo.exception.BadRequestException;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.CashShiftRepository;
import uz.savdo.repository.CustomerDebtTransactionRepository;
import uz.savdo.repository.CustomerRepository;
import uz.savdo.repository.ProductRepository;
import uz.savdo.repository.SaleItemRepository;
import uz.savdo.repository.SaleRepository;
import uz.savdo.repository.StockLevelRepository;
import uz.savdo.repository.StockMovementRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Sotuv yaratish — bitta atomik operatsiya sifatida: joriy OCHIQ kassa smenasi topiladi
 * (filial SHUNDAN olinadi, client'dan kelgan qiymatga hech qachon ishonilmaydi — bir
 * kassir faqat o'z ochiq smenasi filialida sota oladi), har bir mahsulot uchun zaxira
 * yetarliligi tekshiriladi, narx (Product#salePrice) snapshot qilinadi, hujjat + qatorlar
 * saqlanadi, so'ng StockLevel kamaytiriladi va StockMovement (SALE, manfiy delta) audit
 * yozuvi qo'shiladi — GoodsReceiptService#applyStockReceipt bilan bir xil naqsh, lekin
 * ortish o'rniga kamayish va oldindan yetarlilik tekshiruvi bilan.
 */
@Service
@RequiredArgsConstructor
public class SaleService {

    private final CashShiftRepository cashShiftRepository;
    private final ProductRepository productRepository;
    private final StockLevelRepository stockLevelRepository;
    private final StockMovementRepository stockMovementRepository;
    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final CustomerRepository customerRepository;
    private final CustomerDebtTransactionRepository customerDebtTransactionRepository;

    @Transactional
    public Sale createSale(SaleRequest request, Long currentUserId) {
        CashShift shift = cashShiftRepository.findByCashierIdAndStatusAndIsDeletedFalse(currentUserId, ShiftStatus.OPEN)
                .orElseThrow(() -> new BadRequestException("Kassa smenasi ochilmagan — avval smenani oching"));

        Long branchId = shift.getBranchId();

        Map<Long, Product> productsById = new LinkedHashMap<>();
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (SaleItemRequest itemRequest : request.getItems()) {
            Product product = productRepository.findByIdAndIsDeletedFalse(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Mahsulot topilmadi: " + itemRequest.getProductId()));
            if (!product.getIsActive()) {
                throw new BadRequestException("Mahsulot faol emas: " + product.getName());
            }

            BigDecimal available = stockLevelRepository.findByProductIdAndBranchIdAndIsDeletedFalse(product.getId(), branchId)
                    .map(StockLevel::getQuantity)
                    .orElse(BigDecimal.ZERO);
            if (available.compareTo(itemRequest.getQuantity()) < 0) {
                throw new BadRequestException("Omborda yetarli mahsulot yo'q: " + product.getName()
                        + " (mavjud: " + available + ", so'ralgan: " + itemRequest.getQuantity() + ")");
            }

            productsById.put(product.getId(), product);
            totalAmount = totalAmount.add(itemRequest.getQuantity().multiply(product.getSalePrice()));
        }

        BigDecimal amountPaid;
        BigDecimal changeAmount;
        BigDecimal cardAmount;
        if (request.getPaymentMethod() == PaymentMethod.CARD) {
            // Client'dan kelgan amountPaid CARD uchun e'tiborga olinmaydi — har doim totalAmount'ga teng.
            amountPaid = totalAmount;
            changeAmount = BigDecimal.ZERO;
            cardAmount = totalAmount;
        } else if (request.getPaymentMethod() == PaymentMethod.MIXED) {
            if (request.getCardAmount() == null
                    || request.getCardAmount().compareTo(BigDecimal.ZERO) <= 0
                    || request.getCardAmount().compareTo(totalAmount) >= 0) {
                throw new BadRequestException(
                        "MIXED to'lovda karta summasi 0 dan katta va umumiy summadan kichik bo'lishi kerak"
                                + " — aks holda CARD yoki CASH usulidan foydalaning");
            }
            cardAmount = request.getCardAmount();
            BigDecimal cashDue = totalAmount.subtract(cardAmount);
            if (request.getAmountPaid() == null || request.getAmountPaid().compareTo(cashDue) < 0) {
                throw new BadRequestException("To'langan naqd summa yetarli emas");
            }
            amountPaid = request.getAmountPaid();
            changeAmount = amountPaid.subtract(cashDue);
        } else if (request.getPaymentMethod() == PaymentMethod.CREDIT) {
            // Nasiya savdo — v1'da qisman oldindan to'lov QO'LLAB-QUVVATLANMAYDI: butun
            // totalAmount mijoz qarziga aylanadi, kassaga hech narsa tushmaydi. Shu
            // sababli CASH/MIXED validatsiyasi bu tarmoqqa umuman qo'llanilmaydi.
            if (request.getCustomerId() == null) {
                throw new BadRequestException("Mijoz tanlanishi shart");
            }
            Customer creditCustomer = customerRepository.findByIdAndIsDeletedFalse(request.getCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Mijoz topilmadi: " + request.getCustomerId()));
            if (!Boolean.TRUE.equals(creditCustomer.getIsActive())) {
                throw new BadRequestException("Mijoz faol emas: " + creditCustomer.getFullName());
            }
            amountPaid = BigDecimal.ZERO;
            changeAmount = BigDecimal.ZERO;
            cardAmount = BigDecimal.ZERO;
        } else {
            if (request.getAmountPaid() == null || request.getAmountPaid().compareTo(totalAmount) < 0) {
                throw new BadRequestException("To'langan summa yetarli emas");
            }
            amountPaid = request.getAmountPaid();
            changeAmount = amountPaid.subtract(totalAmount);
            cardAmount = BigDecimal.ZERO;
        }

        Sale sale = Sale.builder()
                .branchId(branchId)
                .cashShiftId(shift.getId())
                .cashierId(currentUserId)
                .totalAmount(totalAmount)
                .paymentMethod(request.getPaymentMethod())
                .amountPaid(amountPaid)
                .changeAmount(changeAmount)
                .cardAmount(cardAmount)
                .customerId(request.getPaymentMethod() == PaymentMethod.CREDIT ? request.getCustomerId() : null)
                .build();
        sale = saleRepository.save(sale);

        for (SaleItemRequest itemRequest : request.getItems()) {
            Product product = productsById.get(itemRequest.getProductId());
            BigDecimal unitPrice = product.getSalePrice();
            BigDecimal subtotal = itemRequest.getQuantity().multiply(unitPrice);

            SaleItem item = SaleItem.builder()
                    .saleId(sale.getId())
                    .productId(product.getId())
                    .quantity(itemRequest.getQuantity())
                    .unitPrice(unitPrice)
                    .costPriceSnapshot(product.getCostPrice())
                    .subtotal(subtotal)
                    .build();
            saleItemRepository.save(item);

            applyStockSale(product.getId(), branchId, itemRequest.getQuantity(), sale.getId(), currentUserId);
        }

        if (request.getPaymentMethod() == PaymentMethod.CREDIT) {
            // Faqat sotuv va zaxira kamayishi muvaffaqiyatli yakunlangandan SO'NG qarz
            // yozuvi yaratiladi — shu sababli oxirgi qadam sifatida joylashtirilgan.
            CustomerDebtTransaction debtTransaction = CustomerDebtTransaction.builder()
                    .customerId(request.getCustomerId())
                    .branchId(branchId)
                    .type(DebtTransactionType.CREDIT_SALE)
                    .amount(sale.getTotalAmount())
                    .transactionDate(LocalDate.now())
                    .relatedSaleId(sale.getId())
                    .createdByUserId(currentUserId)
                    .build();
            customerDebtTransactionRepository.save(debtTransaction);
        }

        return sale;
    }

    private void applyStockSale(Long productId, Long branchId, BigDecimal quantity,
                                 Long saleId, Long currentUserId) {
        StockLevel stockLevel = stockLevelRepository.findByProductIdAndBranchIdAndIsDeletedFalse(productId, branchId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Zaxira topilmadi: mahsulot=" + productId + ", filial=" + branchId));
        stockLevel.setQuantity(stockLevel.getQuantity().subtract(quantity));
        stockLevelRepository.save(stockLevel);

        StockMovement movement = StockMovement.builder()
                .productId(productId)
                .branchId(branchId)
                .type(MovementType.SALE)
                .quantity(quantity.negate())
                .referenceType("SALE")
                .referenceId(saleId)
                .createdByUserId(currentUserId)
                .build();
        stockMovementRepository.save(movement);
    }
}
