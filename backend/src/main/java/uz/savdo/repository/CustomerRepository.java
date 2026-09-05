package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.Customer;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    List<Customer> findAllByIsDeletedFalseOrderByIdAsc();

    Optional<Customer> findByIdAndIsDeletedFalse(Long id);

    /** POS'dagi mijoz tanlagichi uchun — faqat faol (deaktivatsiya qilinmagan) mijozlar. */
    List<Customer> findAllByIsDeletedFalseAndIsActiveTrueOrderByIdAsc();
}
