import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/auth_controller.dart';
import '../models/models.dart';
import 'providers.dart';

/// Kompaniyaning barcha filiallari — OWNER uchun filial tanlagichni to'ldirish uchun
/// ishlatiladi. Boshqa rollarga ham ochiq endpoint, lekin ular uchun kerak emas.
final branchesProvider = FutureProvider<List<Branch>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<List<dynamic>>('/branches');
  return (res.data ?? []).map((e) => Branch.fromJson(e as Map<String, dynamic>)).toList();
});

/// OWNER uchun "hozir qaysi filial bilan ishlayapman" umumiy holati — Qoldiqlar,
/// Skanerlash va Savdolar ekranlari orasida bir xil tanlov saqlanib turishi uchun
/// bitta joyda umumlashtirilgan (backend har biriga branchId talab qiladi, chunki
/// OWNER bir nechta filialga ega bo'lishi mumkin). MANAGER/CASHIER uchun bu shart
/// emas — backend ularning o'z filialini avtomatik biladi.
final selectedBranchIdProvider = StateProvider<int?>((ref) {
  final session = ref.watch(authControllerProvider).session;
  return session?.branchId;
});
