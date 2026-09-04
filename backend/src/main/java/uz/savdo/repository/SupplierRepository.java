package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.Supplier;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    List<Supplier> findAllByIsDeletedFalseOrderByIdAsc();

    Optional<Supplier> findByIdAndIsDeletedFalse(Long id);
}
