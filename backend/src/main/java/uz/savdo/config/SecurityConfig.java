package uz.savdo.config;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import uz.savdo.security.JwtAuthFilter;

import java.util.Arrays;
import java.util.List;

/**
 * Tenant (kompaniya) foydalanuvchilari uchun xavfsizlik zanjiri.
 * DIQQAT: bu {@code @Order(2)} bilan belgilangan — platform.config.PlatformSecurityConfig
 * ({@code @Order(1)}) /api/v1/platform/** so'rovlarini birinchi bo'lib ushlab qoladi,
 * shundan keyingina bu zanjir qolgan hamma narsaga ishlaydi.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    @Order(2)
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex.authenticationEntryPoint((request, response, authException) -> {
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, authException.getMessage());
                }))
                .authorizeHttpRequests(auth -> auth
                        // Ochiq endpointlar
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers("/api/v1/health").permitAll()
                        // Mahsulot rasmlarini serve qilish - <img src> Authorization header
                        // biriktira olmaydi. DIQQAT: faqat GET (yuklash POST /upload esa
                        // FileController#upload'da assertCanManageCatalog orqali himoyalangan
                        // holicha qoladi, chunki bu matcher HttpMethod.GET bilan cheklangan).
                        .requestMatchers(HttpMethod.GET, "/api/v1/files/**").permitAll()
                        // Swagger va Actuator ATAYLAB ochiq qoldirilmaydi. Avval ular
                        // permitAll edi va faqat nginx marshrutlashi tufayli tashqaridan
                        // ko'rinmasdi — ya'ni bitta nginx o'zgarishi butun API sxemasini
                        // parolsiz ochib yuborardi. Endi ular ham quyidagi
                        // anyRequest().authenticated() qoidasi ostiga tushadi.
                        // Qolgan barcha endpointlar autentifikatsiya talab qiladi
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList(allowedOrigins.split(",")));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
