import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/providers.dart';
import '../../core/token_storage.dart';
import '../../models/models.dart';

enum AuthStatus { loading, authenticated, unauthenticated }

class AuthState {
  const AuthState({this.status = AuthStatus.loading, this.session});

  final AuthStatus status;
  final AuthSession? session;

  bool get isManager => session?.isManager ?? false;
  bool get isOwner => session?.isOwner ?? false;
  bool get isCashier => session?.isCashier ?? false;

  AuthState copyWith({AuthStatus? status, AuthSession? session}) =>
      AuthState(status: status ?? this.status, session: session ?? this.session);
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._api, this._storage) : super(const AuthState()) {
    _restore();
  }

  final ApiClient _api;
  final TokenStorage _storage;

  Future<void> _restore() async {
    final session = await _storage.readSession();
    state = session != null
        ? AuthState(status: AuthStatus.authenticated, session: session)
        : const AuthState(status: AuthStatus.unauthenticated);
  }

  /// Muvaffaqiyatli bo'lsa `null`, aks holda foydalanuvchiga ko'rsatiladigan xato matnini qaytaradi.
  Future<String?> login({
    required String companyCode,
    required String username,
    required String password,
  }) async {
    try {
      final res = await _api.post<Map<String, dynamic>>('/auth/login', data: {
        'companyCode': companyCode,
        'username': username,
        'password': password,
      });
      final session = AuthSession.fromLoginJson(res.data!, companyCode: companyCode);
      await _storage.saveSession(session);
      state = AuthState(status: AuthStatus.authenticated, session: session);
      return null;
    } catch (e) {
      return apiErrorMessage(e, fallback: 'Login, parol yoki kompaniya kodi noto\'g\'ri');
    }
  }

  void updateSession(AuthSession session) {
    state = state.copyWith(session: session);
  }

  Future<void> logout() async {
    await _storage.clear();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  /// ApiClient tomonidan refresh muvaffaqiyatsiz bo'lganda chaqiriladi — [logout]
  /// bilan bir xil, lekin kelib chiqishi tashqi (401 oqimi) ekanini ajratib turish
  /// uchun alohida nom bilan.
  Future<void> forceLogout() => logout();
}

// Aniq LHS turi ATAYLAB yozilgan — apiClientProvider bilan aylanma bog'liqlik borligi
// sababli (core/providers.dart'dagi izohga qarang).
final StateNotifierProvider<AuthController, AuthState> authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>(
  (ref) => AuthController(ref.watch(apiClientProvider), ref.watch(tokenStorageProvider)),
);
