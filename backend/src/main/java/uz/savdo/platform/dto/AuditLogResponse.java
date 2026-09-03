package uz.savdo.platform.dto;

import lombok.Builder;
import lombok.Data;
import uz.savdo.platform.entity.PlatformAuditLog;

import java.time.LocalDateTime;

@Data
@Builder
public class AuditLogResponse {
    private Long id;
    private String platformUserName;
    private String action;
    private String companyName;
    private String details;
    private LocalDateTime createdAt;

    public static AuditLogResponse from(PlatformAuditLog log, String platformUserName, String companyName) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .platformUserName(platformUserName)
                .action(log.getAction())
                .companyName(companyName)
                .details(log.getDetails())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
