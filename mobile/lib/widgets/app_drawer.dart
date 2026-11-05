import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth_controller.dart';
import '../features/company/company_settings_screen.dart';
import '../features/integrations/integrations_screen.dart';
import '../features/notifications/notifications_provider.dart';
import '../features/payroll/payroll_screen.dart';
import '../features/staff/staff_screen.dart';
import '../theme/app_theme.dart';

class AppDrawer extends ConsumerWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final session = auth.session;
    final isOwner = session?.isOwner ?? false;
    final isManager = session?.isManager ?? false;
    final location = GoRouterState.of(context).matchedLocation;
    final unreadCount = ref.watch(notificationsProvider).unreadCount;

    return Drawer(
      backgroundColor: Colors.white,
      child: Column(
        children: [
          // 1. Profil va Do'kon Header
          _DrawerHeader(session: session),

          // 2. Menyu bo'limlari (Scrollable)
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
              children: [
                // ASOSIY SAHIFALAR
                const _DrawerSectionHeader('ASOSIY AMALLAR'),
                if (isManager)
                  _DrawerItem(
                    icon: Icons.insights_outlined,
                    activeIcon: Icons.insights,
                    title: 'Bosh sahifa',
                    selected: location == '/dashboard',
                    onTap: () => _navigate(context, '/dashboard'),
                  ),
                _DrawerItem(
                  icon: Icons.point_of_sale_outlined,
                  activeIcon: Icons.point_of_sale,
                  title: 'Kassa (POS)',
                  selected: location == '/kassa',
                  onTap: () => _navigate(context, '/kassa'),
                ),
                _DrawerItem(
                  icon: Icons.qr_code_scanner,
                  activeIcon: Icons.qr_code_scanner,
                  title: 'Shtrix-kod skaneri',
                  selected: location == '/scanner',
                  onTap: () => _navigate(context, '/scanner'),
                ),
                _DrawerItem(
                  icon: Icons.receipt_long_outlined,
                  activeIcon: Icons.receipt_long,
                  title: 'Savdolar va Cheklar',
                  selected: location == '/sales',
                  onTap: () => _navigate(context, '/sales'),
                ),

                const Divider(height: 24),

                // OMBOR VA MAHSULOTLAR
                const _DrawerSectionHeader('OMBOR VA TOVARLAR'),
                if (isManager) ...[
                  _DrawerItem(
                    icon: Icons.store_mall_directory_outlined,
                    activeIcon: Icons.store_mall_directory,
                    title: 'Ombor boshqaruv markazi',
                    selected: location == '/inventory',
                    onTap: () => _navigate(context, '/inventory'),
                  ),
                  _DrawerItem(
                    icon: Icons.category_outlined,
                    activeIcon: Icons.category,
                    title: 'Mahsulotlar katalogi',
                    selected: location == '/products',
                    onTap: () => _navigate(context, '/products'),
                  ),
                  _DrawerItem(
                    icon: Icons.input_rounded,
                    activeIcon: Icons.input,
                    title: 'Tovar kirimlari',
                    selected: location == '/receipts',
                    onTap: () => _navigate(context, '/receipts'),
                  ),
                ],
                _DrawerItem(
                  icon: Icons.inventory_2_outlined,
                  activeIcon: Icons.inventory_2,
                  title: 'Tovar qoldiqlari',
                  selected: location == '/stock',
                  onTap: () => _navigate(context, '/stock'),
                ),

                // MIJOZLAR VA MOLIYA (Faqat OWNER/MANAGER uchun)
                if (isManager) ...[
                  const Divider(height: 24),
                  const _DrawerSectionHeader('MIJOZLAR VA MOLIYA'),
                  _DrawerItem(
                    icon: Icons.groups_outlined,
                    activeIcon: Icons.groups,
                    title: 'Mijozlar va Nasiyalar',
                    selected: location == '/customers',
                    onTap: () => _navigate(context, '/customers'),
                  ),
                  _DrawerItem(
                    icon: Icons.account_balance_wallet_outlined,
                    activeIcon: Icons.account_balance_wallet,
                    title: 'Do\'kon xarajatlari',
                    selected: location == '/expenses',
                    onTap: () => _navigate(context, '/expenses'),
                  ),
                  _DrawerItem(
                    icon: Icons.account_balance_outlined,
                    activeIcon: Icons.account_balance,
                    title: 'Buxgalteriya va Moliya',
                    selected: location == '/accounting',
                    onTap: () => _navigate(context, '/accounting'),
                  ),
                ],

                // XODIMLAR VA MAOSH
                if (isManager) ...[
                  const Divider(height: 24),
                  const _DrawerSectionHeader('XODIMLAR VA ISH HAQI'),
                  _DrawerItem(
                    icon: Icons.badge_outlined,
                    activeIcon: Icons.badge,
                    title: 'Xodimlar boshqaruvi',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const StaffScreen()));
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.payments_outlined,
                    activeIcon: Icons.payments,
                    title: 'Oylik maosh to\'lovlari',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PayrollScreen()));
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.admin_panel_settings_outlined,
                    activeIcon: Icons.admin_panel_settings,
                    title: 'Rollar va Huquqlar',
                    selected: location == '/roles',
                    onTap: () => _navigate(context, '/roles'),
                  ),
                ],

                const Divider(height: 24),

                // SOZLAMALAR VA INTEGRATSIYALAR
                const _DrawerSectionHeader('SOZLAMALAR'),
                _DrawerItem(
                  icon: Icons.notifications_outlined,
                  activeIcon: Icons.notifications,
                  title: 'Bildirishnomalar markazi',
                  badgeCount: unreadCount,
                  selected: location == '/notifications',
                  onTap: () => _navigate(context, '/notifications'),
                ),
                if (isOwner) ...[
                  _DrawerItem(
                    icon: Icons.storefront_outlined,
                    activeIcon: Icons.storefront,
                    title: 'Do\'kon va Kassa sozlamalari',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CompanySettingsScreen()));
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.send_rounded,
                    activeIcon: Icons.send,
                    title: 'Telegram Bot integratsiyasi',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const IntegrationsScreen()));
                    },
                  ),
                ],
                _DrawerItem(
                  icon: Icons.person_outline,
                  activeIcon: Icons.person,
                  title: 'Profil va Xavfsizlik',
                  selected: location == '/profile',
                  onTap: () => _navigate(context, '/profile'),
                ),
              ],
            ),
          ),

          // 3. Chiqish tugmasi va Versiya (Footer)
          _DrawerFooter(ref: ref),
        ],
      ),
    );
  }

  void _navigate(BuildContext context, String path) {
    Navigator.pop(context);
    context.go(path);
  }
}

