package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.user.PasswordResetResponse;
import uz.savdo.dto.user.UserRequest;
import uz.savdo.dto.user.UserResponse;
import uz.savdo.dto.user.UserUpdateRequest;
import uz.savdo.entity.User;
import uz.savdo.enums.UserRole;
import uz.savdo.exception.BadRequestException;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.platform.util.RandomPasswordGenerator;
import uz.savdo.repository.UserRepository;
import uz.savdo.security.CurrentUserService;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Xodimlar (foydalanuvchilar) boshqaruvi. OWNER barcha xodimlarni ko'radi/yaratadi;
 * MANAGER faqat o'z filialidagi xodimlarni ko'ra oladi (yaratish esa faqat OWNER'ga
 * ruxsat etilgan — assertIsOwner()).
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public List<UserResponse> list() {
        User current = currentUserService.getCurrentUser();
        List<User> users;
        if (current.getRole() == UserRole.OWNER) {
            users = userRepository.findAllByIsDeletedFalseOrderByIdAsc();
        } else if (current.getRole() == UserRole.MANAGER) {
            users = userRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdAsc(current.getBranchId());
        } else {
            currentUserService.assertIsOwner(); // CASHIER uchun har doim 403
            users = List.of();
        }
        return users.stream().map(UserResponse::from).toList();
    }

    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserRequest request) {
        currentUserService.assertIsOwner();

        if (userRepository.existsByUsernameAndIsDeletedFalse(request.getUsername())) {
            throw new BadRequestException("Bu username allaqachon band: " + request.getUsername());
        }
        if (request.getRole() != UserRole.OWNER && request.getBranchId() == null) {
            throw new BadRequestException("MANAGER/CASHIER uchun filial (branchId) kiritilishi shart");
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(request.getRole())
                .branchId(request.getRole() == UserRole.OWNER ? null : request.getBranchId())
                .isActive(true)
                .build();
        user = userRepository.save(user);

        return ResponseEntity.ok(UserResponse.from(user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> update(@PathVariable Long id, @Valid @RequestBody UserUpdateRequest request) {
        currentUserService.assertIsOwner();

        User user = userRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi: " + id));
        if (request.getRole() != UserRole.OWNER && request.getBranchId() == null) {
            throw new BadRequestException("MANAGER/CASHIER uchun filial (branchId) kiritilishi shart");
        }

        User current = currentUserService.getCurrentUser();
        if (current.getId().equals(id)
                && (request.getRole() != UserRole.OWNER || !Boolean.TRUE.equals(request.getIsActive()))) {
            throw new BadRequestException("O'z rolingizni yoki faollik holatingizni bu yerdan o'zgartira olmaysiz");
        }

        // Kompaniyada kamida bitta faol OWNER qolishi shart — oxirgi faol OWNER'ni
        // rolini o'zgartirib yoki faolsizlantirib kompaniyani "egasiz" qoldirish oldini olinadi.
        boolean isActiveOwner = user.getRole() == UserRole.OWNER && Boolean.TRUE.equals(user.getIsActive());
        boolean removesOwnerRole = isActiveOwner && request.getRole() != UserRole.OWNER;
        boolean deactivatesOwner = isActiveOwner && !Boolean.TRUE.equals(request.getIsActive());
        if ((removesOwnerRole || deactivatesOwner)
                && userRepository.countByRoleAndIsActiveTrueAndIsDeletedFalse(UserRole.OWNER) <= 1) {
            throw new BadRequestException("Kompaniyada kamida bitta faol OWNER qolishi shart");
        }

        user.setFullName(request.getFullName());
        user.setRole(request.getRole());
        user.setBranchId(request.getRole() == UserRole.OWNER ? null : request.getBranchId());
        user.setIsActive(request.getIsActive());
        user = userRepository.save(user);

        return ResponseEntity.ok(UserResponse.from(user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        currentUserService.assertIsOwner();

        User current = currentUserService.getCurrentUser();
        if (current.getId().equals(id)) {
            throw new BadRequestException("O'z hisobingizni o'chira olmaysiz");
        }

        User user = userRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi: " + id));
        user.setIsDeleted(true);
        user.setDeletedAt(LocalDateTime.now());
        userRepository.save(user);

        return ResponseEntity.noContent().build();
    }

    /** Xodim parolini majburan tiklaydi — yangi parol shu javobda BIR MARTA ko'rsatiladi. */
    @PostMapping("/{id}/reset-password")
    public ResponseEntity<PasswordResetResponse> resetPassword(@PathVariable Long id) {
        currentUserService.assertIsOwner();

        User user = userRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi: " + id));

        String newPassword = RandomPasswordGenerator.generate();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user = userRepository.save(user);

        return ResponseEntity.ok(PasswordResetResponse.builder()
                .username(user.getUsername())
                .newPassword(newPassword)
                .build());
    }
}
