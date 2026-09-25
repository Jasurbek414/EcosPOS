package uz.savdo.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import uz.savdo.dto.sale.SaleItemRequest;
import uz.savdo.dto.sale.SaleRequest;
import uz.savdo.entity.CashShift;
import uz.savdo.entity.Customer;
import uz.savdo.entity.CustomerDebtTransaction;
import uz.savdo.entity.Product;
import uz.savdo.entity.Sale;
import uz.savdo.entity.StockLevel;
import uz.savdo.enums.DebtTransactionType;
import uz.savdo.enums.PaymentMethod;
import uz.savdo.enums.ShiftStatus;
import uz.savdo.exception.BadRequestException;
import uz.savdo.repository.CashShiftRepository;
import uz.savdo.repository.CustomerDebtTransactionRepository;
import uz.savdo.repository.CustomerRepository;
import uz.savdo.repository.ProductRepository;
import uz.savdo.repository.SaleItemRepository;
import uz.savdo.repository.SaleRepository;
import uz.savdo.repository.StockLevelRepository;
import uz.savdo.repository.StockMovementRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Savdo yaratish — tizimdagi eng muhim pul yo'li.
 *
 * Testlar 2026-09-13 auditida qo'shilgan nasiya chegarasini va allaqachon
 * mavjud bo'lgan zaxira tekshiruvini qamrab oladi.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SaleServiceTest {

    private static final Long KASSIR_ID = 10L;
    private static final Long FILIAL_ID = 1L;
    private static final Long MAHSULOT_ID = 100L;
    private static final Long MIJOZ_ID = 50L;

    @Mock private CashShiftRepository cashShiftRepository;
    @Mock private ProductRepository productRepository;
    @Mock private StockLevelRepository stockLevelRepository;
    @Mock private StockMovementRepository stockMovementRepository;
    @Mock private SaleRepository saleRepository;
    @Mock private SaleItemRepository saleItemRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private CustomerDebtTransactionRepository customerDebtTransactionRepository;

    @InjectMocks private SaleService service;

    @BeforeEach
    void setUp() {
        CashShift smena = CashShift.builder()
                .branchId(FILIAL_ID)
                .cashierId(KASSIR_ID)
                .openingCash(BigDecimal.ZERO)
                .status(ShiftStatus.OPEN)
                .build();
        smena.setId(7L);
        when(cashShiftRepository.findWithLockByCashierIdAndStatusAndIsDeletedFalse(KASSIR_ID, ShiftStatus.OPEN))
                .thenReturn(Optional.of(smena));

        Product mahsulot = new Product();
        mahsulot.setId(MAHSULOT_ID);
        mahsulot.setName("Choy");
        mahsulot.setIsActive(true);
        mahsulot.setSalePrice(new BigDecimal("10000.00"));
        mahsulot.setCostPrice(new BigDecimal("7000.00"));
        when(productRepository.findByIdAndIsDeletedFalse(MAHSULOT_ID)).thenReturn(Optional.of(mahsulot));

        when(saleRepository.save(any(Sale.class))).thenAnswer(inv -> {
            Sale s = inv.getArgument(0);
            s.setId(999L);
            return s;
        });
    }

    private void qoldiqBelgila(String miqdor) {
        StockLevel level = StockLevel.builder()
                .productId(MAHSULOT_ID)
                .branchId(FILIAL_ID)
                .quantity(new BigDecimal(miqdor))
                .build();
        level.setId(500L);
        when(stockLevelRepository.findWithLockByProductIdAndBranchIdAndIsDeletedFalse(MAHSULOT_ID, FILIAL_ID))
                .thenReturn(Optional.of(level));
    }

    private SaleRequest sorov(PaymentMethod usul, String miqdor) {
        SaleItemRequest item = new SaleItemRequest();
        item.setProductId(MAHSULOT_ID);
        item.setQuantity(new BigDecimal(miqdor));

        SaleRequest request = new SaleRequest();
        request.setItems(List.of(item));
        request.setPaymentMethod(usul);
        return request;
    }

    private void mijoz(String chegara) {
        Customer c = new Customer();
        c.setId(MIJOZ_ID);
        c.setFullName("Test mijoz");
        c.setIsActive(true);
        if (chegara != null) {
            c.setCreditLimit(new BigDecimal(chegara));
        }
        when(customerRepository.findByIdAndIsDeletedFalse(MIJOZ_ID)).thenReturn(Optional.of(c));
    }

    private void joriyQarz(String summa) {
        CustomerDebtTransaction tx = CustomerDebtTransaction.builder()
                .customerId(MIJOZ_ID)
                .type(DebtTransactionType.CREDIT_SALE)
                .amount(new BigDecimal(summa))
                .build();
        when(customerDebtTransactionRepository.findAllByCustomerIdAndIsDeletedFalse(MIJOZ_ID))
                .thenReturn(List.of(tx));
    }

    @Test
    @DisplayName("Smena ochilmagan bo'lsa savdo yaratilmaydi")
    void smenasizSavdoYaratilmaydi() {
        when(cashShiftRepository.findWithLockByCashierIdAndStatusAndIsDeletedFalse(KASSIR_ID, ShiftStatus.OPEN))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createSale(sorov(PaymentMethod.CASH, "1"), KASSIR_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("smenasi ochilmagan");
    }

    @Test
    @DisplayName("Omborda yetarli mahsulot bo'lmasa savdo rad etiladi")
    void yetarsizQoldiqdaRadEtiladi() {
        qoldiqBelgila("2");
        SaleRequest r = sorov(PaymentMethod.CASH, "5");
        r.setAmountPaid(new BigDecimal("50000"));

        assertThatThrownBy(() -> service.createSale(r, KASSIR_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("yetarli mahsulot yo'q");

        verify(saleRepository, never()).save(any());
    }

    @Test
    @DisplayName("Naqd savdo qoldiqni kamaytiradi")
    void naqdSavdoQoldiqniKamaytiradi() {
        qoldiqBelgila("10");
        SaleRequest r = sorov(PaymentMethod.CASH, "3");
        r.setAmountPaid(new BigDecimal("30000"));

        service.createSale(r, KASSIR_ID);

        ArgumentCaptor<StockLevel> captor = ArgumentCaptor.forClass(StockLevel.class);
        verify(stockLevelRepository).save(captor.capture());
        assertThat(captor.getValue().getQuantity()).isEqualByComparingTo("7");
    }

    @Test
    @DisplayName("To'langan summa yetmasa naqd savdo rad etiladi")
    void kamTolovdaRadEtiladi() {
        qoldiqBelgila("10");
        SaleRequest r = sorov(PaymentMethod.CASH, "3"); // jami 30 000
        r.setAmountPaid(new BigDecimal("20000"));

        assertThatThrownBy(() -> service.createSale(r, KASSIR_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("yetarli emas");
    }

    @Test
    @DisplayName("Nasiya chegarasidan oshsa savdo rad etiladi")
    void nasiyaChegarasidanOshsaRadEtiladi() {
        qoldiqBelgila("10");
        mijoz("100000");    // chegara 100 000
        joriyQarz("95000"); // allaqachon 95 000 qarzi bor

        SaleRequest r = sorov(PaymentMethod.CREDIT, "1"); // yana 10 000 => 105 000
        r.setCustomerId(MIJOZ_ID);

        assertThatThrownBy(() -> service.createSale(r, KASSIR_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("chegarasidan oshib");

        verify(saleRepository, never()).save(any());
    }

    @Test
    @DisplayName("Nasiya chegarasi ichida bo'lsa savdo o'tadi va qarz yoziladi")
    void chegaraIchidaNasiyaOtadi() {
        qoldiqBelgila("10");
        mijoz("100000");
        joriyQarz("50000");

        SaleRequest r = sorov(PaymentMethod.CREDIT, "1"); // 10 000 => jami 60 000
        r.setCustomerId(MIJOZ_ID);

        service.createSale(r, KASSIR_ID);

        ArgumentCaptor<CustomerDebtTransaction> captor =
                ArgumentCaptor.forClass(CustomerDebtTransaction.class);
        verify(customerDebtTransactionRepository).save(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(DebtTransactionType.CREDIT_SALE);
        assertThat(captor.getValue().getAmount()).isEqualByComparingTo("10000.00");
    }

    @Test
    @DisplayName("Chegara belgilanmagan mijozga nasiya cheklanmaydi")
    void chegarasizMijozgaNasiyaOtadi() {
        qoldiqBelgila("10");
        mijoz(null);        // chegara yo'q
        joriyQarz("9999999");

        SaleRequest r = sorov(PaymentMethod.CREDIT, "1");
        r.setCustomerId(MIJOZ_ID);

        service.createSale(r, KASSIR_ID);

        verify(saleRepository).save(any(Sale.class));
    }

    @Test
    @DisplayName("Nasiya savdoda mijoz tanlanmasa rad etiladi")
    void nasiyadaMijozShart() {
        qoldiqBelgila("10");
        SaleRequest r = sorov(PaymentMethod.CREDIT, "1");

        assertThatThrownBy(() -> service.createSale(r, KASSIR_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Mijoz tanlanishi shart");
    }
}
