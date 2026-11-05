import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../core/providers.dart';
import '../auth/auth_controller.dart';
import 'notification_model.dart';

enum NotificationFilter {
  all,
  stock,
  debt,
  sale,
  system,
}

class NotificationSettings {
  const NotificationSettings({
    this.stockAlerts = true,
    this.debtAlerts = true,
    this.salesAlerts = true,
    this.soundAlerts = true,
  });

  final bool stockAlerts;
  final bool debtAlerts;
  final bool salesAlerts;
  final bool soundAlerts;

  NotificationSettings copyWith({
    bool? stockAlerts,
    bool? debtAlerts,
    bool? salesAlerts,
    bool? soundAlerts,
  }) {
    return NotificationSettings(
      stockAlerts: stockAlerts ?? this.stockAlerts,
      debtAlerts: debtAlerts ?? this.debtAlerts,
      salesAlerts: salesAlerts ?? this.salesAlerts,
      soundAlerts: soundAlerts ?? this.soundAlerts,
    );
  }
}

class NotificationsState {
  const NotificationsState({
    this.items = const [],
    this.filter = NotificationFilter.all,
    this.isLoading = false,
    this.settings = const NotificationSettings(),
  });

  final List<AppNotification> items;
  final NotificationFilter filter;
  final bool isLoading;
  final NotificationSettings settings;

  int get unreadCount => items.where((n) => !n.isRead).length;

  List<AppNotification> get filteredItems {
    switch (filter) {
      case NotificationFilter.stock:
        return items.where((n) => n.type == NotificationType.stock).toList();
      case NotificationFilter.debt:
        return items.where((n) => n.type == NotificationType.debt).toList();
      case NotificationFilter.sale:
        return items.where((n) => n.type == NotificationType.sale).toList();
      case NotificationFilter.system:
        return items.where((n) => n.type == NotificationType.system).toList();
      case NotificationFilter.all:
      default:
        return items;
    }
  }

  NotificationsState copyWith({
    List<AppNotification>? items,
    NotificationFilter? filter,
    bool? isLoading,
    NotificationSettings? settings,
  }) {
    return NotificationsState(
      items: items ?? this.items,
      filter: filter ?? this.filter,
      isLoading: isLoading ?? this.isLoading,
      settings: settings ?? this.settings,
    );
  }
}

class NotificationsNotifier extends StateNotifier<NotificationsState> {
  NotificationsNotifier(this._ref) : super(const NotificationsState()) {
    refresh();
  }

  final Ref _ref;

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true);
    final auth = _ref.read(authControllerProvider);
    final session = auth.session;
    final api = _ref.read(apiClientProvider);

    final List<AppNotification> list = [];
    final now = DateTime.now();

    // 1. Tizim xabarnomasi
    list.add(AppNotification(
      id: 'sys_bot_welcome',
      title: 'Telegram Bot integratsiyasi faol',
      body: 'Do\'koningiz savdolarini Telegramdagi @EcosPOS_bot orqali ham to\'g\'ridan-to\'g\'ri kuzatib borishingiz mumkin.',
      type: NotificationType.system,
      priority: NotificationPriority.low,
      createdAt: now.subtract(const Duration(minutes: 10)),
      actionRoute: '/profile',
      actionLabel: 'Sozlamalar',
    ));

    // 2. Real vaqt ma'lumotlarini yuklash (Dashboard, Ombor, Mijozlar)
    if (session != null && session.isManager) {
      try {
        final dashRes = await api.get<Map<String, dynamic>>('/reports/dashboard');
        final dashData = dashRes.data;
        if (dashData != null) {
          final lowStock = dashData['lowStockCount'] as num? ?? 0;
          if (lowStock > 0) {
            list.add(AppNotification(
              id: 'stock_alert_low',
              title: 'Omborda kam qolgan tovarlar!',
              body: 'Diqqat: $lowStock ta tovar qoldig\'i minimal me\'yordan kam qolgan. Omborga kirim qilish tavsiya etiladi.',
              type: NotificationType.stock,
              priority: NotificationPriority.high,
              createdAt: now.subtract(const Duration(minutes: 2)),
              actionRoute: '/stock',
              actionLabel: 'Qoldiqlarni ko\'rish',
            ));
          }

          final todayRevenue = dashData['todayRevenue'] as num? ?? 0;
          final todaySalesCount = dashData['todaySalesCount'] as num? ?? 0;
          if (todaySalesCount > 0) {
            list.add(AppNotification(
              id: 'sales_today_summary',
              title: 'Bugungi savdo muvaffaqiyatli ketmoqda',
              body: 'Bugun jami $todaySalesCount ta savdo amalga oshirildi. Tushum: ${todayRevenue.toStringAsFixed(0)} so\'m.',
              type: NotificationType.sale,
              priority: NotificationPriority.medium,
              createdAt: now.subtract(const Duration(minutes: 15)),
              actionRoute: '/sales',
              actionLabel: 'Savdolar tarixi',
            ));
          }
        }
      } catch (_) {
        // Backend bo'sh yoki xato bo'lsa indamay o'tamiz
      }

      // 3. Qarzdorlik tekshiruvi
      try {
        final custRes = await api.get<List<dynamic>>('/customers', query: {'hasDebt': true});
        final customers = custRes.data ?? [];
        if (customers.isNotEmpty) {
          list.add(AppNotification(
            id: 'debt_alert_active',
            title: 'Qarzdorlik eslatmasi',
            body: '${customers.length} nafar mijozda to\'lanmagan nasiya qarzdorligi mavjud. Eslatma xabari yuborish tavsiya etiladi.',
            type: NotificationType.debt,
            priority: NotificationPriority.medium,
            createdAt: now.subtract(const Duration(hours: 1)),
            actionRoute: '/customers',
            actionLabel: 'Mijozlar ro\'yxati',
          ));
        }
      } catch (_) {}
    } else {
      // Kassir uchun bildirishnoma
      list.add(AppNotification(
        id: 'kassa_shift_info',
        title: 'Kassa smenasi faol',
        body: 'Savdolarni tezkor va aniq amalga oshirish uchun shtrix-kod skaneri va qidiruvdan foydalaning.',
        type: NotificationType.sale,
        priority: NotificationPriority.low,
        createdAt: now.subtract(const Duration(minutes: 5)),
        actionRoute: '/kassa',
        actionLabel: 'Kassaga o\'tish',
      ));
    }

    state = state.copyWith(
      items: list,
      isLoading: false,
    );
  }

  void markAsRead(String id) {
    state = state.copyWith(
      items: state.items.map((n) {
        if (n.id == id) return n.copyWith(isRead: true);
        return n;
      }).toList(),
    );
  }

  void markAllAsRead() {
    state = state.copyWith(
      items: state.items.map((n) => n.copyWith(isRead: true)).toList(),
    );
  }

  void deleteItem(String id) {
    state = state.copyWith(
      items: state.items.where((n) => n.id != id).toList(),
    );
  }

  void clearAll() {
    state = state.copyWith(items: []);
  }

  void setFilter(NotificationFilter filter) {
    state = state.copyWith(filter: filter);
  }

  void updateSettings(NotificationSettings newSettings) {
    state = state.copyWith(settings: newSettings);
  }
}

final notificationsProvider = StateNotifierProvider<NotificationsNotifier, NotificationsState>((ref) {
  return NotificationsNotifier(ref);
});
