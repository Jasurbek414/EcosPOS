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
  label: 'Hisobot',
);
const _stock = NavTab(
  path: '/stock',
  icon: Icons.inventory_2_outlined,
  activeIcon: Icons.inventory_2,
  label: 'Qoldiqlar',
);
const _kassa = NavTab(
  path: '/kassa',
  icon: Icons.point_of_sale_outlined,
  activeIcon: Icons.point_of_sale,
  label: 'Kassa',
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

/// Rolga qarab pastki menyu bo'limlari.
///
/// Avval BARCHA bo'limlar hamma rolga ko'rsatilardi. Natijada kassir "Hisobot"
/// bo'limini ochsa backend 403 qaytarardi va ekran bo'sh qolardi — foydalanuvchi
/// esa nima uchunligini tushunmasdi. Endi har bir rol faqat o'zi ishlatadigan
/// bo'limlarni ko'radi.
List<NavTab> tabsForRole(String role) {
  switch (role) {
    // Kassir — faqat savdo qilish uchun. Moliyaviy hisobot unga berilmaydi
    // (backend ham bermaydi), shuning uchun "Hisobot" bo'limi umuman yo'q.
    case 'CASHIER':
      return const [_kassa, _stock, _scanner, _sales, _profile];

    // Menejer va ega — to'liq operatsion ko'rinish.
    case 'MANAGER':
    case 'OWNER':
    default:
      return const [_dashboard, _stock, _kassa, _scanner, _sales, _profile];
  }
}

/// Tizimga kirgandan keyin yoki ruxsatsiz sahifaga urinilganda ochiladigan sahifa.
/// Kassir uchun bu — Kassa, chunki uning butun ishi shu yerda.
String homePathForRole(String role) => role == 'CASHIER' ? '/kassa' : '/dashboard';

/// Foydalanuvchi shu manzilni ocha oladimi.
///
/// Bu tekshiruv menyuni yashirishdan TASHQARI kerak: chuqur havola (deep link)
/// yoki eski marshrut menyuni chetlab o'tib, sahifani to'g'ridan-to'g'ri ochishi
/// mumkin. Asosiy himoya baribir backendda; bu esa foydalanuvchiga tushunarsiz
/// bo'sh ekran ko'rsatmaslik uchun.
bool canAccess(String role, String location) {
  return tabsForRole(role).any((t) => location.startsWith(t.path));
}
