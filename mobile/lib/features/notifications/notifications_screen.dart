import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_drawer.dart';
import 'notification_model.dart';
import 'notifications_provider.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(notificationsProvider);
    final notifier = ref.read(notificationsProvider.notifier);

    return Scaffold(
      drawer: const AppDrawer(),
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Row(
          children: [
            const Text(
              'Bildirishnomalar',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            if (state.unreadCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppTheme.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${state.unreadCount}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
        actions: [
          if (state.items.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.done_all),
              tooltip: 'Barchasini o\'qilgan qilish',
              onPressed: () {
                notifier.markAllAsRead();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Barcha bildirishnomalar o\'qildi deb belgilandi'),
                    duration: Duration(seconds: 1),
                  ),
                );
              },
            ),
          IconButton(
            icon: const Icon(Icons.tune_rounded),
            tooltip: 'Sozlamalar',
            onPressed: () => _showSettingsSheet(context, ref),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => notifier.refresh(),
        child: Column(
          children: [
            // Filter kategoriyalari
            _FilterBar(
              selectedFilter: state.filter,
              onFilterSelected: (f) => notifier.setFilter(f),
            ),

            // Bildirishnomalar ro'yxati
            Expanded(
              child: state.filteredItems.isEmpty
                  ? _EmptyNotificationsView(filter: state.filter)
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: state.filteredItems.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final item = state.filteredItems[index];
                        return _NotificationCard(
                          item: item,
                          onTap: () {
                            if (!item.isRead) {
                              notifier.markAsRead(item.id);
                            }
                            if (item.actionRoute != null) {
                              context.push(item.actionRoute!);
                            }
                          },
                          onDismiss: () {
                            notifier.deleteItem(item.id);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('"${item.title}" o\'chirildi'),
                                duration: const Duration(seconds: 1),
                              ),
                            );
                          },
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  void _showSettingsSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _NotificationSettingsSheet(),
    );
  }
}

class _FilterBar extends StatelessWidget {
  const _FilterBar({
    required this.selectedFilter,
    required this.onFilterSelected,
  });

  final NotificationFilter selectedFilter;
  final ValueChanged<NotificationFilter> onFilterSelected;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildChip(NotificationFilter.all, 'Hammasi', Icons.notifications_none),
            const SizedBox(width: 8),
            _buildChip(NotificationFilter.stock, 'Ombor', Icons.inventory_2_outlined),
            const SizedBox(width: 8),
            _buildChip(NotificationFilter.debt, 'Qarzlar', Icons.account_balance_wallet_outlined),
            const SizedBox(width: 8),
            _buildChip(NotificationFilter.sale, 'Savdolar', Icons.receipt_long_outlined),
            const SizedBox(width: 8),
            _buildChip(NotificationFilter.system, 'Tizim', Icons.info_outline),
          ],
        ),
      ),
    );
  }

  Widget _buildChip(NotificationFilter filter, String label, IconData icon) {
    final isSelected = selectedFilter == filter;
    return InkWell(
      onTap: () => onFilterSelected(filter),
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppTheme.primary : const Color(0xFFE2E8F0),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: isSelected ? Colors.white : Colors.grey.shade700,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? Colors.white : Colors.grey.shade800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  const _NotificationCard({
    required this.item,
    required this.onTap,
    required this.onDismiss,
  });

  final AppNotification item;
  final VoidCallback onTap;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final (icon, iconColor, bgColor) = _getTypeStyle(item.type);

    return Dismissible(
      key: Key(item.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDismiss(),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: Colors.red.shade400,
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Icon(Icons.delete_outline, color: Colors.white, size: 28),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: item.isRead ? Colors.white : const Color(0xFFF0FDF4),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: item.isRead ? Colors.grey.shade200 : AppTheme.primary.withOpacity(0.3),
              width: item.isRead ? 1 : 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.02),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon container
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: iconColor, size: 24),
              ),
              const SizedBox(width: 14),

              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            item.title,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: item.isRead ? FontWeight.w600 : FontWeight.bold,
                              color: const Color(0xFF1E293B),
                            ),
                          ),
                        ),
                        if (!item.isRead) ...[
                          const SizedBox(width: 6),
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppTheme.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.body,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade700,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Bottom info (time and optional action)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _formatTime(item.createdAt),
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade500,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (item.actionLabel != null)
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                item.actionLabel!,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppTheme.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(width: 2),
                              const Icon(Icons.arrow_forward_ios, size: 10, color: AppTheme.primary),
                            ],
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  (IconData, Color, Color) _getTypeStyle(NotificationType type) {
    switch (type) {
      case NotificationType.stock:
        return (Icons.warning_amber_rounded, const Color(0xFFD97706), const Color(0xFFFEF3C7));
      case NotificationType.debt:
        return (Icons.account_balance_wallet_outlined, const Color(0xFF4F46E5), const Color(0xFFEEF2FF));
      case NotificationType.sale:
        return (Icons.point_of_sale_outlined, const Color(0xFF059669), const Color(0xFFD1FAE5));
      case NotificationType.system:
      default:
        return (Icons.info_outline, const Color(0xFF0284C7), const Color(0xFFE0F2FE));
    }
  }

  String _formatTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Hozir';
    if (diff.inMinutes < 60) return '${diff.inMinutes} daqiqa oldin';
    if (diff.inHours < 24) return '${diff.inHours} soat oldin';
    return '${dt.day.toString().padLeft(2, '0')}.${dt.month.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

