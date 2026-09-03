package uz.savdo.platform.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PlatformAuthResponse {
    private String accessToken;
    private String username;
    private String fullName;
}
