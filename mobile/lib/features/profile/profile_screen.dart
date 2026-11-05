import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_theme.dart';
import '../auth/auth_controller.dart';
import '../company/company_settings_screen.dart';
import '../customers/customers_screen.dart';
import '../expenses/expenses_screen.dart';
import '../integrations/integrations_screen.dart';
import '../inventory/products_screen.dart';
import '../inventory/receipts_screen.dart';
import '../payroll/payroll_screen.dart';
import '../notifications/notifications_provider.dart';
import '../../widgets/app_drawer.dart';
import '../staff/staff_screen.dart';
import 'change_password_dialog.dart';
import 'edit_profile_dialog.dart';
import 'language_sheet.dart';

String _roleLabel(String role) {
  switch (role) {
    case 'OWNER':
      return 'Do\'kon egasi';
    case 'MANAGER':
      return 'Menejer';
    case 'CASHIER':
      return 'Kassir';
    default:
      return role;
  }
}

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  String _selectedLang = 'uz';

  String get _langName {
    switch (_selectedLang) {
      case 'uz':
        return 'O\'zbekcha (Lotin)';
      case 'uz_cyrl':
        return 'Ўзбекча (Кирилл)';
      case 'ru':
        return 'Русский';
      case 'en':
        return 'English';
      default:
        return 'O\'zbekcha';
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(authControllerProvider).session;
    if (session == null) return const SizedBox.shrink();

    final isOwner = session.isOwner;
    final isManager = session.isManager;

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Profil va Barcha Sozlamalar'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
        children: [
          // Foydalanuvchi asosiy profili kartasi
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1E56A0), Color(0xFF10B981)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF1E56A0).withOpacity(0.2),
                  blurRadius: 15,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 30,
                      backgroundColor: Colors.white.withOpacity(0.25),
                      child: Text(
                        session.fullName.isNotEmpty ? session.fullName[0].toUpperCase() : '?',
                        style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            session.fullName,
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '@${session.username}',
                            style: const TextStyle(fontSize: 13, color: Colors.white70),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              _roleLabel(session.role),
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.edit, color: Colors.white),
                      tooltip: 'Profilni tahrirlash',
                      onPressed: () {
                        showDialog(context: context, builder: (_) => const EditProfileDialog());
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.apartment, size: 16, color: Colors.white70),
                      const SizedBox(width: 8),
                      Text('Kompaniya kodi: ${session.companyCode}', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
                      const Spacer(),
                      InkWell(
                        onTap: () {
                          Clipboard.setData(ClipboardData(text: session.companyCode));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Kompaniya kodi nusxalandi')),
                          );
                        },
                        child: const Icon(Icons.copy, size: 16, color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // 1. Profil va Xavfsizlik
          const _SectionTitle('Profil va Xavfsizlik'),
          _SettingsContainer(
            children: [
              _SettingsTile(
                icon: Icons.badge_outlined,
                iconColor: AppTheme.primary,
                title: 'F.I.O va ma\'lumotlar',
                subtitle: session.fullName,
                onTap: () => showDialog(context: context, builder: (_) => const EditProfileDialog()),
              ),
              const Divider(height: 1),
              _SettingsTile(
                icon: Icons.key_outlined,
                iconColor: const Color(0xFFD97706),
                title: 'Parolni o\'zgartirish',
                subtitle: 'Xavfsiz yangi parol o\'rnatish',
                onTap: () => showDialog(context: context, builder: (_) => const ChangePasswordDialog()),
              ),
              const Divider(height: 1),
              _SettingsTile(
                icon: Icons.language_outlined,
                iconColor: const Color(0xFF0284C7),
                title: 'Ilova tili',
                subtitle: _langName,
                trailing: Text(_langName, style: const TextStyle(fontSize: 12, color: AppTheme.primary, fontWeight: FontWeight.bold)),
                onTap: () {
                  showModalBottomSheet(
                    context: context,
                    backgroundColor: Colors.transparent,
                    builder: (_) => LanguageSheet(
                      currentLang: _selectedLang,
                      onSelect: (lang) => setState(() => _selectedLang = lang),
                    ),
                  );
                },
              ),
              const Divider(height: 1),
              Consumer(
                builder: (context, ref, _) {
                  final unread = ref.watch(notificationsProvider).unreadCount;
                  return _SettingsTile(
                    icon: Icons.notifications_active_outlined,
                    iconColor: const Color(0xFFEF4444),
                    title: 'Bildirishnomalar markazi',
                    subtitle: unread > 0 ? '$unread ta o\'qilmagan xabarnoma' : 'Ombor, qarzlar va kassa signallari',
                    trailing: unread > 0
                        ? Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEF4444),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '$unread',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          )
                        : null,
                    onTap: () => context.push('/notifications'),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 20),

          // 2. Kompaniya va Kassa Sozlamalari (OWNER uchun)
          if (isOwner) ...[
            const _SectionTitle('Kompaniya va Kassa Sozlamalari'),
            _SettingsContainer(
              children: [
                _SettingsTile(
                  icon: Icons.storefront_outlined,
                  iconColor: const Color(0xFF10B981),
                  title: 'Kompaniya va do\'kon ma\'lumotlari',
                  subtitle: 'Nomi, manzili, telefoni va rekvizitlari',
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CompanySettingsScreen()));
                  },
                ),
                const Divider(height: 1),
                _SettingsTile(
                  icon: Icons.receipt_long_outlined,
                  iconColor: AppTheme.primary,
                  title: 'Chek va printer sozlamalari',
                  subtitle: '80mm/58mm format, header va footer matni',
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CompanySettingsScreen()));
                  },
                ),
                const Divider(height: 1),
                _SettingsTile(
                  icon: Icons.handshake_outlined,
                  iconColor: const Color(0xFFD97706),
                  title: 'Nasiya savdosi (Kredit)',
                  subtitle: 'Mijozlarga qarzga savdo qilish imkoniyati',
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CompanySettingsScreen()));
                  },
                ),
              ],
            ),
            const SizedBox(height: 20),
          ],

          // 3. Xodimlar va Ish Haqi
          if (isManager) ...[
            const _SectionTitle('Xodimlar va Ish Haqi'),
            _SettingsContainer(
              children: [
                _SettingsTile(
                  icon: Icons.group_outlined,
                  iconColor: const Color(0xFF0284C7),
                  title: 'Xodimlar boshqaruvi',
                  subtitle: 'Kassirlar, menejerlar va ruxsatlar',
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const StaffScreen()));
                  },
                ),
                const Divider(height: 1),
                _SettingsTile(
                  icon: Icons.payments_outlined,
                  iconColor: const Color(0xFF059669),
                  title: 'Xodimlar oylik maoshi',
                  subtitle: 'Maosh to\'lovlari tarixi va yangi to\'lovlar',
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PayrollScreen()));
                  },
                ),
              ],
            ),
            const SizedBox(height: 20),
          ],

          // 4. Integratsiyalar
          const _SectionTitle('Integratsiyalar'),
          _SettingsContainer(
            children: [
              _SettingsTile(
                icon: Icons.hub_outlined,
                iconColor: const Color(0xFF7C3AED),
                title: 'Barcha integratsiyalar',
                subtitle: 'Termoprinter, to\'lov terminallari, tarozilar, Telegram bot',
                onTap: () {
                  Navigator.of(context).push(MaterialPageRoute(builder: (_) => const IntegrationsScreen()));
                },
              ),
            ],
          ),
          const SizedBox(height: 20),

          // 5. Tezkor Bo'limlar
          const _SectionTitle('Tezkor Bo\'limlar'),
          _SettingsContainer(
            children: [
              _SettingsTile(
                icon: Icons.receipt_long_outlined,
                iconColor: AppTheme.primary,
                title: 'Savdolar tarixi',
                subtitle: 'Barcha cheklar va kassa operatsiyalari',
                onTap: () => context.go('/sales'),
              ),
              if (isManager) ...[
                const Divider(height: 1),
                _SettingsTile(
                  icon: Icons.account_balance_wallet_outlined,
                  iconColor: const Color(0xFFD97706),
                  title: 'Xarajatlar',
                  subtitle: 'Do\'kon kundalik va operatsion xarajatlari',
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ExpensesScreen())),
                ),
                const Divider(height: 1),
                _SettingsTile(
                  icon: Icons.people_alt_outlined,
                  iconColor: AppTheme.danger,
                  title: 'Mijozlar va Nasiya daftari',
                  subtitle: 'Qarzdorlar ro\'yxati va to\'lovlar',
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CustomersScreen())),
                ),
                const Divider(height: 1),
                _SettingsTile(
                  icon: Icons.local_shipping_outlined,
                  iconColor: const Color(0xFF059669),
                  title: 'Kirim (Prixod)',
                  subtitle: 'Ta\'minotchilardan tovar qabul qilish',
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ReceiptsScreen())),
                ),
                const Divider(height: 1),
                _SettingsTile(
                  icon: Icons.inventory_2_outlined,
                  iconColor: const Color(0xFF0284C7),
                  title: 'Mahsulotlar katalogi',
                  subtitle: 'Tovar narxlari, qoldiqlar va shtrix-kodlar',
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProductsScreen())),
                ),
              ],
            ],
          ),
          const SizedBox(height: 28),

          // Chiqish tugmasi
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => _confirmLogout(context, ref),
              icon: const Icon(Icons.logout, color: AppTheme.danger),
              label: const Text('Akkauntdan chiqish', style: TextStyle(color: AppTheme.danger, fontWeight: FontWeight.bold)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppTheme.danger),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Center(
            child: Text(
              'EcosPOS v1.0.0 • savdo.ecos.uz',
              style: TextStyle(fontSize: 12, color: AppTheme.muted),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Chiqish'),
        content: const Text('Haqiqatan ham akkauntdan chiqmoqchimisiz?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Bekor qilish')),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppTheme.danger),
            child: const Text('Chiqish'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(authControllerProvider.notifier).logout();
    }
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title);
  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
      ),
    );
  }
}

class _SettingsContainer extends StatelessWidget {
  const _SettingsContainer({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(children: children),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.trailing,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: iconColor.withOpacity(0.12),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: iconColor, size: 20),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 12, color: AppTheme.muted)),
      trailing: trailing ?? const Icon(Icons.chevron_right, color: AppTheme.muted, size: 20),
      onTap: onTap,
    );
  }
}
