package uz.savdo.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.savdo.entity.Branch;
import uz.savdo.entity.CashShift;
import uz.savdo.enums.PaymentMethod;
import uz.savdo.enums.ShiftStatus;
import uz.savdo.enums.UserRole;
import uz.savdo.exception.BadRequestException;
import uz.savdo.exception.ForbiddenException;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.BranchRepository;
import uz.savdo.repository.CashShiftRepository;
import uz.savdo.repository.SaleRepository;
import uz.savdo.security.CurrentUserService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Kassa smenasi hayot sikli: ochish (boshlang'ich naqd summasi bilan) va yopish
 * (haqiqiy sanoq bilan, kutilgan summa bilan solishtirish uchun). Bitta kassir (yoki
 * ushbu rolda ishlovchi MANAGER/OWNER) bir vaqtda faqat bitta OCHIQ smenaga ega bo'lishi
 * mumkin. Ochish/yopish uchun ruxsat OWNER/MANAGER/CASHIER'ning barchasiga o'z filiali
 * doirasida beriladi (OWNER — istalgan filialda) — assertCanAccessBranch shu qoidani
 * amalga oshiradi.
 */
@Service
@RequiredArgsConstructor
public class CashShiftService {

    private final BranchRepository branchRepository;
    private final CashShiftRepository cashShiftRepository;
    private final SaleRepository saleRepository;
    private final CurrentUserService currentUserService;

    @Transactional
    public CashShift openShift(Long branchId, BigDecimal openingCash, Long currentUserId) {
        currentUserService.assertCanAccessBranch(branchId);

        Branch branch = branchRepository.findByIdAndIsDeletedFalse(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Filial topilmadi: " + branchId));

        cashShiftRepository.findByCashierIdAndStatusAndIsDeletedFalse(currentUserId, ShiftStatus.OPEN)
                .ifPresent(existing -> {
                    throw new BadRequestException("Sizda allaqachon ochiq kassa smenasi mavjud (ID: " + existing.getId() + ")");
                });

        CashShift shift = CashShift.builder()
                .branchId(branch.getId())
                .cashierId(currentUserId)
                .openedAt(LocalDateTime.now())
                .openingCash(openingCash)
                .status(ShiftStatus.OPEN)
                .build();

        try {
            // saveAndFlush — V14 dagi partial unique indeks buzilishi aynan shu yerda
            // yuzaga chiqsin (commit paytida emas), aks holda foydalanuvchi tushunarsiz
            // 500 xatosini ko'radi. Yuqoridagi tekshiruv qulflanmagan bo'lgani uchun
            // ikki tez so'rovda faqat shu indeks ikkinchisini to'xtatib qoladi.
            return cashShiftRepository.saveAndFlush(shift);
        } catch (DataIntegrityViolationException e) {
            throw new BadRequestException("Sizda allaqachon ochiq kassa smenasi mavjud — sahifani yangilang");
        }
    }

    @Transactional
    public CashShift closeShift(Long shiftId, BigDecimal closingCash, String note, Long currentUserId) {
        // Qulflangan o'qish — shu smena ustida bir vaqtda ishlayotgan SaleService#createSale
        // (o'zining ochiq-smena qidiruvini ham qulflab o'qiydi) bilan poyga holatini oldini
        // oladi: ikkalasidan biri boshqasi commit bo'lgunicha kutadi.
        CashShift shift = cashShiftRepository.findWithLockByIdAndIsDeletedFalse(shiftId)
                .orElseThrow(() -> new ResourceNotFoundException("Kassa smenasi topilmadi: " + shiftId));
        currentUserService.assertCanAccessBranch(shift.getBranchId());

        // Filial tekshiruvining o'zi YETARLI EMAS: bitta kompaniyada hamma bir xil
        // filialda ishlagani uchun u kassirlar orasida hech nimani cheklamaydi va
        // kassir hamkasbining ochiq smenasini istalgan summa bilan yopib qo'ya olardi
        // (kamomad esa noto'g'ri odamga yozilardi). Smenani faqat egasi yoki
        // rahbariyat yopa oladi.
        UserRole rol = currentUserService.getCurrentUser().getRole();
        boolean rahbariyat = rol == UserRole.OWNER || rol == UserRole.MANAGER;
        if (!rahbariyat && !shift.getCashierId().equals(currentUserId)) {
            throw new ForbiddenException("Boshqa kassirning smenasini yopish mumkin emas");
        }

        if (shift.getStatus() == ShiftStatus.CLOSED) {
            throw new BadRequestException("Bu kassa smenasi allaqachon yopilgan");
        }

        // Naqd sotuvlarda kassaga NETTO qo'shiladigan summa har doim totalAmount —
        // amountPaid emas: mijoz ortiqcha to'lasa (masalan 100000 berib 20000 qaytim
        // olsa), kassaga aslida faqat 80000 (= totalAmount) qo'shiladi, chunki qaytim
        // (changeAmount) drawer'dan darhol chiqib ketadi. Shu sababli
        // expectedCash = openingCash + SUM(totalAmount), amountPaid emas.
        //
        // MIXED sotuvlarda kassaga faqat naqd bilan qoplangan qism tushadi — karta qismi
        // (cardAmount) drawer'ga hech qachon tegmaydi. Shu qism aynan (totalAmount -
        // cardAmount) ga teng — xuddi CASH uchun yuqoridagi mulohaza kabi, mijozning
        // naqd to'lovi va unga berilgan qaytim neti ham aynan shu summaga teng bo'ladi.
        // Shu sababli MIXED uchun to'liq totalAmount QO'SHILMAYDI (bu karta qismini ham
        // hisobga olib yuborardi) va MIXED e'tiborsiz ham qoldirilmaydi (bu naqd qismini
        // butunlay tushirib qoldirardi).
        BigDecimal cashSalesTotal = saleRepository.sumTotalAmountByCashShiftIdAndPaymentMethod(
                shift.getId(), PaymentMethod.CASH);
        BigDecimal mixedCashPortion = saleRepository.sumCashPortionByCashShiftIdForMixed(shift.getId());
        BigDecimal expectedCash = shift.getOpeningCash().add(cashSalesTotal).add(mixedCashPortion);

        shift.setClosingCash(closingCash);
        shift.setExpectedCash(expectedCash);
        shift.setClosedAt(LocalDateTime.now());
        shift.setStatus(ShiftStatus.CLOSED);
        shift.setNote(note);

        return cashShiftRepository.save(shift);
    }

    public Optional<CashShift> getCurrentOpenShift(Long currentUserId) {
        return cashShiftRepository.findByCashierIdAndStatusAndIsDeletedFalse(currentUserId, ShiftStatus.OPEN);
    }
}
