import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../models/models.dart';

/// Barcha mahsulotlar ro'yxati
final productsListProvider = FutureProvider.autoDispose.family<List<Product>, String?>((ref, search) async {
  final api = ref.watch(apiClientProvider);
  final params = <String, dynamic>{};
  if (search != null && search.trim().isNotEmpty) {
    params['search'] = search.trim();
  }
  final res = await api.get<List<dynamic>>('/products', queryParameters: params);
  return (res.data ?? []).map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
});

/// Kategoriyalar
final categoriesProvider = FutureProvider.autoDispose<List<Category>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<List<dynamic>>('/categories');
  return (res.data ?? []).map((e) => Category.fromJson(e as Map<String, dynamic>)).toList();
});

/// O'lchov birliklari
final measurementUnitsProvider = FutureProvider.autoDispose<List<MeasurementUnit>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<List<dynamic>>('/measurement-units');
  return (res.data ?? []).map((e) => MeasurementUnit.fromJson(e as Map<String, dynamic>)).toList();
});

/// Yetkazib beruvchilar
final suppliersProvider = FutureProvider.autoDispose<List<Supplier>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<List<dynamic>>('/suppliers');
  return (res.data ?? []).map((e) => Supplier.fromJson(e as Map<String, dynamic>)).toList();
});

/// Kirim hujjatlari (Prixodlar)
final goodsReceiptsProvider = FutureProvider.autoDispose.family<List<GoodsReceiptSummary>, int?>((ref, branchId) async {
  final api = ref.watch(apiClientProvider);
  final params = <String, dynamic>{};
  if (branchId != null) params['branchId'] = branchId;
  final res = await api.get<List<dynamic>>('/goods-receipts', queryParameters: params);
  return (res.data ?? []).map((e) => GoodsReceiptSummary.fromJson(e as Map<String, dynamic>)).toList();
});
