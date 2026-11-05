import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/formatters.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_controller.dart';
import 'payroll_providers.dart';
import 'salary_payment_sheet.dart';

class PayrollScreen extends ConsumerWidget {
  const PayrollScreen({super.key});

  Future<void> _deletePayment(BuildContext context, WidgetRef ref, SalaryPaymentItem item) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('To\'lovni o\'chirish'),
        content: Text('${item.userFullName ?? "Xodim"} uchun ${formatCurrency(item.amount)} to\'lov o\'chirilsinmi?'),
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
      await ref.read(payrollRepositoryProvider).deletePayment(item.id);
      ref.invalidate(salaryPaymentsProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('To\'lov o\'chirildi')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Xatolik: $e'), backgroundColor: AppTheme.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final paymentsAsync = ref.watch(salaryPaymentsProvider);
    final isOwner = ref.watch(authControllerProvider).isOwner;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Xodimlar Maoshi'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(salaryPaymentsProvider),
          ),
        ],
      ),
      floatingActionButton: isOwner
          ? FloatingActionButton.extended(
              onPressed: () {
                showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  backgroundColor: Colors.transparent,
                  builder: (_) => const SalaryPaymentSheet(),
                );
              },
              backgroundColor: const Color(0xFF059669),
              icon: const Icon(Icons.add),
              label: const Text('Maosh to\'lash'),
            )
          : null,
      body: paymentsAsync.when(
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
                  onPressed: () => ref.invalidate(salaryPaymentsProvider),
                  child: const Text('Qayta urinish'),
                ),
              ],
            ),
          ),
        ),
        data: (payments) {
          final totalPaid = payments.fold<double>(0, (sum, p) => sum + p.amount);

          return Column(
            children: [
              // Jami summa kartasi
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF059669), Color(0xFF10B981)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.account_balance_wallet, color: Colors.white, size: 28),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Jami to\'langan maoshlar:', style: TextStyle(color: Colors.white70, fontSize: 12)),
                            const SizedBox(height: 2),
                            Text(
                              formatCurrency(totalPaid),
                              style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        '${payments.length} ta to\'lov',
                        style: const TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),

              Expanded(
                child: payments.isEmpty
                    ? const Center(child: Text('Maosh to\'lovlari hali mavjud emas'))
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
                        itemCount: payments.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, i) {
                          final p = payments[i];

                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppTheme.border),
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 20,
                                  backgroundColor: const Color(0xFF059669).withOpacity(0.12),
                                  child: const Icon(Icons.check, color: Color(0xFF059669), size: 20),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        p.userFullName ?? 'Xodim #${p.userId}',
                                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                                      ),
                                      const SizedBox(height: 2),
                                      Row(
                                        children: [
                                          Text('Davr: ${p.periodMonth}', style: const TextStyle(fontSize: 12, color: AppTheme.muted)),
                                          const SizedBox(width: 8),
                                          Text('• ${p.paymentDate}', style: const TextStyle(fontSize: 12, color: AppTheme.muted)),
                                        ],
                                      ),
                                      if (p.note != null && p.note!.isNotEmpty) ...[
                                        const SizedBox(height: 4),
                                        Text(p.note!, style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: AppTheme.muted)),
                                      ],
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      formatCurrency(p.amount),
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF059669)),
                                    ),
                                    if (isOwner) ...[
                                      const SizedBox(height: 4),
                                      InkWell(
                                        onTap: () => _deletePayment(context, ref, p),
                                        child: const Padding(
                                          padding: EdgeInsets.all(4),
                                          child: Icon(Icons.delete_outline, size: 18, color: AppTheme.danger),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}
