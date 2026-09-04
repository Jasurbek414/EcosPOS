import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/models.dart';

/// To'liq auth sessiyasini (token'lar + profil + companyCode) telefon xotirasida
/// shifrlangan holda saqlaydi. Bitta ilovada bir vaqtning o'zida faqat bitta
/// sessiya bo'ladi (bir foydalanuvchi kirgan bo'ladi).
class TokenStorage {
  static const _storage = FlutterSecureStorage();
  static const _sessionKey = 'savdo_auth_session';

  Future<void> saveSession(AuthSession session) =>
      _storage.write(key: _sessionKey, value: jsonEncode(session.toJson()));

  Future<AuthSession?> readSession() async {
    final raw = await _storage.read(key: _sessionKey);
    if (raw == null) return null;
    try {
      return AuthSession.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      // Buzilgan/eski format — sessiyani tashlab, qaytadan login talab qilamiz.
      await clear();
      return null;
    }
  }

  Future<String?> readAccessToken() async => (await readSession())?.accessToken;

  Future<String?> readRefreshToken() async => (await readSession())?.refreshToken;

  /// Faqat token juftligini yangilaydi (refresh muvaffaqiyatli bo'lganda) — qolgan
  /// profil ma'lumotlariga tegmaydi.
  Future<void> updateTokens({required String accessToken, required String refreshToken}) async {
    final current = await readSession();
    if (current == null) return;
    await saveSession(current.copyWithTokens(accessToken: accessToken, refreshToken: refreshToken));
  }

  Future<void> clear() => _storage.delete(key: _sessionKey);
}
