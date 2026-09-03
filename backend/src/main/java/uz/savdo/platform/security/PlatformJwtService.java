package uz.savdo.platform.security;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import uz.savdo.platform.entity.PlatformUser;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Superadmin JWT tokenlari — tenant JwtService'dan butunlay alohida "nomlar maydoni".
 * tokenType claim'i "PLATFORM_ACCESS" bo'lgani uchun tenant JwtAuthFilter bunday tokenni
 * hech qachon qabul qilmaydi, va aksincha — bir xil imzo kaliti ishlatilsa ham.
 */
@Service
public class PlatformJwtService {

    private static final String TOKEN_TYPE = "PLATFORM_ACCESS";

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.access-token-expiration}")
    private long accessTokenExpiration;

    public String generateToken(PlatformUser user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("tokenType", TOKEN_TYPE);
        claims.put("fullName", user.getFullName());
        return Jwts.builder()
                .claims(claims)
                .subject(user.getUsername())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
                .signWith(getSigningKey())
                .compact();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public boolean isValidPlatformToken(String token, String username) {
        try {
            var claims = extractAllClaims(token);
            boolean typeOk = TOKEN_TYPE.equals(claims.get("tokenType", String.class));
            boolean userOk = claims.getSubject().equals(username);
            boolean notExpired = claims.getExpiration().after(new Date());
            return typeOk && userOk && notExpired;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private io.jsonwebtoken.Claims extractAllClaims(String token) {
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
