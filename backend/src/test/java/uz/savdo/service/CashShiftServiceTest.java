package uz.savdo.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.DataIntegrityViolationException;
import uz.savdo.entity.Branch;
import uz.savdo.entity.CashShift;
import uz.savdo.entity.User;
import uz.savdo.enums.PaymentMethod;
import uz.savdo.enums.ShiftStatus;
import uz.savdo.enums.UserRole;
import uz.savdo.exception.BadRequestException;
import uz.savdo.exception.ForbiddenException;
import uz.savdo.repository.BranchRepository;
import uz.savdo.repository.CashShiftRepository;
import uz.savdo.repository.SaleRepository;
import uz.savdo.security.CurrentUserService;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Kassa smenasi — pul hisob-kitobining eng muhim qismi.
 *
 * Bu testlar 2026-09-13 auditida topilgan ikkita kritik nuqsonni qamrab oladi:
 * kassir hamkasbining smenasini yopa olishi va ikki marta bosilganda ikkita
 * ochiq smena yaratilishi.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CashShiftServiceTest {

    private static final Long KASSIR_ID = 10L;
    private static final Long BOSHQA_KASSIR_ID = 20L;
    private static final Long FILIAL_ID = 1L;

    @Mock private BranchRepository branchRepository;
    @Mock private CashShiftRepository cashShiftRepository;
    @Mock private SaleRepository saleRepository;
    @Mock private CurrentUserService currentUserService;

    @InjectMocks private CashShiftService service;

    @BeforeEach
    void setUp() {
        Branch filial = new Branch();
        filial.setId(FILIAL_ID);
        when(branchRepository.findByIdAndIsDeletedFalse(FILIAL_ID)).thenReturn(Optional.of(filial));
        when(saleRepository.sumTotalAmountByCashShiftIdAndPaymentMethod(anyLong(), any(PaymentMethod.class)))
                .thenReturn(BigDecimal.ZERO);
        when(saleRepository.sumCashPortionByCashShiftIdForMixed(anyLong())).thenReturn(BigDecimal.ZERO);
    }

    private CashShift ochiqSmena(Long id, Long kassirId) {
        CashShift shift = CashShift.builder()
                .branchId(FILIAL_ID)
                .cashierId(kassirId)
                .openingCash(new BigDecimal("100000.00"))
                .status(ShiftStatus.OPEN)
                .build();
        shift.setId(id);
        return shift;
    }

    private void joriyFoydalanuvchiRoli(UserRole rol) {
        User user = new User();
        user.setId(KASSIR_ID);
        user.setRole(rol);
        when(currentUserService.getCurrentUser()).thenReturn(user);
    }

    @Test
    @DisplayName("Ochiq smenasi bor kassir ikkinchisini ocha olmaydi")
    void ochiqSmenaBorligidaYangisiOchilmaydi() {
        when(cashShiftRepository.findByCashierIdAndStatusAndIsDeletedFalse(KASSIR_ID, ShiftStatus.OPEN))
                .thenReturn(Optional.of(ochiqSmena(5L, KASSIR_ID)));

        assertThatThrownBy(() -> service.openShift(FILIAL_ID, new BigDecimal("50000"), KASSIR_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("allaqachon ochiq");

        verify(cashShiftRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Poyga holatida baza cheklovi tushunarli xabarga aylanadi (500 emas)")
    void bazaChekloviTushunarliXabargaAylantiriladi() {
        when(cashShiftRepository.findByCashierIdAndStatusAndIsDeletedFalse(KASSIR_ID, ShiftStatus.OPEN))
                .thenReturn(Optional.empty());
        when(cashShiftRepository.saveAndFlush(any(CashShift.class)))
                .thenThrow(new DataIntegrityViolationException("uq_cash_shifts_one_open_per_cashier"));

        assertThatThrownBy(() -> service.openShift(FILIAL_ID, new BigDecimal("50000"), KASSIR_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("sahifani yangilang");
    }

    @Test
    @DisplayName("Kassir BOSHQA kassirning smenasini yopa olmaydi")
    void kassirBoshqaningSmenasiniYopaOlmaydi() {
        joriyFoydalanuvchiRoli(UserRole.CASHIER);
        when(cashShiftRepository.findWithLockByIdAndIsDeletedFalse(7L))
                .thenReturn(Optional.of(ochiqSmena(7L, BOSHQA_KASSIR_ID)));

        assertThatThrownBy(() -> service.closeShift(7L, new BigDecimal("120000"), null, KASSIR_ID))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Boshqa kassirning");

        verify(cashShiftRepository, never()).save(any());
    }

    @Test
    @DisplayName("Kassir o'z smenasini yopa oladi")
    void kassirOzSmenasiniYopaOladi() {
        joriyFoydalanuvchiRoli(UserRole.CASHIER);
        CashShift smena = ochiqSmena(7L, KASSIR_ID);
        when(cashShiftRepository.findWithLockByIdAndIsDeletedFalse(7L)).thenReturn(Optional.of(smena));
        when(cashShiftRepository.save(any(CashShift.class))).thenAnswer(inv -> inv.getArgument(0));

        CashShift natija = service.closeShift(7L, new BigDecimal("100000"), null, KASSIR_ID);

        assertThat(natija.getStatus()).isEqualTo(ShiftStatus.CLOSED);
        assertThat(natija.getClosedAt()).isNotNull();
    }

    @Test
    @DisplayName("MANAGER istalgan kassirning smenasini yopa oladi")
    void rahbariyatBoshqaningSmenasiniYopaOladi() {
        joriyFoydalanuvchiRoli(UserRole.MANAGER);
        when(cashShiftRepository.findWithLockByIdAndIsDeletedFalse(7L))
                .thenReturn(Optional.of(ochiqSmena(7L, BOSHQA_KASSIR_ID)));
        when(cashShiftRepository.save(any(CashShift.class))).thenAnswer(inv -> inv.getArgument(0));

        CashShift natija = service.closeShift(7L, new BigDecimal("100000"), null, KASSIR_ID);

        assertThat(natija.getStatus()).isEqualTo(ShiftStatus.CLOSED);
    }

    @Test
    @DisplayName("Yopilgan smenani qayta yopib bo'lmaydi")
    void yopilganSmenaQaytaYopilmaydi() {
        joriyFoydalanuvchiRoli(UserRole.OWNER);
        CashShift smena = ochiqSmena(7L, KASSIR_ID);
        smena.setStatus(ShiftStatus.CLOSED);
        when(cashShiftRepository.findWithLockByIdAndIsDeletedFalse(7L)).thenReturn(Optional.of(smena));

        assertThatThrownBy(() -> service.closeShift(7L, new BigDecimal("100000"), null, KASSIR_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("allaqachon yopilgan");
    }

    @Test
    @DisplayName("Kutilgan naqd = boshlang'ich + naqd savdolar + aralash savdoning naqd qismi")
    void kutilganNaqdTogriHisoblanadi() {
        joriyFoydalanuvchiRoli(UserRole.OWNER);
        CashShift smena = ochiqSmena(7L, KASSIR_ID); // boshlang'ich 100 000
        when(cashShiftRepository.findWithLockByIdAndIsDeletedFalse(7L)).thenReturn(Optional.of(smena));
        when(cashShiftRepository.save(any(CashShift.class))).thenAnswer(inv -> inv.getArgument(0));
        when(saleRepository.sumTotalAmountByCashShiftIdAndPaymentMethod(7L, PaymentMethod.CASH))
                .thenReturn(new BigDecimal("250000.00"));
        when(saleRepository.sumCashPortionByCashShiftIdForMixed(7L))
                .thenReturn(new BigDecimal("30000.00"));

        CashShift natija = service.closeShift(7L, new BigDecimal("380000"), null, KASSIR_ID);

        // Karta qismi kassaga TUSHMAYDI, shuning uchun u bu yig'indiga kirmaydi.
        assertThat(natija.getExpectedCash()).isEqualByComparingTo("380000.00");
    }
}
