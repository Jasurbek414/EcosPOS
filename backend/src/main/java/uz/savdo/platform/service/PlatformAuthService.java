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

/**
 * Superadmin login xizmati — platform_users jadvali (platform_db) va o'z JWT nomlar
 * maydoni bilan ishlaydi, tenant AuthService'dan butunlay mustaqil.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlatformAuthService {

    private final PlatformUserRepository platformUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final PlatformJwtService platformJwtService;

    public PlatformAuthResponse login(PlatformLoginRequest request) {
        PlatformUser user = platformUserRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new UnauthorizedException("Username yoki parol noto'g'ri"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Username yoki parol noto'g'ri");
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new UnauthorizedException("Hisob faolsizlantirilgan");
        }

        log.info("Superadmin tizimga kirdi: {}", user.getUsername());

        return PlatformAuthResponse.builder()
                .accessToken(platformJwtService.generateToken(user))
                .username(user.getUsername())
                .fullName(user.getFullName())
                .build();
    }
}
