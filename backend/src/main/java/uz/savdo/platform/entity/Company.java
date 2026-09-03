package uz.savdo.platform.entity;

import lombok.*;
import uz.savdo.platform.enums.CompanyStatus;

import java.time.LocalDateTime;

/**
 * Kompaniya (tenant) — har biri alohida ma'lumotlar bazasiga ega.
 * Oddiy POJO — platform_db bilan plain JDBC (JdbcTemplate) orqali ishlaydi, JPA emas.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Company {
    private Long id;
    private String slug;
    private String name;
    private String dbHost;
    private Integer dbPort;
    private String dbName;
    private String dbUsername;
    private CompanyStatus status;
    private String blockedReason;
    private LocalDateTime blockedAt;
    private String plan;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isDeleted;
    private LocalDateTime deletedAt;
}
