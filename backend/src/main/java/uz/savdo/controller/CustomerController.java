package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.customer.CustomerRequest;
import uz.savdo.dto.customer.CustomerResponse;
import uz.savdo.entity.Customer;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.CustomerRepository;
import uz.savdo.security.CurrentUserService;

import java.util.List;

/**
 * Mijozlar (nasiya savdo uchun) — kompaniya bo'ylab umumiy, filialga bog'lanmagan.
 * Yaratish istalgan autentifikatsiyalangan foydalanuvchi uchun ochiq (CASHIER ham —
 * checkout paytida tezkor qo'shish real ehtiyoj), lekin tahrirlash/deaktivatsiya
 * faqat OWNER/MANAGER (qarang: CurrentUserService#assertCanManageCustomerInfo).
 * Hard delete YO'Q — deaktivatsiya (soft) barcha boshqa entity'lar bilan bir xil.
 */
@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerRepository customerRepository;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<CustomerResponse> list() {
        return customerRepository.findAllByIsDeletedFalseOrderByIdAsc().stream()
                .map(CustomerResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public CustomerResponse get(@PathVariable Long id) {
        Customer customer = customerRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz topilmadi: " + id));
        return CustomerResponse.from(customer);
    }

    @PostMapping
    public ResponseEntity<CustomerResponse> create(@Valid @RequestBody CustomerRequest request) {
        Customer customer = Customer.builder()
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .address(request.getAddress())
                .note(request.getNote())
                // Standart holat NULL = chegarasiz, shuning uchun chegara belgilash
                // huquqni kengaytirmaydi — faqat toraytiradi.
                .creditLimit(request.getCreditLimit())
                .isActive(true)
                .build();
        customer = customerRepository.save(customer);
        return ResponseEntity.ok(CustomerResponse.from(customer));
    }

    @PutMapping("/{id}")
    public CustomerResponse update(@PathVariable Long id, @Valid @RequestBody CustomerRequest request) {
        currentUserService.assertCanManageCustomerInfo();
        Customer customer = customerRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz topilmadi: " + id));

        customer.setFullName(request.getFullName());
        customer.setPhone(request.getPhone());
        customer.setAddress(request.getAddress());
        customer.setNote(request.getNote());
        customer.setCreditLimit(request.getCreditLimit());
        customer = customerRepository.save(customer);

        return CustomerResponse.from(customer);
    }

    @PatchMapping("/{id}/activate")
    public CustomerResponse activate(@PathVariable Long id) {
        currentUserService.assertCanManageCustomerInfo();
        Customer customer = customerRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz topilmadi: " + id));
        customer.setIsActive(true);
        customer = customerRepository.save(customer);
        return CustomerResponse.from(customer);
    }

    /** Mijozni "o'chirish" — mahsulot/xodim kabi hard delete emas, faqat deaktivatsiya. */
    @PatchMapping("/{id}/deactivate")
    public CustomerResponse deactivate(@PathVariable Long id) {
        currentUserService.assertCanManageCustomerInfo();
        Customer customer = customerRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz topilmadi: " + id));
        customer.setIsActive(false);
        customer = customerRepository.save(customer);
        return CustomerResponse.from(customer);
    }
}
