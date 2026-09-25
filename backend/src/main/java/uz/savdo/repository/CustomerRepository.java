package uz.savdo.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.Customer;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    List<Customer> findAllByIsDeletedFalseOrderByIdAsc();

    Optional<Customer> findByIdAndIsDeletedFalse(Long id);

    /**
     * Qarz daftariga yozishdan oldin mijoz qatorini qulflaydi — bir vaqtda kelgan
     * ikkita to'lov (ikki marta bosish yoki ikki qurilma) ikkalasi ham eski balansni
     * o'qib, ikkalasi ham tekshiruvdan o'tib ketishining oldini oladi.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Customer> findWithLockByIdAndIsDeletedFalse(Long id);

    /** POS'dagi mijoz tanlagichi uchun — faqat faol (deaktivatsiya qilinmagan) mijozlar. */
    List<Customer> findAllByIsDeletedFalseAndIsActiveTrueOrderByIdAsc();
}
