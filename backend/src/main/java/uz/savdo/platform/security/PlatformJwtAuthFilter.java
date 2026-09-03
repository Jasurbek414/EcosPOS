package uz.savdo.platform.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import uz.savdo.platform.entity.PlatformUser;
import uz.savdo.platform.repository.PlatformUserRepository;

import java.io.IOException;
import java.util.List;

/**
 * /api/v1/platform/** so'rovlari uchun JWT tekshiruvchi filtr — tenant JwtAuthFilter'dan
 * butunlay alohida ishlaydi, faqat PLATFORM_ACCESS turidagi tokenlarni qabul qiladi.
 */
@Component
@RequiredArgsConstructor
public class PlatformJwtAuthFilter extends OncePerRequestFilter {

    private final PlatformJwtService platformJwtService;
    private final PlatformUserRepository platformUserRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);

        try {
            final String username = platformJwtService.extractUsername(jwt);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                PlatformUser user = platformUserRepository.findByUsername(username).orElse(null);

                if (user != null && platformJwtService.isValidPlatformToken(jwt, username)) {
                    List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_SUPERADMIN"));

                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(user, null, authorities);
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            logger.debug("Platform JWT token validation failed: " + e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}
