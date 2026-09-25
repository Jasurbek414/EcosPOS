package uz.savdo.dto.customer;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.Customer;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class CustomerResponse {
    private Long id;
    private String fullName;
    private String phone;
    private String address;
    private String note;
    private Boolean isActive;
    private BigDecimal creditLimit;
    private LocalDateTime createdAt;

    public static CustomerResponse from(Customer c) {
        return CustomerResponse.builder()
                .id(c.getId())
                .fullName(c.getFullName())
                .phone(c.getPhone())
                .address(c.getAddress())
                .note(c.getNote())
                .isActive(c.getIsActive())
                .creditLimit(c.getCreditLimit())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
