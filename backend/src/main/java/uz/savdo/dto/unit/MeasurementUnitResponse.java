package uz.savdo.dto.unit;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.MeasurementUnit;

import java.time.LocalDateTime;

@Data
@Builder
public class MeasurementUnitResponse {
    private Long id;
    private String code;
    private String name;
    private Boolean isActive;
    private LocalDateTime createdAt;

    public static MeasurementUnitResponse from(MeasurementUnit u) {
        return MeasurementUnitResponse.builder()
                .id(u.getId())
                .code(u.getCode())
                .name(u.getName())
                .isActive(u.getIsActive())
                .createdAt(u.getCreatedAt())
                .build();
    }
}
