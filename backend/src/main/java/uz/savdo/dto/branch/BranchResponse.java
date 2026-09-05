package uz.savdo.dto.branch;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.Branch;

import java.time.LocalDateTime;

@Data
@Builder
public class BranchResponse {
    private Long id;
    private String name;
    private String address;
    private Boolean isActive;
    private String phone;
    private String workingHours;
    private LocalDateTime createdAt;

    public static BranchResponse from(Branch b) {
        return BranchResponse.builder()
                .id(b.getId())
                .name(b.getName())
                .address(b.getAddress())
                .isActive(b.getIsActive())
                .phone(b.getPhone())
                .workingHours(b.getWorkingHours())
                .createdAt(b.getCreatedAt())
                .build();
    }
}
