/// Backend (`savdo-api`) bilan almashiladigan JSON kontraktlarining Dart modellari.
/// Barcha sonlar backendda Integer/BigDecimal bo'lishi mumkin — shuning uchun
/// hamma joyda `num` dan xavfsiz konvertatsiya qilinadi.

double _toDouble(dynamic v) => v == null ? 0.0 : (v as num).toDouble();
int _toInt(dynamic v) => v == null ? 0 : (v as num).toInt();

/// To'liq autentifikatsiya sessiyasi
class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.username,
    required this.fullName,
    required this.role,
    required this.companyId,
    required this.companyCode,
    this.branchId,
  });

  final String accessToken;
  final String refreshToken;
  final String username;
  final String fullName;
  final String role; // OWNER | MANAGER | CASHIER
  final int companyId;
  final int? branchId;
  final String companyCode;

  bool get isOwner => role == 'OWNER';
  bool get isManager => role == 'OWNER' || role == 'MANAGER';
  bool get isCashier => role == 'CASHIER';

  AuthSession copyWith({
    String? accessToken,
    String? refreshToken,
    String? username,
    String? fullName,
    String? role,
    int? companyId,
    String? companyCode,
    int? branchId,
  }) =>
      AuthSession(
        accessToken: accessToken ?? this.accessToken,
        refreshToken: refreshToken ?? this.refreshToken,
        username: username ?? this.username,
        fullName: fullName ?? this.fullName,
        role: role ?? this.role,
        companyId: companyId ?? this.companyId,
        companyCode: companyCode ?? this.companyCode,
        branchId: branchId ?? this.branchId,
      );

  factory AuthSession.fromLoginJson(Map<String, dynamic> json, {required String companyCode}) => AuthSession(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String,
        username: json['username'] as String,
        fullName: (json['fullName'] as String?) ?? (json['username'] as String),
        role: json['role'] as String,
        companyId: _toInt(json['companyId']),
        branchId: json['branchId'] == null ? null : _toInt(json['branchId']),
        companyCode: companyCode,
      );

  factory AuthSession.fromJson(Map<String, dynamic> json) => AuthSession(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String,
        username: json['username'] as String,
        fullName: json['fullName'] as String,
        role: json['role'] as String,
        companyId: _toInt(json['companyId']),
        branchId: json['branchId'] == null ? null : _toInt(json['branchId']),
        companyCode: json['companyCode'] as String,
      );

  Map<String, dynamic> toJson() => {
        'accessToken': accessToken,
        'refreshToken': refreshToken,
        'username': username,
        'fullName': fullName,
        'role': role,
        'companyId': companyId,
        'branchId': branchId,
        'companyCode': companyCode,
      };

  AuthSession copyWithTokens({required String accessToken, required String refreshToken}) => AuthSession(
        accessToken: accessToken,
        refreshToken: refreshToken,
        username: username,
        fullName: fullName,
        role: role,
        companyId: companyId,
        branchId: branchId,
        companyCode: companyCode,
      );
}

class DashboardStats {
  const DashboardStats({
    required this.todayRevenue,
    required this.todayProfit,
    required this.todaySalesCount,
    required this.monthRevenue,
    required this.monthProfit,
    required this.lowStockCount,
  });

  final double todayRevenue;
  final double todayProfit;
  final int todaySalesCount;
  final double monthRevenue;
  final double monthProfit;
  final int lowStockCount;

  factory DashboardStats.fromJson(Map<String, dynamic> json) => DashboardStats(
        todayRevenue: _toDouble(json['todayRevenue']),
        todayProfit: _toDouble(json['todayProfit']),
        todaySalesCount: json['todaySalesCount'] == null ? 0 : _toInt(json['todaySalesCount']),
        monthRevenue: _toDouble(json['monthRevenue']),
        monthProfit: _toDouble(json['monthProfit']),
        lowStockCount: json['lowStockCount'] == null ? 0 : _toInt(json['lowStockCount']),
      );
}

class Branch {
  const Branch({required this.id, required this.name, this.address, required this.isActive});

  final int id;
  final String name;
  final String? address;
  final bool isActive;

  factory Branch.fromJson(Map<String, dynamic> json) => Branch(
        id: _toInt(json['id']),
        name: json['name'] as String,
        address: json['address'] as String?,
        isActive: (json['isActive'] as bool?) ?? true,
      );
}

class Category {
  const Category({required this.id, required this.name, this.description});

