package uz.savdo.dto.supplier;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.Supplier;

import java.time.LocalDateTime;

@Data
@Builder
public class SupplierResponse {
    private Long id;
    private String name;
    private String phone;
    private String address;
    private String contactPerson;
    private String email;
    private Boolean isActive;
    private LocalDateTime createdAt;

    public static SupplierResponse from(Supplier s) {
        return SupplierResponse.builder()
                .id(s.getId())
                .name(s.getName())
                .phone(s.getPhone())
                .address(s.getAddress())
                .contactPerson(s.getContactPerson())
                .email(s.getEmail())
                .isActive(s.getIsActive())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
