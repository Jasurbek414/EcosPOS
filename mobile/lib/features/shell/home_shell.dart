import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/role_navigation.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_controller.dart';

/// Pastki navigatsiya paneli.
///
/// Bo'limlar ro'yxati ROLGA qarab tuziladi (qarang: core/role_navigation.dart):
/// kassirga moliyaviy hisobot bo'limi umuman ko'rsatilmaydi, chunki backend
/// baribir unga ruxsat bermaydi va bo'sh ekran chalkashlik tug'dirardi.
/// Skanerlash — do'kon ichida eng ko'p ishlatiladigan funksiya — markazda
/// kattaroq va urg'uli tugma sifatida ajratiladi.
class HomeShell extends ConsumerWidget {
  const HomeShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authControllerProvider).session?.role ?? 'CASHIER';
    final tabs = tabsForRole(role);

    final location = GoRouterState.of(context).matchedLocation;
    final currentIndex = tabs.indexWhere((t) => location.startsWith(t.path));

    return Scaffold(
      body: child,
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          height: 68,
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Colors.grey.shade200)),
          ),
          child: Row(
            children: [
              for (var i = 0; i < tabs.length; i++)
                Expanded(
                  child: _NavButton(
                    tab: tabs[i],
                    selected: i == currentIndex,
                    prominent: tabs[i].prominent,
                    onTap: () => context.go(tabs[i].path),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  const _NavButton({required this.tab, required this.selected, required this.onTap, required this.prominent});

  final NavTab tab;
  final bool selected;
  final bool prominent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppTheme.primary : Colors.grey.shade500;

    if (prominent) {
      return InkWell(
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: AppTheme.primary,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(color: AppTheme.primary.withOpacity(0.35), blurRadius: 10, offset: const Offset(0, 4)),
                ],
              ),
              child: Icon(tab.activeIcon, color: Colors.white, size: 24),
            ),
            const SizedBox(height: 2),
            Text(tab.label, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
          ],
        ),
      );
    }

    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(selected ? tab.activeIcon : tab.icon, color: color, size: 24),
          const SizedBox(height: 4),
          Text(tab.label, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
