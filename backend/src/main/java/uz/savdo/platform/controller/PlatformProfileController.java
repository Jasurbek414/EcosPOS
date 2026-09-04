package uz.savdo.platform.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import uz.savdo.exception.BadRequestException;
import uz.savdo.platform.dto.PlatformChangePasswordRequest;
import uz.savdo.platform.dto.PlatformProfileResponse;
import uz.savdo.platform.dto.PlatformProfileUpdateRequest;
import uz.savdo.platform.entity.PlatformUser;
import uz.savdo.platform.repository.PlatformUserRepository;

import java.util.Map;

/**
 * O'z-o'ziga xizmat ko'rsatish profili — istalgan autentifikatsiyalangan superadmin
 * FAQAT o'zining to'liq ismini va parolini shu yerdan o'zgartiradi. Tenant tomondagi
 * uz.savdo.controller.ProfileController'ning platform (superadmin) ekvivalenti.
 */
@RestController
@RequestMapping("/api/v1/platform/profile")
@RequiredArgsConstructor
public class PlatformProfileController {

    private final PlatformUserRepository platformUserRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public PlatformProfileResponse get(@AuthenticationPrincipal PlatformUser currentAdmin) {
        return PlatformProfileResponse.from(currentAdmin);
    }

    @PutMapping
    public PlatformProfileResponse update(@AuthenticationPrincipal PlatformUser currentAdmin,
                                           @Valid @RequestBody PlatformProfileUpdateRequest request) {
        platformUserRepository.updateFullName(currentAdmin.getId(), request.getFullName());
        currentAdmin.setFullName(request.getFullName());
        return PlatformProfileResponse.from(currentAdmin);
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, Boolean>> changePassword(@AuthenticationPrincipal PlatformUser currentAdmin,
                                                                 @Valid @RequestBody PlatformChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.getCurrentPassword(), currentAdmin.getPassword())) {
            throw new BadRequestException("Joriy parol noto'g'ri");
        }

        String encoded = passwordEncoder.encode(request.getNewPassword());
        platformUserRepository.updatePassword(currentAdmin.getId(), encoded);

        return ResponseEntity.ok(Map.of("success", true));
    }
}
