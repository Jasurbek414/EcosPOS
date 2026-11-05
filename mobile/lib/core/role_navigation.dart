import 'package:flutter/material.dart';

/// Pastki menyudagi bitta bo'lim.
class NavTab {
  const NavTab({
    required this.path,
    required this.icon,
    required this.activeIcon,
    required this.label,
    this.prominent = false,
  });

  final String path;
  final IconData icon;
  final IconData activeIcon;
  final String label;

  /// Markazda kattaroq, urg'uli tugma sifatida ko'rsatiladimi.
  final bool prominent;
}

// Barcha mavjud bo'limlar.
const _dashboard = NavTab(
  path: '/dashboard',
  icon: Icons.insights_outlined,
  activeIcon: Icons.insights,
  label: 'Bosh sahifa',
);

const _kassa = NavTab(
  path: '/kassa',
  icon: Icons.point_of_sale_outlined,
  activeIcon: Icons.point_of_sale,
  label: 'Kassa',
  prominent: true,
);

const _inventory = NavTab(
  path: '/inventory',
  icon: Icons.inventory_2_outlined,
  activeIcon: Icons.inventory_2,
  label: 'Ombor',
);

const _customers = NavTab(
  path: '/customers',
  icon: Icons.groups_outlined,
  activeIcon: Icons.groups,
  label: 'Mijozlar',
);

const _stock = NavTab(
  path: '/stock',
  icon: Icons.inventory_2_outlined,
  activeIcon: Icons.inventory_2,
  label: 'Qoldiqlar',
);

const _scanner = NavTab(
  path: '/scanner',
  icon: Icons.qr_code_scanner,
  activeIcon: Icons.qr_code_scanner,
  label: 'Skanerlash',
  prominent: true,
);

const _sales = NavTab(
  path: '/sales',
  icon: Icons.receipt_long_outlined,
  activeIcon: Icons.receipt_long,
  label: 'Savdolar',
);

const _profile = NavTab(
  path: '/profile',
  icon: Icons.person_outline,
  activeIcon: Icons.person,
  label: 'Profil',
);

/// Rolga qarab pastki menyu bo'limlari (Asosiy tezkor amallar).
/// Qolgan barcha bo'limlar (Ombor, Mijozlar, Sozlamalar) Yon panelda (Sidebar).
List<NavTab> tabsForRole(String role) {
  switch (role) {
    case 'CASHIER':
      return const [_kassa, _scanner, _sales, _stock];

    case 'MANAGER':
    case 'OWNER':
    default:
      return const [_dashboard, _kassa, _scanner, _sales];
  }
}

/// Tizimga kirgandan keyin ochiladigan bosh sahifa
String homePathForRole(String role) => role == 'CASHIER' ? '/kassa' : '/dashboard';

/// Foydalanuvchi shu manzilni ocha oladimi
bool canAccess(String role, String location) {
  // Profil, bildirishnomalar, kassa, skaner, savdolar barchaga ochiq
  if (location.startsWith('/profile') ||
      location.startsWith('/notifications') ||
      location.startsWith('/kassa') ||
      location.startsWith('/scanner') ||
      location.startsWith('/sales') ||
      location.startsWith('/stock')) {
    return true;
  }

  // Menejer va ega uchun hamma narsa ochiq
  if (role == 'OWNER' || role == 'MANAGER') {
    return true;
  }

  // Kassir uchun qolgan sahifalar yopiq
  return false;
}
