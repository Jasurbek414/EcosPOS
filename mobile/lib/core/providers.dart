import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/auth_controller.dart';
import 'api_client.dart';
import 'token_storage.dart';

final Provider<TokenStorage> tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

// Aniq LHS turi ATAYLAB yozilgan: bu provider pastda authControllerProvider'ga murojaat
// qiladi, u esa o'z navbatida shu providerga murojaat qiladi (aylanma bog'liqlik, lekin
// runtime'da xavfsiz — providerlar lazy). Agar ikkala tomonda ham LHS turi aniq
// yozilmasa, Dart kompilyatori "circularity found during type inference" xatosi beradi.
final Provider<ApiClient> apiClientProvider = Provider<ApiClient>((ref) {
  final client = ApiClient(ref.watch(tokenStorageProvider));
  // Refresh muvaffaqiyatsiz bo'lsa (masalan refresh token ham muddati o'tgan/bekor
  // qilingan) — auth holatini "chiqilgan"ga o'tkazamiz, go_router redirect qolganini
  // avtomatik LoginScreen'ga yo'naltiradi.
  client.onSessionExpired = () => ref.read(authControllerProvider.notifier).forceLogout();
  return client;
});
