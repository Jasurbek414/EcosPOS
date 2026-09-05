package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.MeasurementUnit;

import java.util.List;
import java.util.Optional;

@Repository
public interface MeasurementUnitRepository extends JpaRepository<MeasurementUnit, Long> {

    List<MeasurementUnit> findAllByIsDeletedFalseOrderByIdAsc();

    Optional<MeasurementUnit> findByIdAndIsDeletedFalse(Long id);

    Optional<MeasurementUnit> findByCodeIgnoreCaseAndIsDeletedFalse(String code);

    boolean existsByCodeIgnoreCaseAndIsDeletedFalseAndIdNot(String code, Long id);
}
