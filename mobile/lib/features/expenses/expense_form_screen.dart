import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/branch_provider.dart';
import '../../core/providers.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_controller.dart';
import 'expenses_providers.dart';

class ExpenseFormScreen extends ConsumerStatefulWidget {
  const ExpenseFormScreen({super.key});

  @override
  ConsumerState<ExpenseFormScreen> createState() => _ExpenseFormScreenState();
}

class _ExpenseFormScreenState extends ConsumerState<ExpenseFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();

  String? _selectedCategory;
  bool _isLoading = false;

  final List<String> _defaultCategories = [
    'Ijara',
    'Kommunal',
    'Ish haqi',
    'Transport / Yetkazib berish',
    'Oziq-ovqat / Tushlik',
    'Kantselyariya / Xo\'jalik',
    'Reklama va Marketing',
    'Soliqlar',
    'Boshqa xarajatlar',
  ];

  @override
  void dispose() {
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  String _generateCategoryCode(String name) {
    const uzMap = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'j', 'з': 'z',
      'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
      'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x', 'ц': 'ts', 'ch': 'ch', 'ш': 'sh', 'щ': 'sh',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': 'o', 'ғ': 'g', 'q': 'q', 'h': 'h'
    };
    String res = name.trim().toLowerCase();
    uzMap.forEach((k, v) => res = res.replaceAll(k, v));
    res = res.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '_').replaceAll(RegExp(r'_+'), '_');
    if (res.startsWith('_')) res = res.substring(1);
    if (res.endsWith('_')) res = res.substring(0, res.length - 1);
    
    final suffix = (DateTime.now().millisecondsSinceEpoch % 10000).toString();
    if (res.isEmpty) {
      res = 'CAT_$suffix';
    } else {
      if (res.length > 22) res = res.substring(0, 22);
      res = '${res}_$suffix';
    }
    if (res.length > 30) res = res.substring(0, 30);
    return res;
  }

  Future<void> _showAddCategoryDialog() async {
    final catNameController = TextEditingController();
    bool isSavingCat = false;
    String? catError;

    final createdName = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.category_outlined, color: AppTheme.primary),
              SizedBox(width: 10),
              Text('Yangi xarajat toifasi', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Masalan: "Ofis jihozlari", "Yoqilg\'i / Benzin", "Uskuna ta\'miri"',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: catNameController,
                autofocus: true,
                decoration: InputDecoration(
                  labelText: 'Toifa nomi *',
                  hintText: 'Xarajat toifasi nomini yozing',
                  errorText: catError,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: isSavingCat ? null : () => Navigator.pop(ctx),
              child: const Text('Bekor qilish'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: isSavingCat
                  ? null
                  : () async {
                      final name = catNameController.text.trim();
                      if (name.isEmpty) {
                        setDialogState(() => catError = 'Toifa nomini kiriting');
                        return;
                      }

                      setDialogState(() {
                        isSavingCat = true;
                        catError = null;
                      });

                      try {
                        final api = ref.read(apiClientProvider);
                        final code = _generateCategoryCode(name);
                        await api.post('/expense-categories', data: {
                          'code': code,
                          'name': name,
                        });

                        ref.invalidate(expenseCategoriesProvider);
                        if (ctx.mounted) Navigator.pop(ctx, name);
                      } catch (e) {
                        setDialogState(() {
                          isSavingCat = false;
                          catError = 'Saqlashda xatolik yuz berdi';
                        });
                      }
                    },
              child: isSavingCat
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Saqlash'),
            ),
          ],
        ),
      ),
    );

    if (createdName != null && mounted) {
      setState(() {
        _selectedCategory = createdName;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('"$createdName" toifasi muvaffaqiyatli qo\'shildi'),
          backgroundColor: AppTheme.success,
        ),
      );
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCategory == null || _selectedCategory == '__ADD_NEW__') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Xarajat toifasini tanlang'), backgroundColor: AppTheme.warning),
      );
      return;
    }

    final session = ref.read(authControllerProvider).session;
    final branchId = session?.branchId ?? ref.read(selectedBranchIdProvider);

    setState(() => _isLoading = true);

    try {
      final api = ref.read(apiClientProvider);
      final body = {
        'branchId': branchId,
        'category': _selectedCategory,
        'amount': double.tryParse(_amountController.text) ?? 0,
        'description': _noteController.text.trim().isEmpty ? null : _noteController.text.trim(),
        'expenseDate': DateTime.now().toIso8601String().substring(0, 10),
      };

      await api.post('/expenses', data: body);

      if (mounted) {
        ref.invalidate(expensesListProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Xarajat muvaffaqiyatli saqlandi'), backgroundColor: AppTheme.success),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Xatolik: ${e.toString()}'), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(expenseCategoriesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Yangi xarajat'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Summa
                    const Text('Xarajat summasi (so\'m) *', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _amountController,
                      keyboardType: TextInputType.number,
                      autofocus: true,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      decoration: const InputDecoration(hintText: 'Masalan: 50 000'),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'Summani kiriting';
                        if ((double.tryParse(val) ?? 0) <= 0) return 'Summa musbat bo\'lishi kerak';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Toifa sarlavhasi va yangi toifa qo'shish tugmasi
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Xarajat toifasi *', style: TextStyle(fontWeight: FontWeight.w600)),
                        TextButton.icon(
                          onPressed: _showAddCategoryDialog,
                          icon: const Icon(Icons.add_circle_outline, size: 16),
                          label: const Text('Yangi toifa', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          style: TextButton.styleFrom(
                            foregroundColor: AppTheme.primary,
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    categoriesAsync.when(
                      loading: () => const LinearProgressIndicator(),
                      error: (_, __) => _buildCategoryDropdown(_defaultCategories),
                      data: (cats) {
                        final list = cats.isNotEmpty ? cats.map((c) => c.name).toList() : _defaultCategories;
                        return _buildCategoryDropdown(list);
                      },
                    ),
                    const SizedBox(height: 16),

                    // Izoh
                    const Text('Izoh / Tafsilot', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _noteController,
                      maxLines: 3,
                      decoration: const InputDecoration(hintText: 'Xarajat sababi yoki to\'lov qabul qiluvchi'),
                    ),
                    const SizedBox(height: 32),

                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _save,
                        icon: const Icon(Icons.check),
                        label: const Text('Xarajatni saqlash'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildCategoryDropdown(List<String> categories) {
    // Agar tanlangan toifa mavjud bo'lmasa lekin ro'yxatda bo'lsa
    final items = <DropdownMenuItem<String>>[];

    for (final cat in categories) {
      items.add(DropdownMenuItem(value: cat, child: Text(cat)));
    }

    // Qo'shimcha: toifalar oxirida tezkor "+ Yangi toifa qo'shish" amali
    items.add(
      const DropdownMenuItem(
        value: '__ADD_NEW__',
        child: Row(
          children: [
            Icon(Icons.add, color: AppTheme.primary, size: 20),
            SizedBox(width: 8),
            Text(
              '+ Yangi toifa qo\'shish...',
              style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );

    return DropdownButtonFormField<String>(
      value: categories.contains(_selectedCategory) ? _selectedCategory : null,
      decoration: const InputDecoration(hintText: 'Toifani tanlang'),
      items: items,
      onChanged: (val) {
        if (val == '__ADD_NEW__') {
          _showAddCategoryDialog();
        } else {
          setState(() => _selectedCategory = val);
        }
      },
      validator: (val) => (val == null || val == '__ADD_NEW__') ? 'Toifani tanlang' : null,
    );
  }
}
