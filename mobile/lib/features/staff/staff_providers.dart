import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../models/models.dart';

final staffListProvider = FutureProvider.autoDispose<List<UserStaff>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<List<dynamic>>('/users');
  return (res.data ?? []).map((e) => UserStaff.fromJson(e as Map<String, dynamic>)).toList();
});

class StaffRepository {
  StaffRepository(this._api);
  final dynamic _api;

  Future<UserStaff> createUser({
    required String username,
    required String password,
    required String fullName,
    required String role,
    int? branchId,
    double? baseSalary,
  }) async {
    final res = await _api.post('/users', data: {
      'username': username,
      'password': password,
      'fullName': fullName,
      'role': role,
      'branchId': role == 'OWNER' ? null : branchId,
      'baseSalary': baseSalary,
    });
    return UserStaff.fromJson(res.data as Map<String, dynamic>);
  }

  Future<UserStaff> updateUser({
    required int id,
    required String fullName,
    required String role,
    int? branchId,
    double? baseSalary,
    required bool isActive,
  }) async {
    final res = await _api.put('/users/$id', data: {
      'fullName': fullName,
      'role': role,
      'branchId': role == 'OWNER' ? null : branchId,
      'baseSalary': baseSalary,
      'isActive': isActive,
    });
    return UserStaff.fromJson(res.data as Map<String, dynamic>);
  }

  Future<String> resetPassword(int id) async {
    final res = await _api.post('/users/$id/reset-password');
    return (res.data?['newPassword'] as String?) ?? 'Yangi parol o\'rnatildi';
  }

  Future<void> deleteUser(int id) async {
    await _api.delete('/users/$id');
  }
}

final staffRepositoryProvider = Provider<StaffRepository>((ref) {
  return StaffRepository(ref.watch(apiClientProvider));
});
