import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/formatters.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_controller.dart';
import 'staff_form_screen.dart';
import 'staff_providers.dart';

class StaffScreen extends ConsumerStatefulWidget {
  const StaffScreen({super.key});

  @override
  ConsumerState<StaffScreen> createState() => _StaffScreenState();
}

class _StaffScreenState extends ConsumerState<StaffScreen> {
  final _searchController = TextEditingController();
  String _search = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Color _roleColor(String role) {
    switch (role) {
      case 'OWNER':
        return AppTheme.primary;
      case 'MANAGER':
        return const Color(0xFF0284C7);
      case 'CASHIER':
        return const Color(0xFF059669);
      default:
        return AppTheme.muted;
    }
  }

  String _roleLabel(String role) {
    switch (role) {
      case 'OWNER':
        return 'Do\'kon egasi';
      case 'MANAGER':
        return 'Menejer';
      case 'CASHIER':
        return 'Kassir';
      default:
        return role;
    }
  }

  Future<void> _resetPassword(UserStaff user) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Parolni tiklash'),
        content: Text('${user.fullName} (${user.username}) uchun yangi parol generatsiya qilinsinmi?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Bekor qilish')),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Ha, tiklash')),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      final newPass = await ref.read(staffRepositoryProvider).resetPassword(user.id);
      if (!mounted) return;
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Yangi parol'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${user.fullName} uchun vaqtinchalik yangi parol:'),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.background,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Row(
                  children: [
                    SelectableText(
                      newPass,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primary),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.copy, size: 20),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: newPass));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Parol nusxalandi')),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            FilledButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Tushunarli')),
          ],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Xatolik: $e'), backgroundColor: AppTheme.danger),
      );
    }
  }

  Future<void> _deleteUser(UserStaff user) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xodimni o\'chirish'),
        content: Text('${user.fullName} xodimini tizimdan o\'chirmoqchimisiz?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Bekor qilish')),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppTheme.danger),
            child: const Text('O\'chirish'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await ref.read(staffRepositoryProvider).deleteUser(user.id);
      ref.invalidate(staffListProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Xodim o\'chirildi')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Xatolik: $e'), backgroundColor: AppTheme.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final staffAsync = ref.watch(staffListProvider);
    final isOwner = ref.watch(authControllerProvider).isOwner;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Xodimlar Boshqaruvi'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(staffListProvider),
          ),
        ],
      ),
      floatingActionButton: isOwner
          ? FloatingActionButton.extended(
              onPressed: () {
                Navigator.of(context).push(MaterialPageRoute(builder: (_) => const StaffFormScreen()));
              },
              icon: const Icon(Icons.person_add),
              label: const Text('Yangi xodim'),
            )
          : null,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Xodim nomi yoki login bo\'yicha qidiruv...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _search.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _search = '');
                        },
                      )
                    : null,
              ),
              onChanged: (v) => setState(() => _search = v.trim().toLowerCase()),
            ),
          ),
          Expanded(
            child: staffAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
                      const SizedBox(height: 12),
                      Text('Yuklab bo\'lmadi: $e', textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: () => ref.invalidate(staffListProvider),
                        child: const Text('Qayta urinish'),
                      ),
                    ],
                  ),
                ),
              ),
              data: (users) {
                final filtered = users.where((u) {
                  if (_search.isEmpty) return true;
                  return u.fullName.toLowerCase().contains(_search) ||
                      u.username.toLowerCase().contains(_search) ||
                      (u.branchName?.toLowerCase().contains(_search) ?? false);
                }).toList();

                if (filtered.isEmpty) {
                  return const Center(child: Text('Xodimlar topilmadi'));
                }

                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, i) {
                    final u = filtered[i];
                    final color = _roleColor(u.role);

                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 20,
                                backgroundColor: color.withOpacity(0.12),
                                child: Text(
                                  u.fullName.isNotEmpty ? u.fullName[0].toUpperCase() : '?',
                                  style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 18),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      u.fullName,
                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                                    ),
                                    const SizedBox(height: 2),
                                    Text('@${u.username}', style: const TextStyle(fontSize: 12, color: AppTheme.muted)),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: color.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  _roleLabel(u.role),
                                  style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                              ),
                              if (isOwner)
                                PopupMenuButton<String>(
                                  icon: const Icon(Icons.more_vert, color: AppTheme.muted, size: 20),
                                  onSelected: (val) {
                                    if (val == 'edit') {
                                      Navigator.of(context).push(MaterialPageRoute(builder: (_) => StaffFormScreen(user: u)));
                                    } else if (val == 'reset') {
                                      _resetPassword(u);
                                    } else if (val == 'delete') {
                                      _deleteUser(u);
                                    }
                                  },
                                  itemBuilder: (ctx) => [
                                    const PopupMenuItem(value: 'edit', child: Row(children: [Icon(Icons.edit, size: 18), SizedBox(width: 8), Text('Tahrirlash')])),
                                    const PopupMenuItem(value: 'reset', child: Row(children: [Icon(Icons.lock_reset, size: 18), SizedBox(width: 8), Text('Parolni tiklash')])),
                                    const PopupMenuItem(value: 'delete', child: Row(children: [Icon(Icons.delete_outline, color: AppTheme.danger, size: 18), SizedBox(width: 8), Text('O\'chirish', style: TextStyle(color: AppTheme.danger))])),
                                  ],
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const Divider(height: 1),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              if (u.branchName != null) ...[
                                const Icon(Icons.storefront, size: 15, color: AppTheme.muted),
                                const SizedBox(width: 4),
                                Text(u.branchName!, style: const TextStyle(fontSize: 13, color: AppTheme.muted)),
                                const Spacer(),
                              ],
                              if (u.baseSalary != null && u.baseSalary! > 0) ...[
                                const Icon(Icons.payments_outlined, size: 15, color: Color(0xFF059669)),
                                const SizedBox(width: 4),
                                Text(
                                  formatCurrency(u.baseSalary!),
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