  final int id;
  final String name;
  final String? description;

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: _toInt(json['id']),
        name: (json['name'] as String?) ?? '',
        description: json['description'] as String?,
      );
}

class MeasurementUnit {
  const MeasurementUnit({required this.id, required this.name, required this.shortName});

  final int id;
  final String name;
  final String shortName;

  factory MeasurementUnit.fromJson(Map<String, dynamic> json) => MeasurementUnit(
        id: _toInt(json['id']),
        name: (json['name'] as String?) ?? '',
        shortName: (json['shortName'] as String?) ?? '',
      );
}

class Supplier {
  const Supplier({
    required this.id,
    required this.name,
    this.phone,
    this.address,
    this.contactPerson,
  });

  final int id;
  final String name;
  final String? phone;
  final String? address;
  final String? contactPerson;

  factory Supplier.fromJson(Map<String, dynamic> json) => Supplier(
        id: _toInt(json['id']),
        name: (json['name'] as String?) ?? '',
        phone: json['phone'] as String?,
        address: json['address'] as String?,
        contactPerson: json['contactPerson'] as String?,
      );
}

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.unit,
    required this.salePrice,
    required this.costPrice,
    this.minStockLevel,
    this.barcode,
    this.categoryId,
    this.categoryName,
    this.imageUrl,
    this.quantity,
  });

  final int id;
  final String name;
  final String unit;
  final double salePrice;
  final double costPrice;
  final double? minStockLevel;
  final String? barcode;
  final int? categoryId;
  final String? categoryName;
  final String? imageUrl;
  final double? quantity; // Ombor yoki qoldiq ma'lumoti

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: _toInt(json['id']),
        name: (json['name'] as String?) ?? '',
        unit: (json['unit'] as String?) ?? 'dona',
        salePrice: _toDouble(json['salePrice']),
        costPrice: _toDouble(json['costPrice']),
        minStockLevel: json['minStockLevel'] == null ? null : _toDouble(json['minStockLevel']),
        barcode: json['barcode'] as String?,
        categoryId: json['categoryId'] == null ? null : _toInt(json['categoryId']),
        categoryName: json['categoryName'] as String?,
        imageUrl: json['imageUrl'] as String?,
        quantity: json['quantity'] == null ? null : _toDouble(json['quantity']),
      );

  Map<String, dynamic> toRequestJson() => {
        'name': name,
        'barcode': barcode,
        'unit': unit,
        'costPrice': costPrice,
        'salePrice': salePrice,
        if (minStockLevel != null) 'minStockLevel': minStockLevel,
        if (categoryId != null) 'categoryId': categoryId,
        if (imageUrl != null) 'imageUrl': imageUrl,
      };
}

class LowStockItem {
  const LowStockItem({
    required this.productId,
    required this.productName,
    required this.unit,
    required this.branchId,
    required this.branchName,
    required this.quantity,
    required this.minStockLevel,
  });

  final int productId;
  final String productName;
  final String unit;
  final int branchId;
  final String branchName;
  final double quantity;
  final double minStockLevel;

  factory LowStockItem.fromJson(Map<String, dynamic> json) => LowStockItem(
        productId: _toInt(json['productId']),
        productName: json['productName'] as String,
        unit: (json['unit'] as String?) ?? '',
        branchId: _toInt(json['branchId']),
        branchName: (json['branchName'] as String?) ?? '',
        quantity: _toDouble(json['quantity']),
        minStockLevel: _toDouble(json['minStockLevel']),
      );
}

class StockAdjustmentResult {
  const StockAdjustmentResult({
    required this.productId,
    required this.productName,
    required this.unit,
    required this.branchId,
    required this.quantity,
  });

  final int productId;
  final String productName;
  final String unit;
  final int branchId;
  final double quantity;

  factory StockAdjustmentResult.fromJson(Map<String, dynamic> json) => StockAdjustmentResult(
        productId: _toInt(json['productId']),
        productName: json['productName'] as String,
        unit: (json['unit'] as String?) ?? '',
        branchId: _toInt(json['branchId']),
        quantity: _toDouble(json['quantity']),
      );
}

class StockItem {
  const StockItem({
    required this.productId,
    required this.productName,
    this.barcode,
    required this.unit,
    required this.branchId,
    required this.branchName,
    required this.quantity,
    required this.costPrice,
    required this.salePrice,
    this.minStockLevel,
  });

  final int productId;
  final String productName;
  final String? barcode;
  final String unit;
  final int branchId;
  final String branchName;
  final double quantity;
  final double costPrice;
  final double salePrice;
  final double? minStockLevel;

