import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';

final companyProfileProvider = FutureProvider.autoDispose<CompanyProfile>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<Map<String, dynamic>>('/company');
  return CompanyProfile.fromJson(res.data!);
});

class CompanySettingsScreen extends ConsumerStatefulWidget {
  const CompanySettingsScreen({super.key});

  @override
  ConsumerState<CompanySettingsScreen> createState() => _CompanySettingsScreenState();
}

class _CompanySettingsScreenState extends ConsumerState<CompanySettingsScreen> {
  final _profileFormKey = GlobalKey<FormState>();
  final _receiptFormKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();

  final _headerController = TextEditingController();
  final _footerController = TextEditingController();
  String _paperWidth = '80mm';
  bool _showCashier = true;
  bool _showBranch = true;
  bool _autoPrint = false;
  bool _creditSales = false;

  bool _initialized = false;
  bool _savingProfile = false;
  bool _savingReceipt = false;
  bool _togglingCredit = false;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _headerController.dispose();
    _footerController.dispose();
    super.dispose();
  }

  void _populate(CompanyProfile p) {
    if (_initialized) return;
    _nameController.text = p.name;
    _phoneController.text = p.phone ?? '';
    _addressController.text = p.address ?? '';
    _headerController.text = p.receiptHeaderText ?? '';
    _footerController.text = p.receiptFooterText ?? '';
    _paperWidth = p.receiptPaperWidth.isNotEmpty ? p.receiptPaperWidth : '80mm';
    _showCashier = p.receiptShowCashierName;
    _showBranch = p.receiptShowBranchName;
    _autoPrint = p.receiptAutoPrint;
    _creditSales = p.creditSalesEnabled;
    _initialized = true;
  }

  Future<void> _saveProfile() async {
    if (!_profileFormKey.currentState!.validate()) return;
    setState(() => _savingProfile = true);
    final api = ref.read(apiClientProvider);
    try {
      await api.put<Map<String, dynamic>>('/company', data: {
        'name': _nameController.text.trim(),
        'phone': _phoneController.text.trim(),
        'address': _addressController.text.trim(),
      });
      ref.invalidate(companyProfileProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Kompaniya profili muvaffaqiyatli saqlandi')),
        );
      }
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.response?.data?['message']?.toString() ?? 'Xatolik yuz berdi'),
            backgroundColor: AppTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _savingProfile = false);
    }
  }

  Future<void> _saveReceiptSettings() async {
    if (!_receiptFormKey.currentState!.validate()) return;
    setState(() => _savingReceipt = true);
    final api = ref.read(apiClientProvider);
    try {
      await api.put<Map<String, dynamic>>('/company/receipt-settings', data: {
        'receiptPaperWidth': _paperWidth,
        'receiptHeaderText': _headerController.text.trim(),
        'receiptFooterText': _footerController.text.trim(),
        'receiptShowCashierName': _showCashier,
        'receiptShowBranchName': _showBranch,
        'receiptAutoPrint': _autoPrint,
        'receiptShowLogo': true,
        'receiptCurrencyLabel': 'so\'m',
      });
      ref.invalidate(companyProfileProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Chek sozlamalari muvaffaqiyatli saqlandi')),
        );
      }
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.response?.data?['message']?.toString() ?? 'Xatolik yuz berdi'),
            backgroundColor: AppTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _savingReceipt = false);
    }
  }

  Future<void> _toggleCreditSales(bool val) async {
    setState(() => _togglingCredit = true);
    final api = ref.read(apiClientProvider);
    try {
      await api.patch<Map<String, dynamic>>('/company/credit-sales', data: {
        'creditSalesEnabled': val,
      });
      setState(() => _creditSales = val);
      ref.invalidate(companyProfileProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(val ? 'Nasiya savdosi yoqildi' : 'Nasiya savdosi o\'chirildi')),
        );
      }
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.response?.data?['message']?.toString() ?? 'Xatolik yuz berdi'),
            backgroundColor: AppTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _togglingCredit = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final companyAsync = ref.watch(companyProfileProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Kompaniya va Kassa')),
      body: companyAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
                const SizedBox(height: 12),
                Text('Ma\'lumotlarni yuklab bo\'lmadi: $e', textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => ref.invalidate(companyProfileProvider),
                  child: const Text('Qayta urinish'),
                ),
              ],
            ),
          ),
        ),
        data: (company) {
          _populate(company);

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // Asosiy ma'lumotlar kartasi
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Form(
                  key: _profileFormKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.business, color: AppTheme.primary),
                          SizedBox(width: 8),
                          Text('Kompaniya Ma\'lumotlari', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Kompaniya kodi (Slug)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppTheme.background,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.vpn_key_outlined, size: 20, color: AppTheme.muted),
                            const SizedBox(width: 10),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Kompaniya kodi (Login uchun)', style: TextStyle(fontSize: 11, color: AppTheme.muted)),
                                Text(company.slug, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.primary)),
                              ],
                            ),
                            const Spacer(),
                            IconButton(
                              icon: const Icon(Icons.copy, size: 18, color: AppTheme.muted),
                              tooltip: 'Nusxa olish',
                              onPressed: () {
                                Clipboard.setData(ClipboardData(text: company.slug));
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Kompaniya kodi nusxalandi')),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),

                      TextFormField(
                        controller: _nameController,
                        decoration: const InputDecoration(
                          labelText: 'Kompaniya / Do\'kon nomi',
                          prefixIcon: Icon(Icons.storefront_outlined),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Kompaniya nomini kiriting' : null,
                      ),
                      const SizedBox(height: 14),

                      TextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          labelText: 'Aloqa telefoni',
                          prefixIcon: Icon(Icons.phone_outlined),
                        ),
                      ),
                      const SizedBox(height: 14),

                      TextFormField(
                        controller: _addressController,
                        decoration: const InputDecoration(
                          labelText: 'Do\'kon manzili',
                          prefixIcon: Icon(Icons.location_on_outlined),
                        ),
                      ),
                      const SizedBox(height: 16),

                      FilledButton(
                        onPressed: _savingProfile ? null : _saveProfile,
                        child: _savingProfile
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Kompaniyani saqlash'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Nasiya savdosi (Kredit)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFD97706).withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.handshake_outlined, color: Color(0xFFD97706), size: 24),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Nasiya savdosi (Kredit)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                          SizedBox(height: 2),
                          Text('Mijozlarga nasiyaga mahsulot berish imkoniyati', style: TextStyle(fontSize: 12, color: AppTheme.muted)),
                        ],
                      ),
                    ),
                    Switch(
                      value: _creditSales,
                      activeColor: const Color(0xFFD97706),
                      onChanged: _togglingCredit ? null : (v) => _toggleCreditSales(v),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Chek va printer sozlamalari kartasi
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Form(
                  key: _receiptFormKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.receipt_long, color: AppTheme.primary),
                          SizedBox(width: 8),
                          Text('Chek va Printer Sozlamalari', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Qog'oz formati
                      const Text('Qog\'oz kengligi:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: ChoiceChip(
                              label: const Center(child: Text('80 mm (Standart)')),
                              selected: _paperWidth == '80mm',
                              onSelected: (_) => setState(() => _paperWidth = '80mm'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: ChoiceChip(
                              label: const Center(child: Text('58 mm (Ixcham)')),
                              selected: _paperWidth == '58mm',
                              onSelected: (_) => setState(() => _paperWidth = '58mm'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      TextFormField(
                        controller: _headerController,
                        decoration: const InputDecoration(
                          labelText: 'Chek sarlavhasi (Header)',
                          hintText: 'Xush kelibsiz!',
                          prefixIcon: Icon(Icons.title),
                        ),
                      ),
                      const SizedBox(height: 14),

                      TextFormField(
                        controller: _footerController,
                        decoration: const InputDecoration(
                          labelText: 'Chek xulosasi (Footer)',
                          hintText: 'Xaridingiz uchun rahmat!',
                          prefixIcon: Icon(Icons.short_text),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Checkboxlar
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Kassir ismini chekda ko\'rsatish', style: TextStyle(fontSize: 14)),
                        value: _showCashier,
                        onChanged: (v) => setState(() => _showCashier = v),
                      ),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Filial nomini chekda ko\'rsatish', style: TextStyle(fontSize: 14)),
                        value: _showBranch,
                        onChanged: (v) => setState(() => _showBranch = v),
                      ),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Savdodan so\'ng avtomatik chop etish', style: TextStyle(fontSize: 14)),
                        value: _autoPrint,
                        onChanged: (v) => setState(() => _autoPrint = v),
                      ),
                      const SizedBox(height: 16),

                      FilledButton(
                        onPressed: _savingReceipt ? null : _saveReceiptSettings,
                        child: _savingReceipt
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Chek parametrlarini saqlash'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