class _DrawerHeader extends StatelessWidget {
  const _DrawerHeader({required this.session});

  final dynamic session;

  @override
  Widget build(BuildContext context) {
    final String fullName = session?.fullName ?? 'Foydalanuvchi';
    final String role = session?.role ?? 'CASHIER';
    final String initial = fullName.isNotEmpty ? fullName[0].toUpperCase() : 'E';

    return Container(
      width: double.infinity,
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 16,
        bottom: 20,
        left: 20,
        right: 20,
      ),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.asset(
                  'assets/icon/logo.png',
                  width: 44,
                  height: 44,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => CircleAvatar(
                    radius: 22,
                    backgroundColor: Colors.white24,
                    child: Text(
                      initial,
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'EcosPOS',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 0.5),
                    ),
                    Text(
                      'Aqlli Savdo Tizimi',
                      style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.7)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            fullName,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.18),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  _roleLabel(role),
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white),
                ),
              ),
              if (session?.username != null) ...[
                const SizedBox(width: 8),
                Text(
                  '@${session.username}',
                  style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.6)),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  String _roleLabel(String role) {
    switch (role) {
      case 'OWNER':
        return 'Do\'kon egasi';
      case 'MANAGER':
        return 'Menejer';
      case 'CASHIER':
      default:
        return 'Kassir';
    }
  }
}

class _DrawerSectionHeader extends StatelessWidget {
  const _DrawerSectionHeader(this.title);

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 12, top: 4, bottom: 6),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: Color(0xFF94A3B8),
          letterSpacing: 0.6,
        ),
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  const _DrawerItem({
    required this.icon,
    required this.activeIcon,
    required this.title,
    required this.onTap,
    this.selected = false,
    this.badgeCount = 0,
  });

  final IconData icon;
  final IconData activeIcon;
  final String title;
  final VoidCallback onTap;
  final bool selected;
  final int badgeCount;

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppTheme.primary : const Color(0xFF334155);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 2),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppTheme.primary.withOpacity(0.08) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: selected ? Border.all(color: AppTheme.primary.withOpacity(0.2)) : null,
        ),
        child: Row(
          children: [
            Icon(selected ? activeIcon : icon, color: color, size: 22),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: selected ? FontWeight.bold : FontWeight.w500,
                  color: color,
                ),
              ),
            ),
            if (badgeCount > 0)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$badgeCount',
                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _DrawerFooter extends StatelessWidget {
  const _DrawerFooter({required this.ref});

  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        border: Border(top: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          InkWell(
            onTap: () => _confirmLogout(context, ref),
            borderRadius: BorderRadius.circular(8),
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              child: Row(
                children: [
                  Icon(Icons.logout, color: Color(0xFFEF4444), size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Chiqish',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFEF4444),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Text(
            'EcosPOS v2.0.0',
            style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  void _confirmLogout(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Tizimdan chiqish'),
        content: const Text('Haqiqatan ham hisobingizdan chiqmoqchimisiz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Bekor qilish'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444), foregroundColor: Colors.white),
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
              ref.read(authControllerProvider.notifier).logout();
            },
            child: const Text('Chiqish'),
          ),
        ],
      ),
    );
  }
}
