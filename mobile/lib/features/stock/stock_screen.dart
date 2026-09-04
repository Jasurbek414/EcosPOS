import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/branch_provider.dart';
import '../../core/formatters.dart';
import '../../models/models.dart';
import '../../widgets/branch_picker.dart';
import '../auth/auth_controller.dart';
import 'adjust_stock_sheet.dart';
import 'stock_providers.dart';

class StockScreen extends ConsumerWidget {
  const StockScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final session = auth.session;

    return Scaffold(
      appBar: AppBar(title: const Text('Kam qolgan mahsulotlar')),
      body: session == null
          ? const SizedBox.shrink()
          : Column(
              children: [
                if (session.isOwner) const BranchPicker(),
                Expanded(child: _StockList(isManager: session.isManager, isOwner: session.isOwner)),
              ],
            ),
    );
  }
}

class _StockList extends ConsumerWidget {
  const _StockList({required this.isManager, required this.isOwner});

  final bool isManager;
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

    final itemsAsync = ref.watch(lowStockProvider);

    return itemsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 40, color: Colors.grey),
            const SizedBox(height: 8),
            const Text('Ro\'yxatni yuklab bo\'lmadi'),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: () => ref.invalidate(lowStockProvider), child: const Text('Qayta urinish')),
          ],
        ),
      ),
      data: (items) {
        if (items.isEmpty) {
          return RefreshIndicator(
            onRefresh: () => ref.refresh(lowStockProvider.future),
            child: ListView(
              children: const [
                SizedBox(height: 120),
                Icon(Icons.check_circle_outline, size: 48, color: Colors.grey),
                SizedBox(height: 8),
                Center(child: Text('Kam qolgan mahsulot yo\'q')),
              ],
            ),
          );
        }
        return RefreshIndicator(
          onRefresh: () => ref.refresh(lowStockProvider.future),
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: items.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final item = items[index];
              return ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFFEF3C7),
                  child: Icon(Icons.warning_amber_rounded, color: Color(0xFFD97706)),
                ),
                title: Text(item.productName),
                subtitle: Text('${item.branchName} · minimal: ${formatQuantity(item.minStockLevel)} ${item.unit}'),
                trailing: Text(
                  '${formatQuantity(item.quantity)} ${item.unit}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                onTap: isManager ? () => _openAdjustSheet(context, ref, item) : null,
              );
            },
          ),
        );
      },
    );
  }

  Future<void> _openAdjustSheet(BuildContext context, WidgetRef ref, LowStockItem item) async {
    final result = await showModalBottomSheet<StockAdjustmentResult>(
      context: context,
      isScrollControlled: true,
      builder: (_) => AdjustStockSheet(
        productId: item.productId,
        productName: item.productName,
        unit: item.unit,
        branchId: item.branchId,
        currentQuantity: item.quantity,
      ),
    );
    if (result != null && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Yangi qoldiq: ${formatQuantity(result.quantity)} ${result.unit}')),
      );
    }
  }
}
