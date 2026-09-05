package uz.savdo.platform.entity;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Obuna rejasi (tarif) — superadmin tomonidan boshqariladi va kompaniyalarga biriktiriladi.
 * Oddiy POJO — platform_db bilan plain JDBC (JdbcTemplate) orqali ishlaydi, JPA emas.
 * maxBranches/maxUsers/maxProducts NULL bo'lsa — CHEKSIZ (limit yo'q) degani.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Plan {
    private Long id;
    private String name;
    private BigDecimal priceMonthly;
    private Integer maxBranches;
    private Integer maxUsers;
    private Integer maxProducts;
    private String description;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
