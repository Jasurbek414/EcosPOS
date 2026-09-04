package uz.savdo.platform.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import uz.savdo.exception.BadRequestException;
import uz.savdo.platform.dto.CreatePlatformAdminRequest;
import uz.savdo.platform.dto.CreatePlatformAdminResponse;
import uz.savdo.platform.entity.PlatformUser;
import uz.savdo.platform.repository.PlatformUserRepository;
import uz.savdo.platform.util.RandomPasswordGenerator;

/**
 * Boshqa superadmin (platform-darajali) hisoblarini boshqarish: yaratish, faol/nofaol
 * qilish. Hech qanday ierarxiya yo'q — istalgan autentifikatsiyalangan superadmin
 * boshqa har qanday superadminni boshqara oladi (o'zidan tashqari — o'zini nofaol
 * qilolmaydi).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlatformAdminService {

    private final PlatformUserRepository platformUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final PlatformAuditLogService platformAuditLogService;

    public CreatePlatformAdminResponse createAdmin(CreatePlatformAdminRequest request, Long actingPlatformUserId) {
        String username = request.getUsername().trim();
        String fullName = request.getFullName().trim();

        if (platformUserRepository.existsByUsername(username)) {
            throw new BadRequestException("Bu username allaqachon band: " + username);
        }

        String generatedPassword = RandomPasswordGenerator.generate();

        PlatformUser newAdmin = PlatformUser.builder()
                .username(username)
                .password(passwordEncoder.encode(generatedPassword))
                .fullName(fullName)
                .isActive(true)
                .build();
        Long id = platformUserRepository.insert(newAdmin);

        platformAuditLogService.log(actingPlatformUserId, "SUPERADMIN_CREATED", null,
                "Yangi superadmin yaratildi: " + username);

        log.info("Yangi superadmin yaratildi: {} (yaratuvchi id={})", username, actingPlatformUserId);

        return CreatePlatformAdminResponse.builder()
                .id(id)
                .username(username)
                .fullName(fullName)
                .password(generatedPassword)
                .build();
    }

    public void deactivate(Long targetId, Long actingPlatformUserId) {
        if (targetId.equals(actingPlatformUserId)) {
            throw new BadRequestException("O'zingizni faolsizlantira olmaysiz");
        }

        PlatformUser target = platformUserRepository.findById(targetId)
                .orElseThrow(() -> new BadRequestException("Superadmin topilmadi: " + targetId));

        platformUserRepository.updateActive(targetId, false);
        platformAuditLogService.log(actingPlatformUserId, "SUPERADMIN_DEACTIVATED", null,
                "Superadmin faolsizlantirildi: " + target.getUsername());
    }

    public void activate(Long targetId, Long actingPlatformUserId) {
        PlatformUser target = platformUserRepository.findById(targetId)
                .orElseThrow(() -> new BadRequestException("Superadmin topilmadi: " + targetId));

        platformUserRepository.updateActive(targetId, true);
        platformAuditLogService.log(actingPlatformUserId, "SUPERADMIN_ACTIVATED", null,
                "Superadmin faollashtirildi: " + target.getUsername());
    }
}
