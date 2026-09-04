package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.product.ProductRequest;
import uz.savdo.dto.product.ProductResponse;
import uz.savdo.entity.Product;
import uz.savdo.exception.BadRequestException;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.ProductRepository;
import uz.savdo.security.CurrentUserService;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Mahsulot katalogi. Barcha autentifikatsiyalangan foydalanuvchilar ko'ra oladi;
 * yozish (POST/PUT/DELETE) faqat OWNER/MANAGER uchun (assertCanManageCatalog).
 */
@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductRepository productRepository;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<ProductResponse> list(@RequestParam(required = false) Long categoryId,
                                       @RequestParam(required = false) String search,
                                       @RequestParam(required = false) String barcode) {
        return productRepository.search(categoryId, search, barcode).stream()
                .map(ProductResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public ProductResponse get(@PathVariable Long id) {
        Product product = productRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mahsulot topilmadi: " + id));
        return ProductResponse.from(product);
    }

    /** POS ekranida shtrix-kod skanerlab mahsulotni topish uchun. */
    @GetMapping("/barcode/{barcode}")
    public ProductResponse getByBarcode(@PathVariable String barcode) {
        Product product = productRepository.findByBarcodeAndIsDeletedFalse(barcode)
                .filter(Product::getIsActive)
                .orElseThrow(() -> new ResourceNotFoundException("Mahsulot topilmadi: " + barcode));
        return ProductResponse.from(product);
    }

    @PostMapping
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductRequest request) {
        currentUserService.assertCanManageCatalog();
        validateBarcodeUnique(request.getBarcode(), null);

        Product product = Product.builder()
                .categoryId(request.getCategoryId())
                .name(request.getName())
                .barcode(normalizeBarcode(request.getBarcode()))
                .unit(request.getUnit())
                .costPrice(request.getCostPrice())
                .salePrice(request.getSalePrice())
                .minStockLevel(request.getMinStockLevel())
                .imageUrl(request.getImageUrl())
                .isActive(true)
                .build();
        product = productRepository.save(product);

        return ResponseEntity.ok(ProductResponse.from(product));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        currentUserService.assertCanManageCatalog();

        Product product = productRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mahsulot topilmadi: " + id));
        validateBarcodeUnique(request.getBarcode(), id);

        product.setCategoryId(request.getCategoryId());
        product.setName(request.getName());
        product.setBarcode(normalizeBarcode(request.getBarcode()));
        product.setUnit(request.getUnit());
        product.setCostPrice(request.getCostPrice());
        product.setSalePrice(request.getSalePrice());
        product.setMinStockLevel(request.getMinStockLevel());
        product.setImageUrl(request.getImageUrl());
        product = productRepository.save(product);

        return ResponseEntity.ok(ProductResponse.from(product));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        currentUserService.assertCanManageCatalog();

        Product product = productRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mahsulot topilmadi: " + id));
        product.setIsDeleted(true);
        product.setDeletedAt(LocalDateTime.now());
        productRepository.save(product);

        return ResponseEntity.noContent().build();
    }

    private String normalizeBarcode(String barcode) {
        return (barcode == null || barcode.isBlank()) ? null : barcode.trim();
    }

    private void validateBarcodeUnique(String barcode, Long excludingId) {
        String normalized = normalizeBarcode(barcode);
        if (normalized == null) {
            return;
        }
        productRepository.findByBarcodeAndIsDeletedFalse(normalized).ifPresent(existing -> {
            if (excludingId == null || !existing.getId().equals(excludingId)) {
                throw new BadRequestException("Bu shtrix-kod allaqachon band: " + normalized);
            }
        });
    }
}
