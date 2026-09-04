import 'package:dio/dio.dart';

import 'token_storage.dart';

/// Backend manzili — build vaqtida `--dart-define=API_BASE_URL=...` bilan almashtiriladi.
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://savdo-api.ecos.uz',
);

/// Markaziy Dio HTTP klient:
/// - Har bir so'rovga saqlangan access tokenni Authorization header sifatida qo'shadi.
/// - 401 kelsa (login/refresh so'rovlaridan tashqari) — refresh token bilan BIR MARTA
///   yangilashga urinadi, muvaffaqiyatli bo'lsa asl so'rovni qayta yuboradi; aks holda
///   sessiyani tozalab, [onSessionExpired] callback orqali xabar beradi (auth controller
///   buni logout qilib, LoginScreen'ga qaytarish uchun ishlatadi).
/// - Parallel kelgan bir nechta 401 uchun ham faqat bitta refresh so'rovi yuboriladi
///   (veb-ilovadagi src/services/api.js bilan bir xil kontrakt/mantiq).
class ApiClient {
  ApiClient(this._tokenStorage) {
    _dio = Dio(BaseOptions(
      baseUrl: '$kApiBaseUrl/api/v1',
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ));

    // Refresh so'rovi uchun alohida Dio — asosiy _dio'ning interceptorlariga
    // tushib (Authorization header eski token bilan) yana 401 olib qolmasligi uchun.
    _refreshDio = Dio(BaseOptions(
      baseUrl: '$kApiBaseUrl/api/v1',
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _tokenStorage.readAccessToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        final path = error.requestOptions.path;
        final isAuthCall = path.contains('/auth/login') || path.contains('/auth/refresh');
        final alreadyRetried = error.requestOptions.extra['retried'] == true;

        if (error.response?.statusCode == 401 && !isAuthCall && !alreadyRetried) {
          final newAccessToken = await _refreshOnce();
          if (newAccessToken != null) {
            try {
              final retryOptions = error.requestOptions;
              retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';
              retryOptions.extra['retried'] = true;
              final response = await _dio.fetch<dynamic>(retryOptions);
              return handler.resolve(response);
            } catch (_) {
              // Qayta yuborish ham muvaffaqiyatsiz bo'lsa, quyidagi umumiy xato oqimiga tushadi.
            }
          } else {
            await _tokenStorage.clear();
            onSessionExpired?.call();
          }
        }
        return handler.next(error);
      },
    ));
  }

  late final Dio _dio;
  late final Dio _refreshDio;
  final TokenStorage _tokenStorage;

  /// Refresh muvaffaqiyatsiz bo'lganda (yoki refresh token umuman yo'qligida)
  /// chaqiriladi — odatda foydalanuvchini login ekraniga qaytarish uchun ulanadi.
  void Function()? onSessionExpired;

  Future<String?>? _refreshFuture;

  /// Bir nechta so'rov bir vaqtda 401 olsa ham faqat bitta /auth/refresh chaqiriladi.
  Future<String?> _refreshOnce() {
    _refreshFuture ??= _doRefresh().whenComplete(() => _refreshFuture = null);
    return _refreshFuture!;
  }

  Future<String?> _doRefresh() async {
    final refreshToken = await _tokenStorage.readRefreshToken();
    if (refreshToken == null) return null;
    try {
      final res = await _refreshDio.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final data = res.data!;
      final accessToken = data['accessToken'] as String;
      final newRefreshToken = data['refreshToken'] as String;
      await _tokenStorage.updateTokens(accessToken: accessToken, refreshToken: newRefreshToken);
      return accessToken;
    } catch (_) {
      return null;
    }
  }

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? query}) =>
      _dio.get<T>(path, queryParameters: query);

  Future<Response<T>> post<T>(String path, {Object? data}) => _dio.post<T>(path, data: data);

  Future<Response<T>> put<T>(String path, {Object? data}) => _dio.put<T>(path, data: data);

  Future<Response<T>> delete<T>(String path, {Object? data}) => _dio.delete<T>(path, data: data);
}

/// Backend xato javoblari `{"error": "..."}` yoki `{"message": "..."}` shaklida keladi —
/// buni Dio xatosidan chiqarib olish uchun yordamchi funksiya.
String apiErrorMessage(Object error, {String fallback = 'Xatolik yuz berdi'}) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map) {
      final message = data['error'] ?? data['message'];
      if (message is String && message.isNotEmpty) return message;
    }
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      return 'Serverga ulanib bo\'lmadi. Internetni tekshiring.';
    }
  }
  return fallback;
}

bool isNotFound(Object error) => error is DioException && error.response?.statusCode == 404;

bool isForbidden(Object error) => error is DioException && error.response?.statusCode == 403;
