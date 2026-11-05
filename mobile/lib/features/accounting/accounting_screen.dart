import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../core/branch_provider.dart';
import '../../core/formatters.dart';
import '../../core/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_drawer.dart';
import '../auth/auth_controller.dart';

class ProfitData {
  const ProfitData({
    required this.totalRevenue,
    required this.totalCost,
    required this.totalProfit,
    required this.profitMarginPercent,
    required this.totalExpenses,
    required this.netProfit,
  });

  final double totalRevenue;
  final double totalCost;
  final double totalProfit;
  final double profitMarginPercent;
  final double totalExpenses;
  final double netProfit;

  factory ProfitData.fromJson(Map<String, dynamic> json) {
    return ProfitData(
      totalRevenue: (json['totalRevenue'] as num? ?? 0).toDouble(),
      totalCost: (json['totalCost'] as num? ?? 0).toDouble(),
      totalProfit: (json['totalProfit'] as num? ?? 0).toDouble(),
      profitMarginPercent: (json['profitMarginPercent'] as num? ?? 0).toDouble(),
      totalExpenses: (json['totalExpenses'] as num? ?? 0).toDouble(),
      netProfit: (json['netProfit'] as num? ?? 0).toDouble(),
    );
  }
}

class InventoryValueData {
  const InventoryValueData({
    required this.totalValue,
    required this.totalSkuCount,
  });

  final double totalValue;
  final int totalSkuCount;

  factory InventoryValueData.fromJson(Map<String, dynamic> json) {
    return InventoryValueData(
      totalValue: (json['totalValue'] as num? ?? 0).toDouble(),
      totalSkuCount: (json['totalSkuCount'] as num? ?? 0).toInt(),
    );
  }
}

final accountingPeriodProvider = StateProvider.autoDispose<String>((ref) => 'month');

final profitReportProvider = FutureProvider.autoDispose<ProfitData>((ref) async {
  final api = ref.watch(apiClientProvider);
  final session = ref.watch(authControllerProvider).session;
  final branchId = session?.isOwner == true ? ref.watch(selectedBranchIdProvider) : session?.branchId;
  final period = ref.watch(accountingPeriodProvider);

  final now = DateTime.now();
  DateTime from;
  if (period == 'today') {
    from = now;
  } else if (period == 'week') {
    from = now.subtract(const Duration(days: 7));
  } else {
    from = DateTime(now.year, now.month, 1);
  }

  final fromStr = '${from.year}-${from.month.toString().padLeft(2, '0')}-${from.day.toString().padLeft(2, '0')}';
  final toStr = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';

  final res = await api.get<Map<String, dynamic>>(
    '/reports/profit',
    query: {
      if (branchId != null) 'branchId': branchId,
      'from': fromStr,
      'to': toStr,
    },
  );
  return ProfitData.fromJson(res.data!);
});

final inventoryValueReportProvider = FutureProvider.autoDispose<InventoryValueData>((ref) async {
  final api = ref.watch(apiClientProvider);
  final session = ref.watch(authControllerProvider).session;
  final branchId = session?.isOwner == true ? ref.watch(selectedBranchIdProvider) : session?.branchId;

  final res = await api.get<Map<String, dynamic>>(
    '/reports/inventory-value',
    query: branchId != null ? {'branchId': branchId} : null,
  );
  return InventoryValueData.fromJson(res.data!);
});

