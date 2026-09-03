package uz.savdo.platform.entity;

import lombok.*;

import java.time.LocalDateTime;

/**
 * Platform darajasidagi superadmin foydalanuvchi — hech qaysi kompaniyaga tegishli emas.
 * platform_db'dagi platform_users jadvaliga mos keladi.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformUser {
    private Long id;
    private String username;
    private String password;
    private String fullName;
    private LocalDateTime createdAt;
}