  factory StockItem.fromJson(Map<String, dynamic> json) => StockItem(
        productId: _toInt(json['productId']),
        productName: (json['productName'] as String?) ?? '',
        barcode: json['barcode'] as String?,
        unit: (json['unit'] as String?) ?? '',
        branchId: _toInt(json['branchId']),
        branchName: (json['branchName'] as String?) ?? '',
        quantity: _toDouble(json['quantity']),
        costPrice: _toDouble(json['costPrice']),
        salePrice: _toDouble(json['salePrice']),
        minStockLevel: json['minStockLevel'] == null ? null : _toDouble(json['minStockLevel']),
      );
}

class Customer {
  const Customer({
    required this.id,
    required this.fullName,
    this.phone,
    this.address,
    this.note,
    this.balance = 0.0,
  });

  final int id;
  final String fullName;
  final String? phone;
  final String? address;
  final String? note;
  final double balance; // Qarz balansi (> 0 bo'lsa qarzdor)

  factory Customer.fromJson(Map<String, dynamic> json) => Customer(
        id: _toInt(json['id']),
        fullName: (json['fullName'] as String?) ?? '',
        phone: json['phone'] as String?,
        address: json['address'] as String?,
        note: json['note'] as String?,
        balance: _toDouble(json['balance'] ?? json['totalDebt']),
      );

  Customer copyWith({double? balance}) => Customer(
        id: id,
        fullName: fullName,
        phone: phone,
        address: address,
        note: note,
        balance: balance ?? this.balance,
      );
}

class CustomerBalance {
  const CustomerBalance({
    required this.customerId,
    required this.customerFullName,
    this.customerPhone,
    required this.balance,
  });

  final int customerId;
  final String customerFullName;
  final String? customerPhone;
  final double balance;

  factory CustomerBalance.fromJson(Map<String, dynamic> json) => CustomerBalance(
        customerId: _toInt(json['customerId']),
        customerFullName: (json['customerFullName'] as String?) ?? '',
        customerPhone: json['customerPhone'] as String?,
        balance: _toDouble(json['balance']),
      );
}

class CustomerDebtTransaction {
  const CustomerDebtTransaction({
    required this.id,
    required this.customerId,
    required this.customerFullName,
    required this.type, // CREDIT_SALE, PAYMENT, WRITE_OFF
    required this.amount,
    this.paymentMethod,
    required this.transactionDate,
    this.note,
  });

  final int id;
  final int customerId;
  final String customerFullName;
  final String type;
  final double amount;
  final String? paymentMethod;
  final DateTime transactionDate;
  final String? note;

  factory CustomerDebtTransaction.fromJson(Map<String, dynamic> json) => CustomerDebtTransaction(
        id: _toInt(json['id']),
        customerId: _toInt(json['customerId']),
        customerFullName: (json['customerFullName'] as String?) ?? '',
        type: (json['type'] as String?) ?? '',
        amount: _toDouble(json['amount']),
        paymentMethod: json['paymentMethod'] as String?,
        transactionDate: DateTime.tryParse((json['transactionDate'] as String?) ?? '') ?? DateTime.now(),
        note: json['note'] as String?,
      );
}

class ExpenseCategory {
  const ExpenseCategory({required this.id, required this.name, this.code = ''});

  final int id;
  final String name;
  final String code;

  factory ExpenseCategory.fromJson(Map<String, dynamic> json) => ExpenseCategory(
        id: _toInt(json['id']),
        name: (json['name'] as String?) ?? '',
        code: (json['code'] as String?) ?? '',
      );
}

class Expense {
  const Expense({
    required this.id,
    this.branchId,
    this.branchName,
    required this.category,
    required this.amount,
    required this.paymentMethod,
    required this.expenseDate,
    this.note,
    this.createdByName,
  });

  final int id;
  final int? branchId;
  final String? branchName;
  final String category;
  final double amount;
  final String paymentMethod;
  final DateTime expenseDate;
  final String? note;
  final String? createdByName;

  factory Expense.fromJson(Map<String, dynamic> json) => Expense(
        id: _toInt(json['id']),
        branchId: json['branchId'] == null ? null : _toInt(json['branchId']),
        branchName: json['branchName'] as String?,
        category: (json['category'] as String?) ?? '',
        amount: _toDouble(json['amount']),
        paymentMethod: (json['paymentMethod'] as String?) ?? 'CASH',
        expenseDate: DateTime.tryParse((json['expenseDate'] as String?) ?? '') ?? DateTime.now(),
        note: json['note'] as String?,
        createdByName: json['createdByName'] as String?,
      );
}

