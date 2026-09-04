package uz.savdo.platform.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import uz.savdo.platform.dto.CreatePlatformAdminRequest;
import uz.savdo.platform.dto.CreatePlatformAdminResponse;
import uz.savdo.platform.dto.PlatformAdminResponse;
import uz.savdo.platform.entity.PlatformUser;
import uz.savdo.platform.repository.PlatformUserRepository;
import uz.savdo.platform.service.PlatformAdminService;

import java.util.List;

/**
 * Boshqa superadmin (platform-darajali) hisoblarini boshqarish — ro'yxat, yaratish,
 * faol/nofaol qilish. Hech qanday ierarxiya yo'q: istalgan autentifikatsiyalangan
 * superadmin boshqa har qanday superadminni boshqara oladi, o'zidan tashqari.
 */
@RestController
@RequestMapping("/api/v1/platform/admins")
@RequiredArgsConstructor
public class PlatformAdminController {

    private final PlatformUserRepository platformUserRepository;
    private final PlatformAdminService platformAdminService;

    @GetMapping
    public List<PlatformAdminResponse> list() {
        return platformUserRepository.findAll().stream()
                .map(PlatformAdminResponse::from)
                .toList();
    }

    @PostMapping
    public ResponseEntity<CreatePlatformAdminResponse> create(
            @AuthenticationPrincipal PlatformUser currentAdmin,
            @Valid @RequestBody CreatePlatformAdminRequest request) {
        return ResponseEntity.ok(platformAdminService.createAdmin(request, currentAdmin.getId()));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<Void> deactivate(@AuthenticationPrincipal PlatformUser currentAdmin,
                                            @PathVariable Long id) {
        platformAdminService.deactivate(id, currentAdmin.getId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<Void> activate(@AuthenticationPrincipal PlatformUser currentAdmin,
                                          @PathVariable Long id) {
        platformAdminService.activate(id, currentAdmin.getId());
        return ResponseEntity.noContent().build();
    }
}
