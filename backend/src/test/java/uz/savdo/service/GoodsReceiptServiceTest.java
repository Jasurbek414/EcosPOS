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
import uz.savdo.dto.goodsreceipt.GoodsReceiptItemRequest;
import uz.savdo.dto.goodsreceipt.GoodsReceiptRequest;
import uz.savdo.entity.Branch;
import uz.savdo.entity.GoodsReceipt;
import uz.savdo.entity.Product;
import uz.savdo.entity.StockLevel;
import uz.savdo.repository.BranchRepository;
import uz.savdo.repository.GoodsReceiptItemRepository;
import uz.savdo.repository.GoodsReceiptRepository;
import uz.savdo.repository.ProductRepository;
import uz.savdo.repository.StockLevelRepository;
import uz.savdo.repository.StockMovementRepository;
import uz.savdo.repository.SupplierRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Ombor kirimi — tannarx hisobi.
 *
 * 2026-09-13 auditigacha kirim mahsulot tannarxiga UMUMAN tegmasdi: tovar yangi
 * narxda kelsa ham foyda eski, qo'lda kiritilgan tannarxdan hisoblanardi.
 * Bu testlar o'rtacha vaznli tannarx formulasini qo'riqlaydi.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class GoodsReceiptServiceTest {

    private static final Long FILIAL_ID = 1L;
    private static final Long MAHSULOT_ID = 100L;
    private static final Long FOYDALANUVCHI_ID = 10L;

    @Mock private BranchRepository branchRepository;
    @Mock private SupplierRepository supplierRepository;
    @Mock private ProductRepository productRepository;
    @Mock private GoodsReceiptRepository goodsReceiptRepository;
    @Mock private GoodsReceiptItemRepository goodsReceiptItemRepository;
    @Mock private StockLevelRepository stockLevelRepository;
    @Mock private StockMovementRepository stockMovementRepository;

    @InjectMocks private GoodsReceiptService service;

    private Product mahsulot;

    @BeforeEach
    void setUp() {
        Branch filial = new Branch();
        filial.setId(FILIAL_ID);
        when(branchRepository.findByIdAndIsDeletedFalse(FILIAL_ID)).thenReturn(Optional.of(filial));

        mahsulot = new Product();
        mahsulot.setId(MAHSULOT_ID);
        mahsulot.setName("Choy");
        mahsulot.setIsActive(true);
        mahsulot.setSalePrice(new BigDecimal("12000.00"));
        when(productRepository.findByIdAndIsDeletedFalse(MAHSULOT_ID)).thenReturn(Optional.of(mahsulot));

        when(goodsReceiptRepository.save(any(GoodsReceipt.class))).thenAnswer(inv -> {
            GoodsReceipt r = inv.getArgument(0);
            r.setId(77L);
            return r;
        });
    }

    private void mavjudQoldiq(String miqdor, String tannarx) {
        if (tannarx != null) {
            mahsulot.setCostPrice(new BigDecimal(tannarx));
        }
        StockLevel level = StockLevel.builder()
                .productId(MAHSULOT_ID)
                .branchId(FILIAL_ID)
                .quantity(new BigDecimal(miqdor))
                .build();
        level.setId(500L);
        when(stockLevelRepository.findWithLockByProductIdAndBranchIdAndIsDeletedFalse(MAHSULOT_ID, FILIAL_ID))
                .thenReturn(Optional.of(level));
    }

    private GoodsReceiptRequest kirim(String miqdor, String kelishNarxi) {
        GoodsReceiptItemRequest item = new GoodsReceiptItemRequest();
        item.setProductId(MAHSULOT_ID);
        item.setQuantity(new BigDecimal(miqdor));
        item.setUnitCost(new BigDecimal(kelishNarxi));

        GoodsReceiptRequest request = new GoodsReceiptRequest();
        request.setBranchId(FILIAL_ID);
        request.setItems(List.of(item));
        return request;
    }

    private BigDecimal saqlanganTannarx() {
        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(productRepository).save(captor.capture());
        return captor.getValue().getCostPrice();
    }

    @Test
    @DisplayName("Qoldiq nol bo'lsa tannarx kelish narxiga tenglashadi")
    void bosOmbordaTannarxKelishNarxi() {
        mavjudQoldiq("0", "5000.00");

        service.createReceipt(kirim("10", "7000.00"), FOYDALANUVCHI_ID);

        assertThat(saqlanganTannarx()).isEqualByComparingTo("7000.00");
    }

    @Test
    @DisplayName("O'rtacha vaznli tannarx to'g'ri hisoblanadi")
    void ortachaVaznliTannarx() {
        // 10 dona * 5000 = 50 000 ; yangi 10 dona * 7000 = 70 000
        // (50 000 + 70 000) / 20 = 6000
        mavjudQoldiq("10", "5000.00");

        service.createReceipt(kirim("10", "7000.00"), FOYDALANUVCHI_ID);

        assertThat(saqlanganTannarx()).isEqualByComparingTo("6000.00");
    }

    @Test
    @DisplayName("Katta mavjud qoldiq tannarxni kam o'zgartiradi")
    void kattaQoldiqTannarxniKamOzgartiradi() {
        // 90 * 5000 = 450 000 ; 10 * 10000 = 100 000 => 550 000 / 100 = 5500
        mavjudQoldiq("90", "5000.00");

        service.createReceipt(kirim("10", "10000.00"), FOYDALANUVCHI_ID);

        assertThat(saqlanganTannarx()).isEqualByComparingTo("5500.00");
    }

    @Test
    @DisplayName("Eski tannarx belgilanmagan bo'lsa kelish narxi olinadi")
    void tannarxsizMahsulot() {
        mavjudQoldiq("5", null); // costPrice = null

        service.createReceipt(kirim("5", "8000.00"), FOYDALANUVCHI_ID);

        assertThat(saqlanganTannarx()).isEqualByComparingTo("8000.00");
    }

    @Test
    @DisplayName("Fraksion miqdorda ham tannarx 2 kasrga yaxlitlanadi")
    void fraksionMiqdorYaxlitlanadi() {
        // 1.5 * 3000 = 4500 ; 2.25 * 4000 = 9000 => 13500 / 3.75 = 3600
        mavjudQoldiq("1.5", "3000.00");

        service.createReceipt(kirim("2.25", "4000.00"), FOYDALANUVCHI_ID);

        BigDecimal natija = saqlanganTannarx();
        assertThat(natija).isEqualByComparingTo("3600.00");
        assertThat(natija.scale()).isEqualTo(2);
    }

    @Test
    @DisplayName("Qoldiq kirim miqdoriga oshadi")
    void qoldiqOshadi() {
        mavjudQoldiq("10", "5000.00");

        service.createReceipt(kirim("4", "5000.00"), FOYDALANUVCHI_ID);

        ArgumentCaptor<StockLevel> captor = ArgumentCaptor.forClass(StockLevel.class);
        verify(stockLevelRepository).save(captor.capture());
        assertThat(captor.getValue().getQuantity()).isEqualByComparingTo("14");
    }
}
