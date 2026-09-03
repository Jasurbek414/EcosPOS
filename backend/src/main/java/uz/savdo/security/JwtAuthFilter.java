package uz.savdo.security;

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
import uz.savdo.entity.User;
import uz.savdo.platform.entity.Company;
import uz.savdo.platform.enums.CompanyStatus;
import uz.savdo.platform.repository.CompanyRepository;
import uz.savdo.repository.UserRepository;
import uz.savdo.tenant.TenantContext;

import java.io.IOException;
import java.util.List;

/**
 * Tokendagi companyId claim orqali kompaniya HAR BIR so'rovda platform_db'dan qayta
 * tekshiriladi (keshlanmaydi) — bloklangan kompaniya darhol qulflanadi. TenantContext
 * filterChain davomida o'rnatilgan holda qoladi va finally'da albatta tozalanadi.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;

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
        boolean tenantContextSet = false;

        try {
            try {
                final String username = jwtService.extractUsername(jwt);
                final Long companyId = jwtService.extractCompanyId(jwt);

                if (username != null && companyId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    Company company = companyRepository.findById(companyId).orElse(null);

                    if (company != null && company.getStatus() == CompanyStatus.ACTIVE) {
                        TenantContext.set(company.getDbName());
                        tenantContextSet = true;

                        User user = userRepository.findByUsernameAndIsDeletedFalse(username).orElse(null);

                        if (user != null && user.getIsActive() && jwtService.isTokenValid(jwt, username)
                                && jwtService.isAccessToken(jwt)) {
                            List<SimpleGrantedAuthority> authorities = List.of(
                                    new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
                            );

                            UsernamePasswordAuthenticationToken authToken =
                                    new UsernamePasswordAuthenticationToken(user, null, authorities);
                            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                            SecurityContextHolder.getContext().setAuthentication(authToken);
                        }
                    } else {
                        logger.debug("Kompaniya topilmadi yoki faol emas: companyId=" + companyId);
                    }
                }
            } catch (Exception e) {
                logger.debug("JWT token validation failed: " + e.getMessage());
            }

            filterChain.doFilter(request, response);
        } finally {
            if (tenantContextSet) {
                TenantContext.clear();
            }
        }
    }
}
