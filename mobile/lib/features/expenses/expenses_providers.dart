import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../models/models.dart';

/// Xarajat toifalari
final expenseCategoriesProvider = FutureProvider.autoDispose<List<ExpenseCategory>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<List<dynamic>>('/expense-categories');
  return (res.data ?? []).map((e) => ExpenseCategory.fromJson(e as Map<String, dynamic>)).toList();
});

/// Barcha xarajatlar ro'yxati
final expensesListProvider = FutureProvider.autoDispose.family<List<Expense>, int?>((ref, branchId) async {
  final api = ref.watch(apiClientProvider);
  final params = <String, dynamic>{};
  if (branchId != null) params['branchId'] = branchId;
  final res = await api.get<List<dynamic>>('/expenses', queryParameters: params);
  return (res.data ?? []).map((e) => Expense.fromJson(e as Map<String, dynamic>)).toList();
});
