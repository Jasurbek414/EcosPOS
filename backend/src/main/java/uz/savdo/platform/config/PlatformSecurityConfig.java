package uz.savdo.platform.config;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;
import uz.savdo.platform.security.PlatformJwtAuthFilter;

/**
 * Superadmin (platform) foydalanuvchilari uchun alohida xavfsizlik zanjiri.
 * Faqat /api/v1/platform/** so'rovlarini ushlaydi — tenant zanjiridan (uz.savdo.config.SecurityConfig,
 * @Order(2)) butunlay mustaqil. @Order(1) bo'lgani uchun bu zanjir birinchi tekshiriladi.
 */
@Configuration
@RequiredArgsConstructor
public class PlatformSecurityConfig {

    private final PlatformJwtAuthFilter platformJwtAuthFilter;
    private final CorsConfigurationSource corsConfigurationSource;

    @Bean
    @Order(1)
    public SecurityFilterChain platformSecurityFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/api/v1/platform/**")
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex.authenticationEntryPoint((request, response, authException) -> {
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, authException.getMessage());
                }))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/platform/auth/**").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(platformJwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
