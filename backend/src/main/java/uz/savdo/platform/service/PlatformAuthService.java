package uz.savdo.platform.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import uz.savdo.exception.UnauthorizedException;
import uz.savdo.platform.dto.PlatformAuthResponse;
import uz.savdo.platform.dto.PlatformLoginRequest;
import uz.savdo.platform.entity.PlatformUser;
import uz.savdo.platform.repository.PlatformUserRepository;
import uz.savdo.platform.security.PlatformJwtService;

import java.time.LocalDateTime;

/**
 * Superadmin login xizmati — platform_users jadvali (platform_db) va o'z JWT nomlar
 * maydoni bilan ishlaydi, tenant AuthService'dan butunlay mustaqil.
 * Brute-force himoyasi: 5 ta noto'g'ri urinishdan keyin 15 daqiqalik bloklash
 * (tenant AuthService'dagi kabi naqsh).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlatformAuthService {

    private final PlatformUserRepository platformUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final PlatformJwtService platformJwtService;

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCK_DURATION_MINUTES = 15;

    public PlatformAuthResponse login(PlatformLoginRequest request) {
        PlatformUser user = platformUserRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new UnauthorizedException("Username yoki parol noto'g'ri"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new UnauthorizedException("Hisob faolsizlantirilgan");
        }

        // Bloklash tekshiruvi — lockedUntil hali o'tmagan bo'lsa kirish rad etiladi.
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new UnauthorizedException("Hisob vaqtinchalik bloklangan. " +
                    LOCK_DURATION_MINUTES + " daqiqadan keyin qayta urinib ko'ring");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            int attempts = (user.getFailedLoginAttempts() == null ? 0 : user.getFailedLoginAttempts()) + 1;
            LocalDateTime lockedUntil = null;
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                lockedUntil = LocalDateTime.now().plusMinutes(LOCK_DURATION_MINUTES);
                log.warn("Superadmin bloklandi: {}", user.getUsername());
            }
            platformUserRepository.updateLoginState(user.getId(), attempts, lockedUntil);
            throw new UnauthorizedException("Username yoki parol noto'g'ri");
        }

        // Muvaffaqiyatli login — counter va lockni nollaymiz.
        platformUserRepository.resetLoginState(user.getId());
        log.info("Superadmin tizimga kirdi: {}", user.getUsername());

        return PlatformAuthResponse.builder()
                .accessToken(platformJwtService.generateToken(user))
                .username(user.getUsername())
                .fullName(user.getFullName())
                .build();
    }
}
