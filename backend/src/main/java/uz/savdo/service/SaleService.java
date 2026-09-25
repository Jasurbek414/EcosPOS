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
import java.math.RoundingMode;
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

    /**
     * Pul summasini 2 kasrga yaxlitlaydi.
     *
     * Miqdor 3 kasrli (kg/litr uchun), narx esa 2 kasrli — ko'paytmada 5 kasr
     * chiqadi. Avval yaxlitlash umuman qilinmas va har bir ustunni Postgres
     * ALOHIDA yaxlitlardi; natijada chek jami o'z satrlari yig'indisidan bir
     * tiyinga farq qilib, smena hisob-kitobini buzishi mumkin edi.
     */
    private static BigDecimal pulgaYaxlitla(BigDecimal qiymat) {
        return qiymat.setScale(2, RoundingMode.HALF_UP);
    }

    @Transactional
    public Sale createSale(SaleRequest request, Long currentUserId) {
        // Qulflangan o'qish — CashShiftService#closeShift bilan bir xil smena ustida
        // bir vaqtda ishlab qolish (poyga holati) oldini oladi: smena aynan shu payt
        // yopilayotgan bo'lsa, bu tranzaksiya yopilish commit bo'lgunicha kutadi va
        // keyin smena allaqachon CLOSED ekanini ko'rib to'g'ri rad javobi qaytaradi.
        CashShift shift = cashShiftRepository.findWithLockByCashierIdAndStatusAndIsDeletedFalse(currentUserId, ShiftStatus.OPEN)
                .orElseThrow(() -> new BadRequestException("Kassa smenasi ochilmagan — avval smenani oching"));

        Long branchId = shift.getBranchId();

        // Bitta mahsulot so'rovda bir nechta qatorda kelishi mumkin (masalan bir xil
        // tovar ikki marta skanerlangan) — miqdorlarni mahsulot bo'yicha JAMLAYMIZ va
        // zaxirani shu jamlangan miqdorga nisbatan (bir marta, qulflangan holda)
        // tekshiramiz/kamaytiramiz. Aks holda har qator zaxirani mustaqil-mustaqil
        // (bir-biridan bexabar) tekshirib, qoldiqni manfiy qilib qo'yishi mumkin edi.
        Map<Long, BigDecimal> totalQuantityByProductId = new LinkedHashMap<>();
        for (SaleItemRequest itemRequest : request.getItems()) {
            totalQuantityByProductId.merge(itemRequest.getProductId(), itemRequest.getQuantity(), BigDecimal::add);
        }

        Map<Long, Product> productsById = new LinkedHashMap<>();
        Map<Long, StockLevel> lockedStockByProductId = new LinkedHashMap<>();
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (Map.Entry<Long, BigDecimal> entry : totalQuantityByProductId.entrySet()) {
            Long productId = entry.getKey();
            BigDecimal requestedQuantity = entry.getValue();

            Product product = productRepository.findByIdAndIsDeletedFalse(productId)
                    .orElseThrow(() -> new ResourceNotFoundException("Mahsulot topilmadi: " + productId));
            if (!product.getIsActive()) {
                throw new BadRequestException("Mahsulot faol emas: " + product.getName());
            }

            // Qatorni tranzaksiya oxirigacha QULFLAYMIZ (PESSIMISTIC_WRITE) — shu
            // mahsulot+filial ustida parallel keladigan boshqa sotuv/ko'chirish
            // so'rovi shu tranzaksiya commit bo'lgunicha kutadi, shu bilan poyga
            // holati (race condition) tufayli qoldiq manfiy bo'lib qolishi oldi olinadi.
            StockLevel stockLevel = stockLevelRepository
                    .findWithLockByProductIdAndBranchIdAndIsDeletedFalse(productId, branchId)
                    .orElse(null);
            BigDecimal availableQty = stockLevel != null ? stockLevel.getQuantity() : BigDecimal.ZERO;
            if (availableQty.compareTo(requestedQuantity) < 0) {
                throw new BadRequestException("Omborda yetarli mahsulot yo'q: " + product.getName()
                        + " (mavjud: " + availableQty + ", so'ralgan: " + requestedQuantity + ")");
            }

            productsById.put(productId, product);
            lockedStockByProductId.put(productId, stockLevel);
            totalAmount = totalAmount.add(pulgaYaxlitla(requestedQuantity.multiply(product.getSalePrice())));
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
            // Nasiya chegarasi. Belgilanmagan bo'lsa (NULL) eski xatti-harakat saqlanadi.
            // Balans CustomerDebtController#balances bilan bir xil formula bo'yicha:
            // SUM(CREDIT_SALE) - SUM(PAYMENT) - SUM(WRITE_OFF).
            if (creditCustomer.getCreditLimit() != null) {
                BigDecimal joriyQarz = customerDebtTransactionRepository
                        .findAllByCustomerIdAndIsDeletedFalse(creditCustomer.getId())
                        .stream()
                        .map(t -> switch (t.getType()) {
                            case CREDIT_SALE -> t.getAmount();
                            case PAYMENT, WRITE_OFF -> t.getAmount().negate();
                        })
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal yangiQarz = joriyQarz.add(totalAmount);
                if (yangiQarz.compareTo(creditCustomer.getCreditLimit()) > 0) {
                    throw new BadRequestException(
                            "Nasiya chegarasidan oshib ketadi. Joriy qarz: " + joriyQarz
                                    + ", chegara: " + creditCustomer.getCreditLimit());
                }
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
            BigDecimal subtotal = pulgaYaxlitla(itemRequest.getQuantity().multiply(unitPrice));

            SaleItem item = SaleItem.builder()
                    .saleId(sale.getId())
                    .productId(product.getId())
                    .quantity(itemRequest.getQuantity())
                    .unitPrice(unitPrice)
                    .costPriceSnapshot(product.getCostPrice())
                    .subtotal(subtotal)
                    .build();
            saleItemRepository.save(item);
        }

        // Zaxirani mahsulot bo'yicha JAMLANGAN miqdorga (bir marta har mahsulot uchun)
        // kamaytiramiz — yuqorida allaqachon qulflab qo'yilgan StockLevel'lardan
        // foydalanamiz, qayta so'rov yubormaymiz (qulf boshqa tranzaksiyani ushbu
        // qatorlardan uzoqda ushlab turmasligi uchun bitta izchil o'qish yetarli).
        for (Map.Entry<Long, BigDecimal> entry : totalQuantityByProductId.entrySet()) {
            Long productId = entry.getKey();
            BigDecimal requestedQuantity = entry.getValue();
            StockLevel stockLevel = lockedStockByProductId.get(productId);
            if (stockLevel == null) {
                // Texnik jihatdan imkonsiz (yuqorida 400 qaytiladi), lekin null-safe himoya.
                throw new BadRequestException("Omborda mahsulot zaxirasi topilmadi: " + productId);
            }
            stockLevel.setQuantity(stockLevel.getQuantity().subtract(requestedQuantity));
            stockLevelRepository.save(stockLevel);

            StockMovement movement = StockMovement.builder()
                    .productId(productId)
                    .branchId(branchId)
                    .type(MovementType.SALE)
                    .quantity(requestedQuantity.negate())
                    .referenceType("SALE")
                    .referenceId(sale.getId())
                    .createdByUserId(currentUserId)
                    .build();
            stockMovementRepository.save(movement);
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
}
