import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_drawer.dart';

class RolesScreen extends StatefulWidget {
  const RolesScreen({super.key});

  @override
  State<RolesScreen> createState() => _RolesScreenState();
}

class _RolesScreenState extends State<RolesScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Rollar va Huquqlar'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primary,
          unselectedLabelColor: const Color(0xFF64748B),
          indicatorColor: AppTheme.primary,
          tabs: const [
            Tab(text: 'Ega (Owner)'),
            Tab(text: 'Menejer'),
            Tab(text: 'Kassir'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _RoleDetailsView(
            roleTitle: "Do'kon Egasi (OWNER)",
            badgeColor: const Color(0xFF7C3AED),
            icon: Icons.admin_panel_settings,
            description:
                "Tizimdagi eng yuqori darajadagi vakolat. Barcha filiallar, moliyaviy hisobotlar, foyda-zarar, xodimlar maoshi, tizim integratsiyalari va xavfsizlik sozlamalarini to'liq nazorat qiladi.",
            permissions: const [
              _PermissionRow('Barcha filiallarga to\'liq kirish', true),
              _PermissionRow('Buxgalteriya, Sof foyda va Marja tahlili', true),
              _PermissionRow('Tovarlarning tan narxi (COGS)ni ko\'rish', true),
              _PermissionRow('Tovarlar katalogi va qoldiqlarini boshqarish', true),
              _PermissionRow('Kirim (Prixod) va Ta\'minotchilar', true),
              _PermissionRow('Xodimlar va Oylik maosh (Payroll)', true),
              _PermissionRow('Do\'kon xarajatlari boshqaruvi', true),
              _PermissionRow('Telegram Bot va Bildirishnomalar', true),
              _PermissionRow('Kompaniya va Kassa rekvizitlari sozlamalari', true),
              _PermissionRow('Kassada tezkor savdo qilish', true),
            ],
            note: "Ega faqat o'zi xohlagan filiallarni almashtirishi yoki umumiy yig'ma statistikani ko'rishi mumkin.",
          ),
          _RoleDetailsView(
            roleTitle: 'Filial Menejeri (MANAGER)',
            badgeColor: const Color(0xFF0284C7),
            icon: Icons.manage_accounts,
            description:
                "Muayyan filialning operatsion rahbari. Tovar qoldiqlari, kirimlar, do'kon xarajatlari va kassirlar faoliyatini boshqaradi. Faqat o'z filialiga tegishli ma'lumotlarni ko'radi.",
            permissions: const [
              _PermissionRow('O\'z filialini to\'liq boshqarish', true),
              _PermissionRow('Boshqa filiallar ma\'lumotlariga kirish', false),
              _PermissionRow('Tovarlar katalogi va qoldiqlarini boshqarish', true),
              _PermissionRow('Kirim (Prixod) va Ta\'minotchilar', true),
              _PermissionRow('Qoldiqlarni hisobdan chiqarish (Spisaniye)', true),
              _PermissionRow('O\'z filiali xarajatlarini kiritish', true),
              _PermissionRow('Xodimlar ro\'yxati va ish vaqtini ko\'rish', true),
              _PermissionRow('Oylik maosh to\'lovlarini amalga oshirish', true),
              _PermissionRow('Kompaniya yuridik sozlamalarini o\'zgartirish', false),
              _PermissionRow('Telegram Bot tokenini almashtirish', false),
            ],
            note: "Menejer filial doirasida barcha operatsiyalarni bajara oladi, biroq tizim miqyosidagi global sozlamalarni o'zgartira olmaydi.",
          ),
          _RoleDetailsView(
            roleTitle: 'Kassir (CASHIER)',
            badgeColor: const Color(0xFF059669),
            icon: Icons.point_of_sale,
            description:
                "Tezkor savdo va xaridorlarga xizmat ko'rsatish xodimi. Skanerlash, kassa, chek chiqarish va mijozlardan to'lov qabul qilish huquqiga ega.",
            permissions: const [
              _PermissionRow('Kassa va tezkor savdo (POS)', true),
              _PermissionRow('Shtrix-kod skanerlash', true),
              _PermissionRow('O\'z smenasidagi savdolar tarixi va cheklar', true),
              _PermissionRow('Tovar sotuv narxlari va qoldiqlarini ko\'rish', true),
              _PermissionRow('Tovarlar tan narxi (COGS)ni ko\'rish', false),
              _PermissionRow('Sof foyda va Buxgalteriyani ko\'rish', false),
              _PermissionRow('Tovar kirimi (Prixod) va yangi tovar qo\'shish', false),
              _PermissionRow('Qoldiqlarni tuzatish / hisobdan chiqarish', false),
              _PermissionRow('Do\'kon xarajatlarini kiritish', false),
              _PermissionRow('Xodimlar va Sozlamalarga kirish', false),
            ],
            note: "Kassir moliyaviy sirlar (tan narx, sof foyda) va ombor hisobotlaridan himoyalangan. Faqat savdo operatsiyalarini bajaradi.",
          ),
        ],
      ),
    );
  }
}

class _PermissionRow {
  const _PermissionRow(this.label, this.allowed);
  final String label;
  final bool allowed;
}

class _RoleDetailsView extends StatelessWidget {
  const _RoleDetailsView({
    required this.roleTitle,
    required this.badgeColor,
    required this.icon,
    required this.description,
    required this.permissions,
    required this.note,
  });

  final String roleTitle;
  final Color badgeColor;
  final IconData icon;
  final String description;
  final List<_PermissionRow> permissions;
  final String note;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Header kartasi
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.03),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: badgeColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, color: badgeColor, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          roleTitle,
                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                        ),
                        const SizedBox(height: 3),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: badgeColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'Faol rol',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: badgeColor),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                description,
                style: const TextStyle(fontSize: 13, height: 1.45, color: Color(0xFF475569)),
              ),
            ],
          ),
        ),

        const SizedBox(height: 18),

        // Huquqlar ro'yxati
        const Text(
          'Vakolatlar va Cheklovlar',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
        ),
        const SizedBox(height: 10),

        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            children: [
              for (int i = 0; i < permissions.length; i++) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: permissions[i].allowed ? const Color(0xFFDCFCE7) : const Color(0xFFFEE2E2),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          permissions[i].allowed ? Icons.check : Icons.close,
                          size: 16,
                          color: permissions[i].allowed ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          permissions[i].label,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: permissions[i].allowed ? FontWeight.w600 : FontWeight.w400,
                            color: permissions[i].allowed ? const Color(0xFF1E293B) : const Color(0xFF94A3B8),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                if (i < permissions.length - 1)
                  const Divider(height: 1, indent: 44, endIndent: 16, color: Color(0xFFF1F5F9)),
              ],
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Eslatma
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFF0FDF4),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFBBF7D0)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.info_outline, color: Color(0xFF16A34A), size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  note,
                  style: const TextStyle(fontSize: 12, height: 1.4, color: Color(0xFF166534)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
