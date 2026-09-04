package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.profile.ChangePasswordRequest;
import uz.savdo.dto.profile.ProfileResponse;
import uz.savdo.dto.profile.ProfileUpdateRequest;
import uz.savdo.entity.Branch;
import uz.savdo.entity.User;
import uz.savdo.exception.BadRequestException;
import uz.savdo.repository.BranchRepository;
import uz.savdo.repository.UserRepository;
import uz.savdo.security.CurrentUserService;

import java.util.Map;

/**
 * O'z-o'ziga xizmat ko'rsatish profili — istalgan autentifikatsiyalangan tenant
 * foydalanuvchisi (OWNER/MANAGER/CASHIER) FAQAT o'zining to'liq ismini va parolini
 * shu yerdan o'zgartiradi. username/role/branchId — bular OWNER-only UserController
 * orqali boshqariladi, shuning uchun bu yerda maxsus rol tekshiruvi yo'q.
 */
@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private final CurrentUserService currentUserService;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public ProfileResponse get() {
        User user = currentUserService.getCurrentUser();
        return ProfileResponse.from(user, resolveBranchName(user.getBranchId()));
    }

    @PutMapping
    public ProfileResponse update(@Valid @RequestBody ProfileUpdateRequest request) {
        User user = currentUserService.getCurrentUser();
        user.setFullName(request.getFullName());
        user = userRepository.save(user);
        return ProfileResponse.from(user, resolveBranchName(user.getBranchId()));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, Boolean>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        User user = currentUserService.getCurrentUser();

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Joriy parol noto'g'ri");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("success", true));
    }

    private String resolveBranchName(Long branchId) {
        if (branchId == null) {
            return null;
        }
        return branchRepository.findByIdAndIsDeletedFalse(branchId)
                .map(Branch::getName)
                .orElse(null);
    }
}
