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
    private String address;
    private String phone;
    private String logoUrl;
    private String receiptPaperWidth;
    private String receiptFooterText;
    private Boolean receiptShowLogo;
    private Boolean receiptShowCashierName;
    private Boolean receiptAutoPrint;
    private String receiptHeaderText;
    private Boolean receiptShowBranchName;
    private String receiptCurrencyLabel;
    private CompanyStatus status;
    private String blockedReason;
    private LocalDateTime blockedAt;
    private Long planId;
    private Boolean branchesFeatureEnabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isDeleted;
    private LocalDateTime deletedAt;
}