class _EmptyNotificationsView extends StatelessWidget {
  const _EmptyNotificationsView({required this.filter});

  final NotificationFilter filter;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.notifications_off_outlined, size: 54, color: Colors.blue.shade400),
            ),
            const SizedBox(height: 18),
            const Text(
              'Yangi bildirishnomalar yo\'q',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
            ),
            const SizedBox(height: 6),
            Text(
              filter == NotificationFilter.all
                  ? 'Barcha ogohlantirishlar va xabarnomalar shu yerda ko\'rsatiladi.'
                  : 'Ushbu toifa bo\'yicha yangi xabarnomalar mavjud emas.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }
}

class _NotificationSettingsSheet extends ConsumerWidget {
  const _NotificationSettingsSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(notificationsProvider);
    final notifier = ref.read(notificationsProvider.notifier);
    final settings = state.settings;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Bildirishnoma Sozlamalari',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 16),

          SwitchListTile(
            title: const Text('Ombor ogohlantirishlari', style: TextStyle(fontWeight: FontWeight.w600)),
            subtitle: const Text('Kam qolgan tovarlar bo\'yicha ogohlantirish'),
            value: settings.stockAlerts,
            activeColor: AppTheme.primary,
            onChanged: (val) {
              notifier.updateSettings(settings.copyWith(stockAlerts: val));
            },
          ),
          const Divider(),

          SwitchListTile(
            title: const Text('Qarzdorlik eslatmalari', style: TextStyle(fontWeight: FontWeight.w600)),
            subtitle: const Text('To\'lanmagan nasiya va qarzlar to\'g\'risida xabar berish'),
            value: settings.debtAlerts,
            activeColor: AppTheme.primary,
            onChanged: (val) {
              notifier.updateSettings(settings.copyWith(debtAlerts: val));
            },
          ),
          const Divider(),

          SwitchListTile(
            title: const Text('Yangi savdo signallari', style: TextStyle(fontWeight: FontWeight.w600)),
            subtitle: const Text('Kassada amalga oshirilgan har bir yangi savdo'),
            value: settings.salesAlerts,
            activeColor: AppTheme.primary,
            onChanged: (val) {
              notifier.updateSettings(settings.copyWith(salesAlerts: val));
            },
          ),
          const Divider(),

          SwitchListTile(
            title: const Text('Ovozli xabarnoma', style: TextStyle(fontWeight: FontWeight.w600)),
            subtitle: const Text('Yangi xabar kelganda tovush chiqarish'),
            value: settings.soundAlerts,
            activeColor: AppTheme.primary,
            onChanged: (val) {
              notifier.updateSettings(settings.copyWith(soundAlerts: val));
            },
          ),
          const SizedBox(height: 20),

          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0088CC),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            icon: const Icon(Icons.send_rounded),
            label: const Text('Telegram Bot orqali ham kuzatish (@EcosPOS_bot)'),
            onPressed: () {
              Navigator.pop(context);
              context.push('/profile');
            },
          ),
          const SizedBox(height: 10),
        ],
      ),
    );
  }
}
