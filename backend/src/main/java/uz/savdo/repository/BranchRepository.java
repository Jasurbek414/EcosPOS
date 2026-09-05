package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.Branch;

import java.util.List;
import java.util.Optional;

@Repository
public interface BranchRepository extends JpaRepository<Branch, Long> {

    List<Branch> findAllByIsDeletedFalseOrderByIdAsc();

    Optional<Branch> findByIdAndIsDeletedFalse(Long id);

    long countByIsDeletedFalse();
}