class GoodsReceiptSummary {
  const GoodsReceiptSummary({
    required this.id,
    required this.receiptNumber,
    required this.supplierName,
    required this.receiptDate,
    required this.totalAmount,
    required this.itemCount,
    required this.status,
  });

  final int id;
  final String receiptNumber;
  final String supplierName;
  final DateTime receiptDate;
  final double totalAmount;
  final int itemCount;
  final String status;

  factory GoodsReceiptSummary.fromJson(Map<String, dynamic> json) => GoodsReceiptSummary(
        id: _toInt(json['id']),
        receiptNumber: (json['receiptNumber'] as String?) ?? '',
        supplierName: (json['supplierName'] as String?) ?? '',
        receiptDate: DateTime.tryParse((json['receiptDate'] as String?) ?? '') ?? DateTime.now(),
        totalAmount: _toDouble(json['totalAmount']),
        itemCount: _toInt(json['itemCount']),
        status: (json['status'] as String?) ?? 'DRAFT',
      );
}

class GoodsReceiptItemRequest {
  const GoodsReceiptItemRequest({
    required this.productId,
    required this.quantity,
    required this.costPrice,
  });

  final int productId;
  final double quantity;
  final double costPrice;

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'quantity': quantity,
        'costPrice': costPrice,
      };
}

class CashShift {
  const CashShift({
    required this.id,
    required this.branchId,
    required this.cashierId,
    required this.cashierName,
    required this.openedAt,
    this.closedAt,
    required this.openingCash,
    this.closingCash,
    this.expectedCash,
    this.cashDifference,
    required this.status,
    this.note,
  });

  final int id;
  final int branchId;
  final int cashierId;
  final String cashierName;
  final DateTime openedAt;
  final DateTime? closedAt;
  final double openingCash;
  final double? closingCash;
  final double? expectedCash;
  final double? cashDifference;
  final String status;
  final String? note;

  bool get isOpen => status == 'OPEN';

  factory CashShift.fromJson(Map<String, dynamic> json) => CashShift(
        id: _toInt(json['id']),
        branchId: _toInt(json['branchId']),
        cashierId: _toInt(json['cashierId']),
        cashierName: (json['cashierName'] as String?) ?? '',
        openedAt: DateTime.tryParse((json['openedAt'] as String?) ?? '')?.toLocal() ?? DateTime.now(),
        closedAt: json['closedAt'] == null ? null : DateTime.tryParse(json['closedAt'] as String)?.toLocal(),
        openingCash: _toDouble(json['openingCash']),
        closingCash: json['closingCash'] == null ? null : _toDouble(json['closingCash']),
        expectedCash: json['expectedCash'] == null ? null : _toDouble(json['expectedCash']),
        cashDifference: json['cashDifference'] == null ? null : _toDouble(json['cashDifference']),
        status: (json['status'] as String?) ?? 'OPEN',
        note: json['note'] as String?,
      );
}

class SaleSummary {
  const SaleSummary({
    required this.id,
    required this.createdAt,
    required this.cashierName,
    required this.totalAmount,
    required this.paymentMethod,
    required this.itemCount,
    this.customerName,
  });

  final int id;
  final DateTime createdAt;
  final String cashierName;
  final double totalAmount;
  final String paymentMethod;
  final int itemCount;
  final String? customerName;

  factory SaleSummary.fromJson(Map<String, dynamic> json) => SaleSummary(
        id: _toInt(json['id']),
        createdAt: DateTime.tryParse((json['createdAt'] as String?) ?? '')?.toLocal() ?? DateTime.now(),
        cashierName: (json['cashierName'] as String?) ?? '',
        totalAmount: _toDouble(json['totalAmount']),
        paymentMethod: (json['paymentMethod'] as String?) ?? '',
        itemCount: json['itemCount'] == null ? 0 : _toInt(json['itemCount']),
        customerName: json['customerName'] as String?,
      );
}

class CartItem {
  const CartItem({
    required this.product,
    required this.quantity,
    this.customPrice,
    this.discount = 0.0,
  });

  final Product product;
  final double quantity;
  final double? customPrice;
  final double discount;

  double get price => customPrice ?? product.salePrice;
  double get subtotal => (price * quantity) - discount;

