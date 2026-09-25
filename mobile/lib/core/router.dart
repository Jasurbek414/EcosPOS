import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth_controller.dart';
import '../features/auth/login_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/kassa/kassa_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/sales/sales_screen.dart';
import '../features/scanner/scanner_screen.dart';
import '../features/shell/home_shell.dart';
import '../features/stock/stock_screen.dart';
import 'role_navigation.dart';

/// authControllerProvider holati o'zgarganda go_router'ning redirect'ini qayta
/// hisoblashga majbur qiladigan ko'prik — Riverpod StateNotifier bilan go_router'ning
/// ChangeNotifier asosidagi refreshListenable'ini bog'laydi.
class _AuthRefreshNotifier extends ChangeNotifier {
  _AuthRefreshNotifier(Ref ref) {
    ref.listen<AuthState>(authControllerProvider, (previous, next) {
      if (previous?.status != next.status) notifyListeners();
    });
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final refreshNotifier = _AuthRefreshNotifier(ref);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refreshNotifier,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final location = state.matchedLocation;

      if (auth.status == AuthStatus.loading) {
        return location == '/splash' ? null : '/splash';
      }
      if (auth.status == AuthStatus.unauthenticated) {
        return location == '/login' ? null : '/login';
      }
      // authenticated
      final role = auth.session?.role ?? 'CASHIER';
      final bosh = homePathForRole(role);

      if (location == '/splash' || location == '/login') return bosh;

      // Rolga ruxsat etilmagan sahifa (masalan kassir uchun /dashboard) menyuda
      // ko'rinmaydi, lekin chuqur havola yoki eski marshrut orqali ochilishi
      // mumkin. Bunda foydalanuvchiga bo'sh/xato ekran o'rniga o'zining bosh
      // sahifasini ko'rsatamiz.
      if (!canAccess(role, location)) return bosh;

      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (context, state) => const _SplashScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      ShellRoute(
        builder: (context, state, child) => HomeShell(child: child),
        routes: [
          GoRoute(path: '/dashboard', builder: (context, state) => const DashboardScreen()),
          GoRoute(path: '/stock', builder: (context, state) => const StockScreen()),
          GoRoute(path: '/kassa', builder: (context, state) => const KassaScreen()),
          GoRoute(path: '/scanner', builder: (context, state) => const ScannerScreen()),
          GoRoute(path: '/sales', builder: (context, state) => const SalesScreen()),
          GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
        ],
      ),
    ],
  );
});

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
