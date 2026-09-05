package uz.savdo.dto.company;

import lombok.Builder;
import lombok.Data;
import uz.savdo.platform.entity.Company;

/**
 * GET /api/v1/company/info javobi — istalgan autentifikatsiyalangan tenant foydalanuvchisi
 * (OWNER/MANAGER/CASHIER) uchun ochiq, faqat cheklarda/kvitansiyalarda ko'rsatiladigan
 * minimal biznes brendlash ma'lumotlari. DIQQAT: id/slug/plan ATAYLAB kiritilmagan —
 * to'liq profil faqat OWNER uchun GET /api/v1/company orqali ko'rinadi.
 */
@Data
@Builder
public class CompanyInfoResponse {
    private String name;
    private String address;
    private String phone;
    private String logoUrl;
    private String receiptPaperWidth;
    private String receiptFooterText;
    private Boolean receiptShowLogo;
    private Boolean receiptShowCashierName;
    private Boolean receiptAutoPrint;
    private String receiptHeaderText;
    private Boolean receiptShowBranchName;
    private String receiptCurrencyLabel;

    public static CompanyInfoResponse from(Company c) {
        return CompanyInfoResponse.builder()
                .name(c.getName())
                .address(c.getAddress())
                .phone(c.getPhone())
                .logoUrl(c.getLogoUrl())
                .receiptPaperWidth(c.getReceiptPaperWidth())
                .receiptFooterText(c.getReceiptFooterText())
                .receiptShowLogo(c.getReceiptShowLogo())
                .receiptShowCashierName(c.getReceiptShowCashierName())
                .receiptAutoPrint(c.getReceiptAutoPrint())
                .receiptHeaderText(c.getReceiptHeaderText())
                .receiptShowBranchName(c.getReceiptShowBranchName())
                .receiptCurrencyLabel(c.getReceiptCurrencyLabel())
                .build();
    }
}
