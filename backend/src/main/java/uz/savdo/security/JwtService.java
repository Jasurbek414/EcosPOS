package uz.savdo.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import uz.savdo.entity.User;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * JWT token yaratish va tekshirish xizmati.
 */
@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    private static final String TOKEN_TYPE_ACCESS = "ACCESS";
    private static final String TOKEN_TYPE_REFRESH = "REFRESH";

    /**
     * Repozitoriy bir muddat ochiq bo'lgani uchun quyidagi namunaviy qiymatlar
     * ommaga ma'lum. Shulardan biri bilan ishga tushsa, istalgan odam istalgan
     * rol va kompaniya uchun token yasay oladi — shuning uchun ilova umuman
     * ko'tarilmasligi kerak.
     */
    private static final String[] TAQIQLANGAN_KALIT_BELGILARI = {
            "local-dev-only", "change_me", "changeme", "your-secret", "secret-key"
    };

    @jakarta.annotation.PostConstruct
    void kalitniTekshir() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET belgilanmagan — ilova ishga tushirilmaydi.");
        }
        if (jwtSecret.length() < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET juda qisqa (" + jwtSecret.length() + " belgi) — kamida 32 belgi bo'lishi shart.");
        }
        String kichik = jwtSecret.toLowerCase();
        for (String belgi : TAQIQLANGAN_KALIT_BELGILARI) {
            if (kichik.contains(belgi)) {
                throw new IllegalStateException(
                        "JWT_SECRET namunaviy qiymatda qolgan ('" + belgi + "') — tasodifiy kalit bilan almashtiring.");
            }
        }
    }

    /**
     * Access token yaratish. companyId — platform_db'dagi kompaniya ID'si, har bir
     * so'rovda JwtAuthFilter shu claim orqali kompaniya holatini (bloklangan/bloklanmagan)
     * qayta tekshiradi va tegishli tenant bazasiga yo'naltiradi. branchId — faqat
     * mijoz tomoni (mobil/frontend) uchun qulaylik claim'i, xavfsizlik qarorlari HAR DOIM
     * bazadan qayta o'qilgan User obyekti asosida qabul qilinadi (token claim'iga
     * ishonilmaydi).
     */
    public String generateAccessToken(User user, Long companyId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", user.getRole().name());
        claims.put("fullName", user.getFullName());
        claims.put("tokenType", TOKEN_TYPE_ACCESS);
        claims.put("companyId", companyId);
        claims.put("branchId", user.getBranchId());
        return buildToken(claims, user.getUsername(), accessTokenExpiration);
    }

    /**
     * Refresh token yaratish
     */
    public String generateRefreshToken(User user, Long companyId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("tokenType", TOKEN_TYPE_REFRESH);
        claims.put("companyId", companyId);
        return buildToken(claims, user.getUsername(), refreshTokenExpiration);
    }

    /**
     * Tokendan username ni olish
     */
    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    /**
     * Tokendan role ni olish
     */
    public String extractRole(String token) {
        return extractAllClaims(token).get("role", String.class);
    }

    /**
     * Tokendan turini olish (ACCESS/REFRESH)
     */
    public String extractTokenType(String token) {
        return extractAllClaims(token).get("tokenType", String.class);
    }

    /**
     * Tokendan kompaniya ID'sini olish
     */
    public Long extractCompanyId(String token) {
        Object value = extractAllClaims(token).get("companyId");
        return value != null ? Long.valueOf(value.toString()) : null;
    }

    /**
     * Tokendan filial ID'sini olish (faqat ma'lumot uchun — xavfsizlik qarorlarida
     * ishlatilmaydi, qarang: {@link #generateAccessToken}).
     */
    public Long extractBranchId(String token) {
        Object value = extractAllClaims(token).get("branchId");
        return value != null ? Long.valueOf(value.toString()) : null;
    }

    /**
     * Token access token ekanligini tekshirish — refresh tokenni Bearer sifatida
     * ishlatib bo'lmasligini ta'minlaydi.
     */
    public boolean isAccessToken(String token) {
        try {
            return TOKEN_TYPE_ACCESS.equals(extractTokenType(token));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Token refresh token ekanligini tekshirish.
     */
    public boolean isRefreshToken(String token) {
        try {
            return TOKEN_TYPE_REFRESH.equals(extractTokenType(token));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Token haqiqiy ekanligini tekshirish
     */
    public boolean isTokenValid(String token, String username) {
        try {
            final String tokenUsername = extractUsername(token);
            return tokenUsername.equals(username) && !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }

    private String buildToken(Map<String, Object> claims, String subject, long expiration) {
        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey())
                .compact();
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
