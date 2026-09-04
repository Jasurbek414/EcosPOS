package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.Sale;
import uz.savdo.enums.PaymentMethod;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {

    List<Sale> findAllByBranchIdAndIsDeletedFalseOrderByIdDesc(Long branchId);

    List<Sale> findAllByIsDeletedFalseOrderByIdDesc();

    Optional<Sale> findByIdAndIsDeletedFalse(Long id);

    /**
     * Bitta kassa smenasi doirasida berilgan to'lov usuli bo'yicha sotuvlar totalAmount
     * yig'indisi — CashShiftService#closeShift'da expectedCash hisoblash uchun (naqd
     * to'lovlarda kassaga NETTO qo'shiladigan summa totalAmount, amountPaid emas —
     * qaytim allaqachon ayirilgan holda).
     */
    @Query("select coalesce(sum(s.totalAmount), 0) from Sale s " +
            "where s.cashShiftId = :cashShiftId and s.paymentMethod = :paymentMethod and s.isDeleted = false")
    BigDecimal sumTotalAmountByCashShiftIdAndPaymentMethod(@Param("cashShiftId") Long cashShiftId,
                                                             @Param("paymentMethod") PaymentMethod paymentMethod);

    /**
     * Bitta kassa smenasi doirasida MIXED to'lovli sotuvlarning naqd bilan qoplangan
     * qismi (totalAmount - cardAmount) yig'indisi — CashShiftService#closeShift'da
     * expectedCash hisoblash uchun (kassa qutisiga faqat shu qism tushadi, karta
     * qismi drawer'ga hech qachon tegmaydi).
     */
    @Query("select coalesce(sum(s.totalAmount - s.cardAmount), 0) from Sale s " +
            "where s.cashShiftId = :cashShiftId and s.paymentMethod = uz.savdo.enums.PaymentMethod.MIXED " +
            "and s.isDeleted = false")
    BigDecimal sumCashPortionByCashShiftIdForMixed(@Param("cashShiftId") Long cashShiftId);
}
