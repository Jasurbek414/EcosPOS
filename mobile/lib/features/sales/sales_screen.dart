import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/branch_provider.dart';
import '../../core/formatters.dart';
import '../../core/providers.dart';
import '../../models/models.dart';
import '../../widgets/branch_picker.dart';
import '../auth/auth_controller.dart';

/// So'nggi savdolar — tezkor "nima sotilyapti" nazari uchun, tafsilot ekransiz.
/// branchId'siz so'rov backend standart bo'yicha oxirgi 30 kunni qaytaradi.
final salesProvider = FutureProvider.autoDispose<List<SaleSummary>>((ref) async {
  final session = ref.watch(authControllerProvider).session;
  if (session == null) return [];
  final api = ref.watch(apiClientProvider);

  Map<String, dynamic>? query;
  if (session.isOwner) {
    final branchId = ref.watch(selectedBranchIdProvider);
    if (branchId == null) return [];
    query = {'branchId': branchId};
  }

  final res = await api.get<List<dynamic>>('/sales', query: query);
  return (res.data ?? []).map((e) => SaleSummary.fromJson(e as Map<String, dynamic>)).toList();
});

class SalesScreen extends ConsumerWidget {
  const SalesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authControllerProvider).session;

    return Scaffold(
      appBar: AppBar(title: const Text('So\'nggi savdolar')),
      body: session == null
          ? const SizedBox.shrink()
          : Column(
              children: [
                if (session.isOwner) const BranchPicker(),
                Expanded(child: _SalesList(isOwner: session.isOwner)),
              ],
            ),
    );
  }
}

class _SalesList extends ConsumerWidget {
  const _SalesList({required this.isOwner});

  final bool isOwner;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (isOwner && ref.watch(selectedBranchIdProvider) == null) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text('Ro\'yxatni ko\'rish uchun avval filialni tanlang', textAlign: TextAlign.center),
        ),
      );
    }

    final salesAsync = ref.watch(salesProvider);

    return salesAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 40, color: Colors.grey),
            const SizedBox(height: 8),
            const Text('Ro\'yxatni yuklab bo\'lmadi'),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: () => ref.invalidate(salesProvider), child: const Text('Qayta urinish')),
          ],
        ),
      ),
      data: (sales) {
        if (sales.isEmpty) {
          return RefreshIndicator(
            onRefresh: () => ref.refresh(salesProvider.future),
            child: ListView(
              children: const [
                SizedBox(height: 120),
                Icon(Icons.receipt_long_outlined, size: 48, color: Colors.grey),
                SizedBox(height: 8),
                Center(child: Text('Hozircha savdolar yo\'q')),
              ],
            ),
          );
        }
        return RefreshIndicator(
          onRefresh: () => ref.refresh(salesProvider.future),
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: sales.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final sale = sales[index];
              return ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFDBEAFE),
                  child: Icon(Icons.receipt_outlined, color: Color(0xFF2563EB)),
                ),
                title: Text('${formatMoney(sale.totalAmount)} so\'m'),
                subtitle: Text('${sale.cashierName} · ${sale.itemCount} ta · ${formatDateTime(sale.createdAt)}'),
                trailing: _PaymentBadge(method: sale.paymentMethod),
              );
            },
          ),
        );
      },
    );
  }
}

class _PaymentBadge extends StatelessWidget {
  const _PaymentBadge({required this.method});

  final String method;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(method, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
    );
  }
}
