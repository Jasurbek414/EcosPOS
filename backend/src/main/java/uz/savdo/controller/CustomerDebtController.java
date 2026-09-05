package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.customerdebt.CustomerBalanceResponse;
import uz.savdo.dto.customerdebt.DebtTransactionRequest;
import uz.savdo.dto.customerdebt.DebtTransactionResponse;
import uz.savdo.entity.Customer;
import uz.savdo.entity.CustomerDebtTransaction;
import uz.savdo.enums.DebtTransactionType;
import uz.savdo.exception.BadRequestException;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.CustomerDebtTransactionRepository;
import uz.savdo.repository.CustomerRepository;
import uz.savdo.security.CurrentUserService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Mijoz qarz (nasiya) tranzaksiyalari kitobi — CREDIT_SALE faqat SaleService orqali
 * avtomatik yaratiladi (bu yerdan client to'g'ridan-to'g'ri yarata olmaydi). PAYMENT
 * istalgan autentifikatsiyalangan foydalanuvchi tomonidan (kassir mijozdan naqd qarz
 * to'lovini qabul qilishi oddiy holat), WRITE_OFF esa faqat OWNER (moliyaviy qaror).
 * Balans hisoblash SQL GROUP BY'siz, Java'da: SUM(CREDIT_SALE) - SUM(PAYMENT) -
 * SUM(WRITE_OFF) — EmployeeAdvanceController#balances bilan bir xil naqsh.
 */
@RestController
@RequestMapping("/api/v1/customer-debts")
@RequiredArgsConstructor
public class CustomerDebtController {

    private final CustomerDebtTransactionRepository debtTransactionRepository;
    private final CustomerRepository customerRepository;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<DebtTransactionResponse> list(@RequestParam(required = false) Long customerId,
                                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        // Bitta mijozga cheklangan so'rov (customerId berilgan) — kassir shu mijozdan
        // to'lov qabul qilishdan oldin uning tarixini ko'rishi tabiiy, shuning uchun
        // hammaga ochiq. Lekin customerId berilmasa — bu KOMPANIYA BO'YLAB TO'LIQ qarz
        // daftari (barcha mijozlarning summasi/izohi) — bu moliyaviy hisobot darajasidagi
        // ma'lumot, faqat OWNER/MANAGER ko'rishi kerak (ExpenseController/
        // SalaryPaymentController/EmployeeAdvanceController bilan bir xil qoida).
        if (customerId == null) {
            currentUserService.assertCanViewReports();
        }

        List<CustomerDebtTransaction> transactions = debtTransactionRepository.findAllByIsDeletedFalse();

        List<CustomerDebtTransaction> filtered = transactions.stream()
                .filter(t -> customerId == null || customerId.equals(t.getCustomerId()))
                .filter(t -> from == null || !t.getTransactionDate().isBefore(from))
                .filter(t -> to == null || !t.getTransactionDate().isAfter(to))
                .toList();

        Map<Long, Customer> customersById = customerRepository.findAllById(
                        filtered.stream().map(CustomerDebtTransaction::getCustomerId).distinct().toList())
                .stream().collect(Collectors.toMap(Customer::getId, Function.identity()));

        return filtered.stream()
                .map(t -> DebtTransactionResponse.from(t, resolveFullName(customersById, t.getCustomerId())))
                .toList();
    }

    @GetMapping("/balances")
    public List<CustomerBalanceResponse> balances(@RequestParam(required = false) Long customerId) {
        // list() dagi bilan bir xil qoida: bitta mijoz balansi — hammaga; hammasi
        // birdaniga (kompaniya bo'ylab qarzdorlik ro'yxati) — faqat OWNER/MANAGER.
        if (customerId == null) {
            currentUserService.assertCanViewReports();
        }

        List<Customer> customers;
        if (customerId != null) {
            Customer customer = customerRepository.findByIdAndIsDeletedFalse(customerId)
                    .orElseThrow(() -> new ResourceNotFoundException("Mijoz topilmadi: " + customerId));
            customers = Boolean.TRUE.equals(customer.getIsActive()) ? List.of(customer) : List.of();
        } else {
            customers = customerRepository.findAllByIsDeletedFalseAndIsActiveTrueOrderByIdAsc();
        }

        List<Long> customerIds = customers.stream().map(Customer::getId).toList();
        List<CustomerDebtTransaction> transactions = customerIds.isEmpty()
                ? List.of()
                : debtTransactionRepository.findAllByCustomerIdInAndIsDeletedFalse(customerIds);

        Map<Long, BigDecimal> balanceByCustomerId = transactions.stream()
                .collect(Collectors.groupingBy(CustomerDebtTransaction::getCustomerId, Collectors.reducing(
                        BigDecimal.ZERO,
                        t -> switch (t.getType()) {
                            case CREDIT_SALE -> t.getAmount();
                            case PAYMENT, WRITE_OFF -> t.getAmount().negate();
                        },
                        BigDecimal::add)));

        return customers.stream()
                .map(c -> CustomerBalanceResponse.builder()
                        .customerId(c.getId())
                        .customerFullName(c.getFullName())
                        .balance(balanceByCustomerId.getOrDefault(c.getId(), BigDecimal.ZERO))
                        .build())
                .toList();
    }

    @PostMapping
    public ResponseEntity<DebtTransactionResponse> create(@Valid @RequestBody DebtTransactionRequest request) {
        if (request.getType() == DebtTransactionType.CREDIT_SALE) {
            throw new BadRequestException("Bu turdagi tranzaksiya faqat savdo orqali avtomatik yaratiladi");
        }
        if (request.getType() == DebtTransactionType.WRITE_OFF) {
            currentUserService.assertIsOwner();
        }

        Customer customer = customerRepository.findByIdAndIsDeletedFalse(request.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz topilmadi: " + request.getCustomerId()));

        CustomerDebtTransaction transaction = CustomerDebtTransaction.builder()
                .customerId(customer.getId())
                .branchId(null)
                .type(request.getType())
                .amount(request.getAmount())
                .transactionDate(request.getTransactionDate())
                .note(request.getNote())
                .createdByUserId(currentUserService.getCurrentUser().getId())
                .build();
        transaction = debtTransactionRepository.save(transaction);

        return ResponseEntity.ok(DebtTransactionResponse.from(transaction, customer.getFullName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        currentUserService.assertIsOwner();

        CustomerDebtTransaction transaction = debtTransactionRepository.findById(id)
                .filter(t -> !Boolean.TRUE.equals(t.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Qarz tranzaksiyasi topilmadi: " + id));
        transaction.setIsDeleted(true);
        transaction.setDeletedAt(LocalDateTime.now());
        debtTransactionRepository.save(transaction);

        return ResponseEntity.noContent().build();
    }

    private String resolveFullName(Map<Long, Customer> customersById, Long customerId) {
        Customer customer = customersById.get(customerId);
        return customer != null ? customer.getFullName() : null;
    }
}
