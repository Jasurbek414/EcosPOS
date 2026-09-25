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

/// Joriy foydalanuvchi ishlaydigan filial — MANAGER/CASHIER uchun backend o'zi
/// biladigan o'z filiali, OWNER uchun esa kompaniyaning birinchi (yagona) filiali
/// avtomatik ishlatiladi (foydalanuvchiga tanlatilmaydi).
final selectedBranchIdProvider = Provider<int?>((ref) {
  final session = ref.watch(authControllerProvider).session;
  if (session?.branchId != null) return session!.branchId;
  final branches = ref.watch(branchesProvider).valueOrNull;
  return branches != null && branches.isNotEmpty ? branches.first.id : null;
});

/// Filiallar ro'yxatini yuklab bo'lmadimi.
///
/// Busiz `selectedBranchIdProvider` xato holatida ham, yuklanish holatida ham
/// bir xil `null` qaytaradi va ekranlar farqni bilmay abadiy spinner ko'rsatadi —
/// foydalanuvchida na sabab, na chiqish yo'li qoladi.
final branchLoadFailedProvider = Provider<bool>((ref) {
  final session = ref.watch(authControllerProvider).session;
  if (session?.branchId != null) return false;
  final branches = ref.watch(branchesProvider);
  return branches.hasError || (branches.valueOrNull?.isEmpty ?? false);
});
