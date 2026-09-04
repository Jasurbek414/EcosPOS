import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_theme.dart';

class _NavTab {
  const _NavTab({required this.path, required this.icon, required this.activeIcon, required this.label});

  final String path;
  final IconData icon;
  final IconData activeIcon;
  final String label;
}

const _tabs = [
  _NavTab(path: '/dashboard', icon: Icons.home_outlined, activeIcon: Icons.home, label: 'Bosh sahifa'),
  _NavTab(path: '/stock', icon: Icons.inventory_2_outlined, activeIcon: Icons.inventory_2, label: 'Qoldiqlar'),
  _NavTab(path: '/scanner', icon: Icons.qr_code_scanner, activeIcon: Icons.qr_code_scanner, label: 'Skanerlash'),
  _NavTab(path: '/sales', icon: Icons.receipt_long_outlined, activeIcon: Icons.receipt_long, label: 'Savdolar'),
  _NavTab(path: '/profile', icon: Icons.person_outline, activeIcon: Icons.person, label: 'Profil'),
];

/// Pastki navigatsiya paneli — Skanerlash (do'kon ichida eng ko'p ishlatiladigan
/// funksiya) markazda kattaroq va urg'uli tugma sifatida ajratib ko'rsatiladi.
class HomeShell extends StatelessWidget {
  const HomeShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final currentIndex = _tabs.indexWhere((t) => location.startsWith(t.path));

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
              for (var i = 0; i < _tabs.length; i++)
                Expanded(
                  child: _NavButton(
                    tab: _tabs[i],
                    selected: i == currentIndex,
                    prominent: i == 2,
                    onTap: () => context.go(_tabs[i].path),
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

  final _NavTab tab;
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
