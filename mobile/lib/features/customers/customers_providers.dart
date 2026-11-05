import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../models/models.dart';

/// Barcha mijozlar
final customersListProvider = FutureProvider.autoDispose.family<List<Customer>, String?>((ref, search) async {
  final api = ref.watch(apiClientProvider);
  final params = <String, dynamic>{};
  if (search != null && search.trim().isNotEmpty) {
    params['search'] = search.trim();
  }
  final res = await api.get<List<dynamic>>('/customers', queryParameters: params);
  return (res.data ?? []).map((e) => Customer.fromJson(e as Map<String, dynamic>)).toList();
});

/// Qarzdor mijozlar balansi
final customerBalancesProvider = FutureProvider.autoDispose<List<CustomerBalance>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<List<dynamic>>('/customer-debts/balances');
  final list = (res.data ?? []).map((e) => CustomerBalance.fromJson(e as Map<String, dynamic>)).toList();
  // Faqat qarzi borlarni (balans > 0) yuqoriga chiqarish
  return list.where((b) => b.balance > 0).toList();
});

/// Bitta mijozning qarz tranzaksiyalari tarixi
final customerTransactionsProvider = FutureProvider.autoDispose.family<List<CustomerDebtTransaction>, int>((ref, customerId) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<List<dynamic>>('/customer-debts', queryParameters: {'customerId': customerId});
  return (res.data ?? []).map((e) => CustomerDebtTransaction.fromJson(e as Map<String, dynamic>)).toList();
});
