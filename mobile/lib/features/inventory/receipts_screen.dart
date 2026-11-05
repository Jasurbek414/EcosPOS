import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/branch_provider.dart';
import '../../core/formatters.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_drawer.dart';
import '../auth/auth_controller.dart';
import 'inventory_providers.dart';
import 'receipt_form_screen.dart';

class ReceiptsScreen extends ConsumerWidget {
  const ReceiptsScreen({super.key, this.isTab = false});
  final bool isTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authControllerProvider).session;
    final branchId = ref.watch(selectedBranchIdProvider);
    final receiptsAsync = ref.watch(goodsReceiptsProvider(branchId));

    return Scaffold(
      drawer: isTab ? null : const AppDrawer(),
      appBar: isTab
          ? null
          : AppBar(
              title: const Text('Kirim hujjatlari (Prixod)'),
              actions: [
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () => ref.invalidate(goodsReceiptsProvider),
                ),
              ],
            ),
      floatingActionButton: (session?.isManager ?? false)
          ? FloatingActionButton.extended(
              onPressed: () async {
                final created = await Navigator.of(context).push<bool>(
                  MaterialPageRoute(builder: (_) => const ReceiptFormScreen()),
                );
                if (created == true) {
                  ref.invalidate(goodsReceiptsProvider);
                }
              },
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add),
              label: const Text('Yangi kirim'),
            )
          : null,
      body: receiptsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
              const SizedBox(height: 12),
              const Text('Kirimlar ro\'yxatini yuklab bo\'lmadi'),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => ref.invalidate(goodsReceiptsProvider),
                child: const Text('Qayta urinish'),
              ),
            ],
          ),
        ),
        data: (receipts) {
          if (receipts.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.inventory_outlined, size: 64, color: Colors.grey.shade400),
                  const SizedBox(height: 12),
                  Text(
                    'Kirim hujjatlari hali mavjud emas',
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(goodsReceiptsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: receipts.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final item = receipts[index];
                return _ReceiptCard(receipt: item);
              },
            ),
          );
        },
      ),
    );
  }
}

class _ReceiptCard extends StatelessWidget {
  const _ReceiptCard({required this.receipt});

  final GoodsReceiptSummary receipt;

  @override
  Widget build(BuildContext context) {
    final isCompleted = receipt.status == 'COMPLETED';

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
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '№ ${receipt.receiptNumber}',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isCompleted ? AppTheme.successLight : AppTheme.warningLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isCompleted ? 'Qabul qilindi' : 'Qoralama',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isCompleted ? AppTheme.success : AppTheme.warning,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.local_shipping_outlined, size: 16, color: AppTheme.muted),
              const SizedBox(width: 6),
              Text(
                receipt.supplierName,
                style: const TextStyle(fontSize: 14, color: AppTheme.secondary),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.calendar_today_outlined, size: 14, color: AppTheme.muted),
              const SizedBox(width: 6),
              Text(
                formatDate(receipt.receiptDate),
                style: const TextStyle(fontSize: 13, color: AppTheme.muted),
              ),
              const Spacer(),
              Text(
                '${receipt.itemCount} xil tovar',
                style: const TextStyle(fontSize: 13, color: AppTheme.muted),
              ),
            ],
          ),
          const Divider(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Umumiy summa:', style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.muted)),
              Text(
                '${formatMoney(receipt.totalAmount)} so\'m',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.primary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
