import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/formatters.dart';
import '../../core/providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_controller.dart';
import '../customers/customers_screen.dart';
import '../expenses/expenses_screen.dart';
import '../inventory/products_screen.dart';
import '../inventory/receipts_screen.dart';
import '../notifications/notifications_provider.dart';
import '../../widgets/app_drawer.dart';

/// Dashboard statistikasi — faqat OWNER/MANAGER uchun so'raladi
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
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.asset(
                'assets/icon/logo.png',
                width: 32,
                height: 32,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const Icon(Icons.point_of_sale, size: 28),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Salom, ${session?.fullName ?? ""}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700), overflow: TextOverflow.ellipsis),
                  Text(
                    session?.role == 'OWNER'
                        ? 'Do\'kon egasi'
                        : session?.role == 'MANAGER'
                            ? 'Menejer'
                            : 'Kassir',
                    style: const TextStyle(fontSize: 11, color: AppTheme.muted, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          Consumer(
            builder: (context, ref, _) {
              final unreadCount = ref.watch(notificationsProvider).unreadCount;
              return Stack(
                alignment: Alignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.notifications_outlined),
                    tooltip: 'Bildirishnomalar',
                    onPressed: () => context.push('/notifications'),
                  ),
                  if (unreadCount > 0)
                    Positioned(
                      top: 10,
                      right: 10,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Color(0xFFEF4444),
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                        child: Text(
                          '$unreadCount',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(dashboardStatsProvider),
          ),
        ],
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
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: AppTheme.primaryLight,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.storefront_rounded, size: 48, color: AppTheme.primary),
            ),
            const SizedBox(height: 16),
            Text(
              'Xush kelibsiz, $fullName',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              'Savdo qilish yoki tovarlarni tekshirish uchun quyidagi amallardan foydalaning',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
            const SizedBox(height: 28),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => context.go('/kassa'),
                icon: const Icon(Icons.point_of_sale_outlined),
                label: const Text('Kassaga o\'tish'),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => context.go('/scanner'),
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text('Shtrix-kod skaneri'),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => context.go('/sales'),
                icon: const Icon(Icons.receipt_long_outlined),
                label: const Text('So\'nggi sotuvlar'),
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
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Tezkor amallar (Quick Action Grid)
          const Text('Tezkor amallar', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _QuickActionButton(
                  icon: Icons.point_of_sale_rounded,
                  label: 'Kassa',
                  color: AppTheme.primary,
                  onTap: () => context.go('/kassa'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _QuickActionButton(
                  icon: Icons.inventory_2_outlined,
                  label: 'Mahsulotlar',
                  color: const Color(0xFF0284C7),
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProductsScreen()));
                  },
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _QuickActionButton(
                  icon: Icons.local_shipping_outlined,
                  label: 'Prixod (Kirim)',
                  color: const Color(0xFF059669),
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ReceiptsScreen()));
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _QuickActionButton(
                  icon: Icons.groups_outlined,
                  label: 'Nasiya / Qarz',
                  color: AppTheme.danger,
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CustomersScreen()));
                  },
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _QuickActionButton(
                  icon: Icons.account_balance_wallet_outlined,
                  label: 'Xarajatlar',
                  color: const Color(0xFFD97706),
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ExpensesScreen()));
                  },
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _QuickActionButton(
                  icon: Icons.qr_code_scanner,
                  label: 'Skaner',
                  color: const Color(0xFF7C3AED),
                  onTap: () => context.go('/scanner'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Moliyaviy ko'rsatkichlar
          statsAsync.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(40),
                child: CircularProgressIndicator(),
              ),
            ),
            error: (e, _) => Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    const Text('Statistikani yuklab bo\'lmadi'),
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: () => ref.invalidate(dashboardStatsProvider),
                      child: const Text('Qayta urinish'),
                    ),
                  ],
                ),
              ),
            ),
            data: (stats) {
              if (stats == null) {
                return const Center(child: Text('Statistika mavjud emas'));
              }

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Bugungi savdo ko\'rsatkichlari', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _StatCard(
                          label: 'Bugungi tushum',
                          value: '${formatMoney(stats.todayRevenue)} so\'m',
                          icon: Icons.payments_outlined,
                          color: AppTheme.primary,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _StatCard(
                          label: 'Sof foyda',
                          value: '${formatMoney(stats.todayProfit)} so\'m',
                          icon: Icons.trending_up,
                          color: AppTheme.success,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _StatCard(
                    label: 'Bugungi cheklar / savdolar soni',
                    value: '${stats.todaySalesCount} ta',
                    icon: Icons.receipt_long_outlined,
                    color: const Color(0xFF9333EA),
                    wide: true,
                  ),
                  const SizedBox(height: 24),

                  const Text('Joriy oy statistikasi', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _StatCard(
                          label: 'Oylik tushum',
                          value: '${formatMoney(stats.monthRevenue)} so\'m',
                          icon: Icons.calendar_month_outlined,
                          color: AppTheme.primary,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _StatCard(
                          label: 'Oylik foyda',
                          value: '${formatMoney(stats.monthProfit)} so\'m',
                          icon: Icons.savings_outlined,
                          color: AppTheme.success,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Kam qolgan tovarlar
                  InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => context.go('/stock'),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppTheme.warningLight,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.warning_amber_rounded, color: AppTheme.warning, size: 24),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Kam qolgan mahsulotlar', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                                const SizedBox(height: 2),
                                Text(
                                  '${stats.lowStockCount} ta mahsulot omborda tugab bormoqda',
                                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right, color: AppTheme.muted),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  const _QuickActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.secondary),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.wide = false,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: wide
          ? Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: color, size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(label, style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
                      const SizedBox(height: 4),
                      Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.secondary)),
                    ],
                  ),
                ),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(label, style: const TextStyle(color: AppTheme.muted, fontSize: 12, fontWeight: FontWeight.w500)),
                    Icon(icon, color: color, size: 20),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  value,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.secondary),
                ),
              ],
            ),
    );
  }
}
