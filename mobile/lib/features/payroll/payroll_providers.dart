import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../models/models.dart';

final salaryPaymentsProvider = FutureProvider.autoDispose<List<SalaryPaymentItem>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<List<dynamic>>('/salary-payments');
  return (res.data ?? []).map((e) => SalaryPaymentItem.fromJson(e as Map<String, dynamic>)).toList();
});

class PayrollRepository {
  PayrollRepository(this._api);
  final dynamic _api;

  Future<SalaryPaymentItem> createPayment({
    required int userId,
    required double amount,
    required String periodMonth,
    required String paymentDate,
    String? note,
  }) async {
    final res = await _api.post('/salary-payments', data: {
      'userId': userId,
      'amount': amount,
      'periodMonth': periodMonth,
      'paymentDate': paymentDate,
      'note': note,
    });
    return SalaryPaymentItem.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> deletePayment(int id) async {
    await _api.delete('/salary-payments/$id');
  }
}

final payrollRepositoryProvider = Provider<PayrollRepository>((ref) {
  return PayrollRepository(ref.watch(apiClientProvider));
});
