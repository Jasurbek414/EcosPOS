package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.User;
import uz.savdo.enums.UserRole;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsernameAndIsDeletedFalse(String username);

    Optional<User> findByIdAndIsDeletedFalse(Long id);

    boolean existsByUsernameAndIsDeletedFalse(String username);

    List<User> findAllByIsDeletedFalseOrderByIdAsc();

    List<User> findAllByBranchIdAndIsDeletedFalseOrderByIdAsc(Long branchId);

    /** Provisioning paytida seed qilingan "admin" foydalanuvchisini topish uchun. */
    Optional<User> findFirstByRoleAndIsDeletedFalseOrderByIdAsc(UserRole role);
}
