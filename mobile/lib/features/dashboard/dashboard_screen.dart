import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/formatters.dart';
import '../../core/providers.dart';
import '../auth/auth_controller.dart';
import '../../models/models.dart';

/// Dashboard statistikasi — faqat OWNER/MANAGER uchun so'raladi (CASHIER 403 oladi,
/// shuning uchun bu provider CASHIER holatida umuman chaqirilmaydi — pastga qarang).
final dashboardStatsProvider = FutureProvider.autoDispose<DashboardStats?>((ref) async {
  final auth = ref.watch(authControllerProvider);
  final session = auth.session;
  if (session == null || !session.isManager) return null;
  final api = ref.watch(apiClientProvider);
  try {
    final res = await api.get<Map<String, dynamic>>(
      '/reports/dashboard',
      query: session.branchId != null ? {'branchId': session.branchId} : null,
    );
    return DashboardStats.fromJson(res.data!);
  } on DioException catch (e) {
    // 403 (masalan filial talab qilinsa) yoki 400 bo'lsa — chaqmasdan, shunchaki
    // statistikani ko'rsatmaymiz, ilova buzilmasligi kerak.
    if (e.response?.statusCode == 403 || e.response?.statusCode == 400) return null;
    rethrow;
  }
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final session = auth.session;

    return Scaffold(
      appBar: AppBar(
        title: Text('Salom, ${session?.fullName ?? ''}'),
      ),
      body: session == null
          ? const SizedBox.shrink()
          : session.isCashier
              ? _CashierWelcome(fullName: session.fullName)
              : _ManagerDashboard(session: session),
    );
  }
}

class _CashierWelcome extends StatelessWidget {
  const _CashierWelcome({required this.fullName});

  final String fullName;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.storefront_rounded, size: 56, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 16),
            Text(
              'Xush kelibsiz, $fullName',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Qoldiqlarni tekshiring yoki mahsulotni skanerlang',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 28),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => context.go('/stock'),
                icon: const Icon(Icons.inventory_2_outlined),
                label: const Text('Kam qolganlar'),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => context.go('/scanner'),
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text('Shtrix-kod'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ManagerDashboard extends ConsumerWidget {
  const _ManagerDashboard({required this.session});

  final AuthSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(dashboardStatsProvider);

    return RefreshIndicator(
      onRefresh: () => ref.refresh(dashboardStatsProvider.future),
      child: statsAsync.when(
        loading: () => const _LoadingList(),
        error: (e, _) => _ErrorRetry(onRetry: () => ref.invalidate(dashboardStatsProvider)),
        data: (stats) {
          if (stats == null) {
            return ListView(
              padding: const EdgeInsets.all(16),
              children: const [
                SizedBox(height: 80),
                Center(child: Text('Statistika mavjud emas')),
              ],
            );
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Bugun', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _StatCard(
                      label: 'Tushum',
                      value: '${formatMoney(stats.todayRevenue)} so\'m',
                      icon: Icons.payments_outlined,
                      color: const Color(0xFF2563EB),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatCard(
                      label: 'Foyda',
                      value: '${formatMoney(stats.todayProfit)} so\'m',
                      icon: Icons.trending_up,
                      color: const Color(0xFF059669),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _StatCard(
                label: 'Bugungi savdolar soni',
                value: '${stats.todaySalesCount}',
                icon: Icons.point_of_sale_outlined,
                color: const Color(0xFF9333EA),
                wide: true,
              ),
              const SizedBox(height: 24),
              Text('Shu oy', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _StatCard(
                      label: 'Tushum',
                      value: '${formatMoney(stats.monthRevenue)} so\'m',
                      icon: Icons.calendar_month_outlined,
                      color: const Color(0xFF2563EB),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatCard(
                      label: 'Foyda',
                      value: '${formatMoney(stats.monthProfit)} so\'m',
                      icon: Icons.savings_outlined,
                      color: const Color(0xFF059669),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () => context.go('/stock'),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.warning_amber_rounded, color: Color(0xFFD97706)),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Kam qolgan mahsulotlar', style: TextStyle(fontWeight: FontWeight.w600)),
                              Text('${stats.lowStockCount} ta mahsulot minimal darajadan past',
                                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value, required this.icon, required this.color, this.wide = false});

  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: wide
            ? Row(
                children: [
                  Icon(icon, color: color),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                      ],
                    ),
                  ),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(icon, color: color),
                  const SizedBox(height: 10),
                  Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                  const SizedBox(height: 2),
                  Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ],
              ),
      ),
    );
  }
}

class _LoadingList extends StatelessWidget {
  const _LoadingList();

  @override
  Widget build(BuildContext context) => const Center(child: CircularProgressIndicator());
}

class _ErrorRetry extends StatelessWidget {
  const _ErrorRetry({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 40, color: Colors.grey),
          const SizedBox(height: 8),
          const Text('Ma\'lumotlarni yuklab bo\'lmadi'),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: onRetry, child: const Text('Qayta urinish')),
        ],
      ),
    );
  }
}
