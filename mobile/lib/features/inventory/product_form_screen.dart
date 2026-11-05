import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import 'inventory_providers.dart';

class ProductFormScreen extends ConsumerStatefulWidget {
  const ProductFormScreen({super.key, this.product});

  final Product? product;

  bool get isEditing => product != null;

  @override
  ConsumerState<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends ConsumerState<ProductFormScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _nameController;
  late final TextEditingController _barcodeController;
  late final TextEditingController _costPriceController;
  late final TextEditingController _salePriceController;
  late final TextEditingController _minStockController;

  int? _selectedCategoryId;
  String _selectedUnit = 'dona';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    _nameController = TextEditingController(text: p?.name ?? '');
    _barcodeController = TextEditingController(text: p?.barcode ?? '');
    _costPriceController = TextEditingController(text: p != null ? p.costPrice.toStringAsFixed(0) : '');
    _salePriceController = TextEditingController(text: p != null ? p.salePrice.toStringAsFixed(0) : '');
    _minStockController = TextEditingController(text: p?.minStockLevel != null ? p!.minStockLevel!.toStringAsFixed(0) : '5');
    _selectedCategoryId = p?.categoryId;
    _selectedUnit = p?.unit ?? 'dona';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _barcodeController.dispose();
    _costPriceController.dispose();
    _salePriceController.dispose();
    _minStockController.dispose();
    super.dispose();
  }

  Future<void> _scanBarcode() async {
    final scannedCode = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.black,
      builder: (ctx) => Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          foregroundColor: Colors.white,
          title: const Text('Shtrix-kodni skanerlang', style: TextStyle(color: Colors.white)),
          leading: IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.of(ctx).pop(),
          ),
        ),
        body: Stack(
          alignment: Alignment.center,
          children: [
            MobileScanner(
              onDetect: (capture) {
                final barcode = capture.barcodes.firstOrNull;
                if (barcode?.rawValue != null && barcode!.rawValue!.isNotEmpty) {
                  Navigator.of(ctx).pop(barcode.rawValue);
                }
              },
            ),
            Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white, width: 2),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ],
        ),
      ),
    );

    if (scannedCode != null && scannedCode.isNotEmpty && mounted) {
      setState(() {
        _barcodeController.text = scannedCode;
      });
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final api = ref.read(apiClientProvider);
      final body = <String, dynamic>{
        'name': _nameController.text.trim(),
        'barcode': _barcodeController.text.trim().isEmpty ? null : _barcodeController.text.trim(),
        'unit': _selectedUnit,
        'costPrice': double.tryParse(_costPriceController.text) ?? 0,
        'salePrice': double.tryParse(_salePriceController.text) ?? 0,
        'minStockLevel': double.tryParse(_minStockController.text) ?? 0,
        if (_selectedCategoryId != null) 'categoryId': _selectedCategoryId,
      };

      if (widget.isEditing) {
        await api.put('/products/${widget.product!.id}', data: body);
      } else {
        await api.post('/products', data: body);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.isEditing ? 'Mahsulot yangilandi' : 'Mahsulot muvaffaqiyatli saqlandi'),
            backgroundColor: AppTheme.success,
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Xatolik: ${e.toString()}'),
            backgroundColor: AppTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _delete() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('O\'chirishni tasdiqlang'),
        content: const Text('Haqiqatan ham bu mahsulotni o\'chirmoqchimisiz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Bekor qilish'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppTheme.danger),
            child: const Text('O\'chirish'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.delete('/products/${widget.product!.id}');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Mahsulot o\'chirildi'),
            backgroundColor: AppTheme.warning,
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Xatolik: ${e.toString()}'),
            backgroundColor: AppTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final unitsAsync = ref.watch(measurementUnitsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isEditing ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'),
        actions: [
          if (widget.isEditing)
            IconButton(
              icon: const Icon(Icons.delete_outline, color: AppTheme.danger),
              onPressed: _isLoading ? null : _delete,
            ),
        ],
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
                    // Nomi
                    const Text('Mahsulot nomi *', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _nameController,
                      decoration: const InputDecoration(
                        hintText: 'Masalan: Olma, Coca-cola 1.5L',
                      ),
                      validator: (val) => val == null || val.trim().isEmpty ? 'Nomini kiriting' : null,
                    ),
                    const SizedBox(height: 16),

                    // Shtrix-kod
                    const Text('Shtrix-kod', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _barcodeController,
                      decoration: InputDecoration(
                        hintText: 'Shtrix-kod (ixtiyoriy)',
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.qr_code_scanner, color: AppTheme.primary),
                          onPressed: _scanBarcode,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // O'lchov birligi va Kategoriya
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Birlik', style: TextStyle(fontWeight: FontWeight.w600)),
                              const SizedBox(height: 6),
                              unitsAsync.when(
                                loading: () => const LinearProgressIndicator(),
                                error: (_, __) => _defaultUnitDropdown(),
                                data: (units) {
                                  if (units.isEmpty) return _defaultUnitDropdown();
                                  return DropdownButtonFormField<String>(
                                    value: units.any((u) => u.shortName == _selectedUnit)
                                        ? _selectedUnit
                                        : units.first.shortName,
                                    decoration: const InputDecoration(),
                                    items: units
                                        .map((u) => DropdownMenuItem(value: u.shortName, child: Text(u.name)))
                                        .toList(),
                                    onChanged: (val) {
                                      if (val != null) setState(() => _selectedUnit = val);
                                    },
                                  );
                                },
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Kategoriya', style: TextStyle(fontWeight: FontWeight.w600)),
                              const SizedBox(height: 6),
                              categoriesAsync.when(
                                loading: () => const LinearProgressIndicator(),
                                error: (_, __) => const Text('Yuklanmadi'),
                                data: (categories) => DropdownButtonFormField<int?>(
                                  value: _selectedCategoryId,
                                  decoration: const InputDecoration(),
                                  hint: const Text('Tanlang'),
                                  items: [
                                    const DropdownMenuItem(value: null, child: Text('Kategoriyasiz')),
                                    ...categories.map(
                                      (c) => DropdownMenuItem(value: c.id, child: Text(c.name)),
                                    ),
                                  ],
                                  onChanged: (val) => setState(() => _selectedCategoryId = val),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Narxlar: Tannarx va Sotish narxi
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Tannarxi (so\'m)', style: TextStyle(fontWeight: FontWeight.w600)),
                              const SizedBox(height: 6),
                              TextFormField(
                                controller: _costPriceController,
                                keyboardType: TextInputType.number,
                                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                decoration: const InputDecoration(hintText: '0'),
                                validator: (val) => val == null || val.trim().isEmpty ? 'Kiritilmadi' : null,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Sotish narxi (so\'m) *', style: TextStyle(fontWeight: FontWeight.w600)),
                              const SizedBox(height: 6),
                              TextFormField(
                                controller: _salePriceController,
                                keyboardType: TextInputType.number,
                                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                decoration: const InputDecoration(hintText: '0'),
                                validator: (val) => val == null || val.trim().isEmpty ? 'Kiritilmadi' : null,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Minimal qoldiq
                    const Text('Minimal qoldiq (ogohlantirish uchun)', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _minStockController,
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      decoration: const InputDecoration(hintText: '5'),
                    ),
                    const SizedBox(height: 32),

                    // Saqlash tugmasi
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _save,
                        icon: const Icon(Icons.check),
                        label: Text(widget.isEditing ? 'O\'zgarishlarni saqlash' : 'Mahsulotni yaratish'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _defaultUnitDropdown() {
    final list = ['dona', 'kg', 'litr', 'metr', 'pachka'];
    return DropdownButtonFormField<String>(
      value: list.contains(_selectedUnit) ? _selectedUnit : 'dona',
      decoration: const InputDecoration(),
      items: list.map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(),
      onChanged: (val) {
        if (val != null) setState(() => _selectedUnit = val);
      },
    );
  }
}
