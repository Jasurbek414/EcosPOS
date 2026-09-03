package uz.savdo.platform.entity;

import lombok.*;

import java.time.LocalDateTime;

/**
 * Superadmin harakatlari jurnali (kompaniya yaratish/bloklash va h.k.).
 * Tenant'larning o'z audit jadvalidan (agar bo'lsa) butunlay alohida.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformAuditLog {
    private Long id;
    private Long platformUserId;
    private String action;
    private Long companyId;
    private String details;
    private LocalDateTime createdAt;
}