  CartItem copyWith({
    double? quantity,
    double? customPrice,
    double? discount,
  }) =>
      CartItem(
        product: product,
        quantity: quantity ?? this.quantity,
        customPrice: customPrice ?? this.customPrice,
        discount: discount ?? this.discount,
      );
}

class UserStaff {
  const UserStaff({
    required this.id,
    required this.username,
    required this.fullName,
    required this.role,
    this.branchId,
    this.branchName,
    this.phone,
    this.baseSalary,
    required this.isActive,
  });

  final int id;
  final String username;
  final String fullName;
  final String role;
  final int? branchId;
  final String? branchName;
  final String? phone;
  final double? baseSalary;
  final bool isActive;

  factory UserStaff.fromJson(Map<String, dynamic> json) => UserStaff(
        id: _toInt(json['id']),
        username: (json['username'] as String?) ?? '',
        fullName: (json['fullName'] as String?) ?? '',
        role: (json['role'] as String?) ?? '',
        branchId: json['branchId'] == null ? null : _toInt(json['branchId']),
        branchName: json['branchName'] as String?,
        phone: json['phone'] as String?,
        baseSalary: (json['baseSalary'] as num?)?.toDouble(),
        isActive: (json['isActive'] as bool?) ?? true,
      );
}

class CompanyProfile {
  const CompanyProfile({
    required this.id,
    required this.name,
    required this.slug,
    this.address,
    this.phone,
    this.logoUrl,
    this.receiptPaperWidth = '80mm',
    this.receiptHeaderText,
    this.receiptFooterText,
    this.receiptShowLogo = true,
    this.receiptShowCashierName = true,
    this.receiptShowBranchName = true,
    this.receiptAutoPrint = false,
    this.receiptCurrencyLabel = 'so\'m',
    this.creditSalesEnabled = false,
    this.planName,
  });

  final int id;
  final String name;
  final String slug;
  final String? address;
  final String? phone;
  final String? logoUrl;
  final String receiptPaperWidth;
  final String? receiptHeaderText;
  final String? receiptFooterText;
  final bool receiptShowLogo;
  final bool receiptShowCashierName;
  final bool receiptShowBranchName;
  final bool receiptAutoPrint;
  final String receiptCurrencyLabel;
  final bool creditSalesEnabled;
  final String? planName;

  factory CompanyProfile.fromJson(Map<String, dynamic> json) => CompanyProfile(
        id: _toInt(json['id']),
        name: (json['name'] as String?) ?? '',
        slug: (json['slug'] as String?) ?? '',
        address: json['address'] as String?,
        phone: json['phone'] as String?,
        logoUrl: json['logoUrl'] as String?,
        receiptPaperWidth: (json['receiptPaperWidth'] as String?) ?? '80mm',
        receiptHeaderText: json['receiptHeaderText'] as String?,
        receiptFooterText: json['receiptFooterText'] as String?,
        receiptShowLogo: (json['receiptShowLogo'] as bool?) ?? true,
        receiptShowCashierName: (json['receiptShowCashierName'] as bool?) ?? true,
        receiptShowBranchName: (json['receiptShowBranchName'] as bool?) ?? true,
        receiptAutoPrint: (json['receiptAutoPrint'] as bool?) ?? false,
        receiptCurrencyLabel: (json['receiptCurrencyLabel'] as String?) ?? 'so\'m',
        creditSalesEnabled: (json['creditSalesEnabled'] as bool?) ?? false,
        planName: json['planName'] as String?,
      );
}

class SalaryPaymentItem {
  const SalaryPaymentItem({
    required this.id,
    required this.userId,
    this.userFullName,
    this.branchId,
    required this.amount,
    required this.periodMonth,
    required this.paymentDate,
    this.note,
    this.createdAt,
  });

  final int id;
  final int userId;
  final String? userFullName;
  final int? branchId;
  final double amount;
  final String periodMonth;
  final String paymentDate;
  final String? note;
  final String? createdAt;

  factory SalaryPaymentItem.fromJson(Map<String, dynamic> json) => SalaryPaymentItem(
        id: _toInt(json['id']),
        userId: _toInt(json['userId']),
        userFullName: json['userFullName'] as String?,
        branchId: json['branchId'] == null ? null : _toInt(json['branchId']),
        amount: _toDouble(json['amount']),
        periodMonth: (json['periodMonth'] as String?) ?? '',
        paymentDate: (json['paymentDate'] as String?) ?? '',
        note: json['note'] as String?,
        createdAt: json['createdAt'] as String?,
      );
}