class AccountingScreen extends ConsumerWidget {
  const AccountingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profitAsync = ref.watch(profitReportProvider);
    final invValueAsync = ref.watch(inventoryValueReportProvider);
    final period = ref.watch(accountingPeriodProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Buxgalteriya va Moliya'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(profitReportProvider);
              ref.invalidate(inventoryValueReportProvider);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(profitReportProvider);
          ref.invalidate(inventoryValueReportProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Davrni tanlash filtri
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              padding: const EdgeInsets.all(4),
              child: Row(
                children: [
                  _PeriodButton(
                    label: 'Bugun',
                    selected: period == 'today',
                    onTap: () => ref.read(accountingPeriodProvider.notifier).state = 'today',
                  ),
                  _PeriodButton(
                    label: 'Hafta',
                    selected: period == 'week',
                    onTap: () => ref.read(accountingPeriodProvider.notifier).state = 'week',
                  ),
                  _PeriodButton(
                    label: 'Shu oy',
                    selected: period == 'month',
                    onTap: () => ref.read(accountingPeriodProvider.notifier).state = 'month',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // SOF FOYDA (Asosiy banner)
            profitAsync.when(
              loading: () => const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator())),
              error: (e, _) => Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                child: Text('Hisobot yuklashda xatolik: $e'),
              ),
              data: (data) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: data.netProfit >= 0
                            ? [const Color(0xFF0F172A), const Color(0xFF047857)]
                            : [const Color(0xFF7F1D1D), const Color(0xFF991B1B)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: (data.netProfit >= 0 ? const Color(0xFF047857) : Colors.red).withOpacity(0.25),
                          blurRadius: 14,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'SOF FOYDA (NET PROFIT)',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.white.withOpacity(0.8),
                                letterSpacing: 0.8,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                'Marja: ${data.profitMarginPercent.toStringAsFixed(1)}%',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          formatMoney(data.netProfit),
                          style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Yalpi foydadan barcha operatsion xarajatlar chegirilgan sof daromad',
                          style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.7)),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // FOYDA VA ZARAR (P&L TAQSIMOTI)
                  const Text(
                    'Foyda va Zarar taqsimoti (P&L)',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                  ),
                  const SizedBox(height: 10),

                  _FinanceCard(
                    icon: Icons.trending_up,
                    iconColor: const Color(0xFF059669),
                    title: 'Jami Savdo Tushumi',
                    value: formatMoney(data.totalRevenue),
                    subtitle: 'Kassalar orqali qilingan umumiy aylanma',
                  ),
                  const SizedBox(height: 8),

                  _FinanceCard(
                    icon: Icons.inventory_2_outlined,
                    iconColor: const Color(0xFFD97706),
                    title: 'Tovarlarning Tan Narxi (COGS)',
                    value: '- ${formatMoney(data.totalCost)}',
                    subtitle: 'Sotilgan mahsulotlarning sotib olish qiymati',
                  ),
                  const SizedBox(height: 8),

                  _FinanceCard(
                    icon: Icons.monetization_on_outlined,
                    iconColor: const Color(0xFF0284C7),
                    title: 'Yalpi Foyda (Gross Profit)',
                    value: formatMoney(data.totalProfit),
                    subtitle: 'Savdo tushumi minus tovarlar tan narxi',
                  ),
                  const SizedBox(height: 8),

                  _FinanceCard(
                    icon: Icons.receipt_outlined,
                    iconColor: const Color(0xFFDC2626),
                    title: 'Do\'kon Xarajatlari',
                    value: '- ${formatMoney(data.totalExpenses)}',
                    subtitle: 'Ijara, maosh, kommunal va operatsion xarajatlar',
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // OMBOR VA AKTIVLAR BAHOSI
            const Text(
              'Ombor Aktivlari va Zaxira Qiymati',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
            ),
            const SizedBox(height: 10),

            invValueAsync.when(
              loading: () => const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator())),
              error: (e, _) => const SizedBox.shrink(),
              data: (inv) => Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEDE9FE),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.account_balance, color: Color(0xFF7C3AED), size: 26),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Ombordagi tovarlar qiymati',
                            style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            formatMoney(inv.totalValue),
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Jami ${inv.totalSkuCount} xil tovar zaxirada mavjud',
                            style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PeriodButton extends StatelessWidget {
  const _PeriodButton({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: selected ? AppTheme.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: selected ? FontWeight.bold : FontWeight.w500,
              color: selected ? Colors.white : const Color(0xFF475569),
            ),
          ),
        ),
      ),
    );
  }
}

class _FinanceCard extends StatelessWidget {
  const _FinanceCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.value,
    required this.subtitle,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String value;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
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
              color: iconColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                ),
              ],
            ),
          ),
          Text(
            value,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
          ),
        ],
      ),
    );
  }
}
