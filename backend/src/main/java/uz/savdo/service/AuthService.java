package uz.savdo.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import uz.savdo.dto.auth.AuthResponse;
import uz.savdo.dto.auth.LoginRequest;
import uz.savdo.dto.auth.RefreshTokenRequest;
import uz.savdo.entity.User;
import uz.savdo.exception.UnauthorizedException;
import uz.savdo.platform.entity.Company;
import uz.savdo.platform.enums.CompanyStatus;
import uz.savdo.platform.repository.CompanyRepository;
import uz.savdo.repository.UserRepository;
import uz.savdo.security.JwtService;
import uz.savdo.tenant.TenantContext;

import java.time.LocalDateTime;

/**
 * DIQQAT: bu yerda ataylab @Transactional ishlatilmaydi — Spring transaction
 * TenantContext o'rnatilishidan OLDIN DataSource'dan ulanish so'rashi mumkin,
 * bu esa noto'g'ri kompaniya bazasiga ulanib qolish xavfini tug'diradi.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CompanyRepository companyRepository;

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCK_DURATION_MINUTES = 15;

    public AuthResponse login(LoginRequest request) {
        if (request.getCompanyCode() == null || request.getCompanyCode().isBlank()) {
            throw new UnauthorizedException("Kompaniya kodi kiritilishi shart");
        }
        String slug = request.getCompanyCode().trim();

        Company company = companyRepository.findBySlug(slug)
                .orElseThrow(() -> new UnauthorizedException("Kompaniya topilmadi"));

        assertCompanyActive(company);

        TenantContext.set(company.getDbName());
        try {
            User user = userRepository.findByUsernameAndIsDeletedFalse(request.getUsername())
                    .orElseThrow(() -> new UnauthorizedException("Username yoki parol noto'g'ri"));

            if (!user.getIsActive()) {
                throw new UnauthorizedException("Foydalanuvchi bloklangan");
            }

            if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
                throw new UnauthorizedException("Hisob vaqtinchalik bloklangan. " +
                        LOCK_DURATION_MINUTES + " daqiqadan keyin qayta urinib ko'ring");
            }

            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                handleFailedLogin(user);
                throw new UnauthorizedException("Username yoki parol noto'g'ri");
            }

            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            userRepository.save(user);

            log.info("Foydalanuvchi tizimga kirdi: {} (kompaniya: {})", user.getUsername(), company.getSlug());

            return buildAuthResponse(user, company.getId());
        } finally {
            TenantContext.clear();
        }
    }

    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String refreshTokenValue = request.getRefreshToken();
        String username = jwtService.extractUsername(refreshTokenValue);
        Long companyId = jwtService.extractCompanyId(refreshTokenValue);

        if (!jwtService.isTokenValid(refreshTokenValue, username)) {
            throw new UnauthorizedException("Refresh token muddati o'tgan");
        }
        if (!jwtService.isRefreshToken(refreshTokenValue)) {
            throw new UnauthorizedException("Noto'g'ri token turi");
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new UnauthorizedException("Kompaniya topilmadi"));
        assertCompanyActive(company);

        TenantContext.set(company.getDbName());
        try {
            User user = userRepository.findByUsernameAndIsDeletedFalse(username)
                    .orElseThrow(() -> new UnauthorizedException("Foydalanuvchi topilmadi"));
            return buildAuthResponse(user, company.getId());
        } finally {
            TenantContext.clear();
        }
    }

    private void assertCompanyActive(Company company) {
        if (company.getStatus() != CompanyStatus.ACTIVE) {
            log.warn("Bloklangan/faol bo'lmagan kompaniyaga kirish urinishi: {} ({})", company.getSlug(), company.getStatus());
            throw new UnauthorizedException("Kompaniyangiz faol emas. Administrator bilan bog'laning");
        }
    }

    private void handleFailedLogin(User user) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            user.setLockedUntil(LocalDateTime.now().plusMinutes(LOCK_DURATION_MINUTES));
            log.warn("Foydalanuvchi bloklandi (5 marta noto'g'ri parol): {}", user.getUsername());
        }
        userRepository.save(user);
    }

    private AuthResponse buildAuthResponse(User user, Long companyId) {
        return AuthResponse.builder()
                .accessToken(jwtService.generateAccessToken(user, companyId))
                .refreshToken(jwtService.generateRefreshToken(user, companyId))
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .companyId(companyId)
                .branchId(user.getBranchId())
                .build();
    }
}
