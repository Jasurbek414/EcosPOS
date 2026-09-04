import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth_controller.dart';
import '../features/auth/login_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/sales/sales_screen.dart';
import '../features/scanner/scanner_screen.dart';
import '../features/shell/home_shell.dart';
import '../features/stock/stock_screen.dart';

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
      if (location == '/splash' || location == '/login') return '/dashboard';
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
