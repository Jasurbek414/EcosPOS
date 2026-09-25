/// Backend (`savdo-api`) bilan almashiladigan JSON kontraktlarining Dart modellari.
/// Barcha sonlar backendda Integer/BigDecimal bo'lishi mumkin — shuning uchun
/// hamma joyda `num` dan xavfsiz konvertatsiya qilinadi.

double _toDouble(dynamic v) => v == null ? 0.0 : (v as num).toDouble();
int _toInt(dynamic v) => (v as num).toInt();

/// To'liq autentifikatsiya sessiyasi — token'lar + login vaqtida kelgan profil
/// ma'lumotlari + qayta kirish uchun kerak bo'ladigan companyCode (server buni
/// qaytarmaydi, faqat login so'rovida yuboriladi, shuning uchun o'zimiz saqlaymiz).
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

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.unit,
    required this.salePrice,
    required this.costPrice,
    this.minStockLevel,
    this.barcode,
  });

  final int id;
  final String name;
  final String unit;
  final double salePrice;
  final double costPrice;
  final double? minStockLevel;

  /// Kassa ekranidagi qidiruv shtrix-kod bo'yicha ham ishlashi uchun. Backend
  /// ProductResponse buni allaqachon qaytaradi, lekin modelda tushib qolgan edi —
  /// natijada mobil ilova umuman kompilyatsiya bo'lmayotgan edi.
  final String? barcode;

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: _toInt(json['id']),
        name: json['name'] as String,
        unit: (json['unit'] as String?) ?? '',
        salePrice: _toDouble(json['salePrice']),
        costPrice: _toDouble(json['costPrice']),
        minStockLevel: json['minStockLevel'] == null ? null : _toDouble(json['minStockLevel']),
        barcode: json['barcode'] as String?,
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

class SaleSummary {
  const SaleSummary({
    required this.id,
    required this.createdAt,
    required this.cashierName,
    required this.totalAmount,
    required this.paymentMethod,
    required this.itemCount,
  });

  final int id;
  final DateTime createdAt;
  final String cashierName;
  final double totalAmount;
  final String paymentMethod;
  final int itemCount;

  factory SaleSummary.fromJson(Map<String, dynamic> json) => SaleSummary(
        id: _toInt(json['id']),
        createdAt: DateTime.tryParse((json['createdAt'] as String?) ?? '')?.toLocal() ?? DateTime.now(),
        cashierName: (json['cashierName'] as String?) ?? '',
        totalAmount: _toDouble(json['totalAmount']),
        paymentMethod: (json['paymentMethod'] as String?) ?? '',
        itemCount: json['itemCount'] == null ? 0 : _toInt(json['itemCount']),
      );
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

class CartItem {
  const CartItem({required this.product, required this.quantity});

  final Product product;
  final double quantity;

  double get subtotal => product.salePrice * quantity;

  CartItem copyWith({double? quantity}) => CartItem(
        product: product,
        quantity: quantity ?? this.quantity,
      );
}
