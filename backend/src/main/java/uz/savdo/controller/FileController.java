package uz.savdo.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import uz.savdo.dto.file.FileUploadResponse;
import uz.savdo.exception.BadRequestException;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.security.CurrentUserService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Mahsulot rasmlarini yuklash/serve qilish. POST /upload — katalogni tahrirlash huquqi
 * (assertCanManageCatalog) talab qiladi, chunki rasm yuklash katalog (Product#imageUrl)
 * amali hisoblanadi. GET /{filename} — ATAYLAB ochiq (SecurityConfig'da faqat shu
 * metod uchun permitAll), chunki <img src> tegi Authorization header biriktira
 * olmaydi; shu sababli filename PATH TRAVERSAL'GA QARSHI qattiq tekshiriladi
 * (bu — hech qanday autentifikatsiyasiz nom bo'yicha ixtiyoriy faylni o'qiydigan
 * ochiq endpoint).
 */
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileController {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;

    private final CurrentUserService currentUserService;

    @Value("${app.upload.dir}")
    private String uploadDir;

    @PostMapping("/upload")
    public ResponseEntity<FileUploadResponse> upload(@RequestParam("file") MultipartFile file) {
        currentUserService.assertCanManageCatalog();

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Fayl bo'sh yoki yuborilmagan");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new BadRequestException("Faqat JPEG, PNG yoki WEBP rasm fayllari qabul qilinadi");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("Fayl hajmi 5MB dan oshmasligi kerak");
        }

        String extension = switch (contentType.toLowerCase()) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> "";
        };
        String filename = UUID.randomUUID() + extension;

        try {
            Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            Path target = dir.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new BadRequestException("Faylni saqlashda xatolik: " + e.getMessage());
        }

        return ResponseEntity.ok(FileUploadResponse.builder().url("/api/v1/files/" + filename).build());
    }

    @GetMapping("/{filename}")
    public ResponseEntity<byte[]> get(@PathVariable String filename) {
        // Path traversal'ga qarshi: hech qanday "..", "/" yoki "\\" belgisi bo'lmasligi
        // shart — bu ochiq (permitAll) endpoint, filesystem'ga to'g'ridan-to'g'ri yo'l
        // qo'yilishi mumkin emas.
        if (filename == null || filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new ResourceNotFoundException("Fayl topilmadi");
        }

        Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path target = dir.resolve(filename).normalize();
        if (!target.startsWith(dir) || !Files.isRegularFile(target)) {
            throw new ResourceNotFoundException("Fayl topilmadi: " + filename);
        }

        byte[] content;
        try {
            content = Files.readAllBytes(target);
        } catch (IOException e) {
            throw new ResourceNotFoundException("Fayl topilmadi: " + filename);
        }

        return ResponseEntity.ok()
                .contentType(resolveMediaType(filename))
                .cacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic())
                .body(content);
    }

    private MediaType resolveMediaType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (lower.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }
        return MediaType.IMAGE_JPEG;
    }
}
