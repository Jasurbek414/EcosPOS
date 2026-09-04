import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/branch_provider.dart';
import '../../core/providers.dart';
import '../../models/models.dart';
import '../auth/auth_controller.dart';

/// Kam qolgan mahsulotlar ro'yxati. OWNER uchun filial tanlanmaguncha so'rov
/// yuborilmaydi (backend branchId'siz OWNER'ga 400 qaytaradi); MANAGER/CASHIER
/// uchun branchId yubormaymiz — backend ularning o'z filialini avtomatik biladi.
final lowStockProvider = FutureProvider.autoDispose<List<LowStockItem>>((ref) async {
  final session = ref.watch(authControllerProvider).session;
  if (session == null) return [];
  final api = ref.watch(apiClientProvider);

  Map<String, dynamic>? query;
  if (session.isOwner) {
    final branchId = ref.watch(selectedBranchIdProvider);
    if (branchId == null) return [];
    query = {'branchId': branchId};
  }

  final res = await api.get<List<dynamic>>('/stock/low', query: query);
  return (res.data ?? []).map((e) => LowStockItem.fromJson(e as Map<String, dynamic>)).toList();
});

/// Zaxira miqdorini o'zgartirish natijasini alohida holatda saqlamaymiz — chaqiruvchi
/// muvaffaqiyatdan so'ng [lowStockProvider] ni invalidate qiladi.
///
/// [ApiClient] ni to'g'ridan-to'g'ri qabul qiladi (Ref emas) — chunki chaqiruvchilar
/// har xil kontekstdan (ConsumerState'ning WidgetRef'i yoki provider ichidagi Ref)
/// kelishi mumkin va WidgetRef bilan Ref bir-biriga mos tur emas.
Future<StockAdjustmentResult> adjustStock(
  ApiClient api, {
  required int branchId,
  required int productId,
  required double quantityDelta,
  required String reason,
}) async {
  final res = await api.post<Map<String, dynamic>>('/stock/adjustments', data: {
    'branchId': branchId,
    'productId': productId,
    'quantityDelta': quantityDelta,
    'reason': reason,
  });
  return StockAdjustmentResult.fromJson(res.data!);
}
