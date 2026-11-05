import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../core/branch_provider.dart';
import '../../core/providers.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_controller.dart';

class StockMovementItem {
  const StockMovementItem({
    required this.id,
    required this.productName,
    required this.movementType,
    required this.quantity,
    this.unit,
    this.branchName,
    this.userName,
    this.note,
    required this.createdAt,
  });

  final int id;
  final String productName;
  final String movementType;
  final double quantity;
  final String? unit;
  final String? branchName;
  final String? userName;
  final String? note;
  final DateTime createdAt;

  factory StockMovementItem.fromJson(Map<String, dynamic> json) {
    return StockMovementItem(
      id: json['id'] as int? ?? 0,
      productName: json['productName'] as String? ?? 'Mahsulot',
      movementType: json['type'] as String? ?? 'ADJUSTMENT',
      quantity: (json['quantity'] as num? ?? 0).toDouble(),
      unit: json['unit'] as String? ?? 'dona',
      branchName: json['branchName'] as String?,
      userName: json['userName'] as String?,
      note: json['note'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

final stockMovementsProvider = FutureProvider.autoDispose<List<StockMovementItem>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final session = ref.watch(authControllerProvider).session;
  final branchId = session?.isOwner == true ? ref.watch(selectedBranchIdProvider) : session?.branchId;

  final res = await api.get<List<dynamic>>(
    '/stock/movements',
    query: branchId != null ? {'branchId': branchId} : null,
  );
  return (res.data ?? []).map((e) => StockMovementItem.fromJson(e as Map<String, dynamic>)).toList();
});

class MovementsTab extends ConsumerWidget {
  const MovementsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final movementsAsync = ref.watch(stockMovementsProvider);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(stockMovementsProvider),
        child: movementsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 40, color: Colors.grey),
                const SizedBox(height: 8),
                const Text('Harakatlar tarixini yuklab bo\'lmadi'),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: () => ref.invalidate(stockMovementsProvider),
                  child: const Text('Qayta urinish'),
                ),
              ],
            ),
          ),
          data: (list) {
            if (list.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.history_toggle_off, size: 56, color: Colors.grey.shade400),
                      const SizedBox(height: 12),
                      const Text(
                        'Harakatlar tarixi bo\'sh',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Kirim, sotuv va qoldiq tuzatishlar shu yerda qayd etiladi.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ),
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final m = list[index];
                final (badgeText, badgeColor, badgeBg) = _getTypeBadge(m.movementType);
                final isPositive = m.quantity >= 0;

                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isPositive ? const Color(0xFFDCFCE7) : const Color(0xFFFEE2E2),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          isPositive ? Icons.south_west : Icons.north_east,
                          color: isPositive ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              m.productName,
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: badgeBg,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    badgeText,
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: badgeColor),
                                  ),
                                ),
                                if (m.userName != null) ...[
                                  const SizedBox(width: 6),
                                  Text(
                                    m.userName!,
                                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${isPositive ? "+" : ""}${m.quantity.toStringAsFixed(1)} ${m.unit ?? "dona"}',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: isPositive ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _formatDate(m.createdAt),
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                          ),
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
    );
  }

  (String, Color, Color) _getTypeBadge(String type) {
    switch (type) {
      case 'RECEIPT':
        return ('Kirim (Prixod)', const Color(0xFF16A34A), const Color(0xFFDCFCE7));
      case 'SALE':
        return ('Sotuv (Kassa)', const Color(0xFF0284C7), const Color(0xFFE0F2FE));
      case 'ADJUSTMENT':
        return ('Qoldiq tuzatish', const Color(0xFFD97706), const Color(0xFFFEF3C7));
      case 'TRANSFER_IN':
        return ('Ko\'chirish (+)', const Color(0xFF7C3AED), const Color(0xFFEDE9FE));
      case 'TRANSFER_OUT':
        return ('Ko\'chirish (-)', const Color(0xFF9333EA), const Color(0xFFF3E8FF));
      case 'INVENTORY':
      default:
        return ('Inventarizatsiya', const Color(0xFF475569), const Color(0xFFF1F5F9));
    }
  }

  String _formatDate(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')}.${dt.month.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}
