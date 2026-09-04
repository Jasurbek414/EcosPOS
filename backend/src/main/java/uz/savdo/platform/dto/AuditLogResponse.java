package uz.savdo.platform.dto;

import lombok.Builder;
import lombok.Data;
import uz.savdo.platform.entity.PlatformAuditLog;

import java.time.LocalDateTime;

@Data
@Builder
public class AuditLogResponse {
    private Long id;
    private String actorUsername;
    private String action;
    private Long companyId;
    private String companySlug;
    private String companyName;
    private String details;
    private LocalDateTime createdAt;

    public static AuditLogResponse from(PlatformAuditLog log, String actorUsername, String companySlug, String companyName) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .actorUsername(actorUsername)
                .action(log.getAction())
                .companyId(log.getCompanyId())
                .companySlug(companySlug)
                .companyName(companyName)
                .details(log.getDetails())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
