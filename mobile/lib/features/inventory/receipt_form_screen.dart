import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/branch_provider.dart';
import '../../core/formatters.dart';
import '../../core/providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_controller.dart';
import 'inventory_providers.dart';

class ReceiptFormScreen extends ConsumerStatefulWidget {
  const ReceiptFormScreen({super.key});

  @override
  ConsumerState<ReceiptFormScreen> createState() => _ReceiptFormScreenState();
}

class _ReceiptItemInput {
  _ReceiptItemInput({
    required this.product,
    required this.quantity,
    required this.costPrice,
  });

  final Product product;
  double quantity;
  double costPrice;

  double get total => quantity * costPrice;
}

class _ReceiptFormScreenState extends ConsumerState<ReceiptFormScreen> {
  int? _selectedSupplierId;
  final _noteController = TextEditingController();
  final List<_ReceiptItemInput> _items = [];
  bool _isLoading = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  double get _totalAmount => _items.fold(0.0, (sum, i) => sum + i.total);

  void _addProduct(Product product) {
    // Agar ro'yxatda allaqachon bo'lsa, sonini 1 ga oshirish
    final index = _items.indexWhere((i) => i.product.id == product.id);
    setState(() {
      if (index >= 0) {
        _items[index].quantity += 1;
      } else {
        _items.add(_ReceiptItemInput(
          product: product,
          quantity: 1,
          costPrice: product.costPrice,
        ));
      }
    });
  }

  Future<void> _pickProductModal() async {
    final products = await ref.read(productsListProvider(null).future);
    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        String query = '';
        return StatefulBuilder(
          builder: (context, setModalState) {
            final filtered = products.where((p) {
              if (query.isEmpty) return true;
              return p.name.toLowerCase().contains(query.toLowerCase()) ||
                  (p.barcode != null && p.barcode!.contains(query));
            }).toList();

            return DraggableScrollableSheet(
              initialChildSize: 0.8,
              minChildSize: 0.5,
              maxChildSize: 0.95,
              expand: false,
              builder: (_, scrollCtrl) => Column(
                children: [
                  Container(
                    margin: const EdgeInsets.symmetric(vertical: 12),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: TextField(
                      decoration: const InputDecoration(
                        hintText: 'Tovarni qidirish...',
                        prefixIcon: Icon(Icons.search),
                      ),
                      onChanged: (val) => setModalState(() => query = val),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Expanded(
                    child: ListView.separated(
                      controller: scrollCtrl,
                      padding: const EdgeInsets.all(16),
                      itemCount: filtered.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, idx) {
                        final p = filtered[idx];
                        return ListTile(
                          title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text('Tannarx: ${formatMoney(p.costPrice)} so\'m | Birlik: ${p.unit}'),
                          trailing: const Icon(Icons.add_circle, color: AppTheme.primary),
                          onTap: () {
                            _addProduct(p);
                            Navigator.of(ctx).pop();
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _submit() async {
    if (_items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Kamida bitta tovar qo\'shing'), backgroundColor: AppTheme.warning),
      );
      return;
    }

    final session = ref.read(authControllerProvider).session;
    final branchId = session?.branchId ?? ref.read(selectedBranchIdProvider);

    if (branchId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Filial tanlanmagan'), backgroundColor: AppTheme.danger),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final api = ref.read(apiClientProvider);
      final body = {
        'branchId': branchId,
        'supplierId': _selectedSupplierId,
        'receiptDate': DateTime.now().toIso8601String().substring(0, 10),
        'note': _noteController.text.trim().isEmpty ? null : _noteController.text.trim(),
        'items': _items
            .map((i) => {
                  'productId': i.product.id,
                  'quantity': i.quantity,
                  'costPrice': i.costPrice,
                })
            .toList(),
      };

      await api.post('/goods-receipts', data: body);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Kirim muvaffaqiyatli qabul qilindi'), backgroundColor: AppTheme.success),
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
    final suppliersAsync = ref.watch(suppliersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Yangi kirim (Prixod)'),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Jami summa', style: TextStyle(fontSize: 12, color: AppTheme.muted)),
                    Text(
                      '${formatMoney(_totalAmount)} so\'m',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.primary),
                    ),
                  ],
                ),
              ),
              FilledButton(
                onPressed: _isLoading ? null : _submit,
                style: FilledButton.styleFrom(
                  backgroundColor: AppTheme.success,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                ),
                child: _isLoading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white))
                    : const Text('Qabul qilish'),
              ),
            ],
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Yetkazib beruvchi
            const Text('Yetkazib beruvchi', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            suppliersAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (_, __) => const Text('Yetkazib beruvchilarni yuklab bo\'lmadi'),
              data: (suppliers) => DropdownButtonFormField<int?>(
                value: _selectedSupplierId,
                decoration: const InputDecoration(hintText: 'Yetkazib beruvchini tanlang'),
                items: [
                  const DropdownMenuItem(value: null, child: Text('Noma\'lum yetkazib beruvchi')),
                  ...suppliers.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name))),
                ],
                onChanged: (val) => setState(() => _selectedSupplierId = val),
              ),
            ),
            const SizedBox(height: 16),

            // Izoh
            const Text('Izoh / Hujjat raqami', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            TextField(
              controller: _noteController,
              decoration: const InputDecoration(hintText: 'Masalan: Hisob-faktura № 451'),
            ),
            const SizedBox(height: 24),

            // Mahsulotlar ro'yxati sarlavhasi
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Tovarlar (${_items.length})',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
                TextButton.icon(
                  onPressed: _pickProductModal,
                  icon: const Icon(Icons.add),
                  label: const Text('Tovar qo\'shish'),
                ),
              ],
            ),
            const SizedBox(height: 8),

            if (_items.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 40),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Center(
                  child: Column(
                    children: [
                      Icon(Icons.add_shopping_cart, size: 40, color: Colors.grey.shade400),
                      const SizedBox(height: 8),
                      Text(
                        'Kirim qilish uchun tovar tanlang',
                        style: TextStyle(color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _items.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final item = _items[index];
                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                item.product.name,
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close, size: 20, color: AppTheme.danger),
                              onPressed: () {
                                setState(() => _items.removeAt(index));
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            // Miqdor
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Miqdor (${item.product.unit})', style: const TextStyle(fontSize: 11, color: AppTheme.muted)),
                                  const SizedBox(height: 4),
                                  TextFormField(
                                    initialValue: item.quantity.toStringAsFixed(0),
                                    keyboardType: TextInputType.number,
                                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                    decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                                    onChanged: (val) {
                                      final q = double.tryParse(val) ?? 0;
                                      setState(() => item.quantity = q);
                                    },
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            // Kirim narxi
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Kirim narxi (so\'m)', style: TextStyle(fontSize: 11, color: AppTheme.muted)),
                                  const SizedBox(height: 4),
                                  TextFormField(
                                    initialValue: item.costPrice.toStringAsFixed(0),
                                    keyboardType: TextInputType.number,
                                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                    decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                                    onChanged: (val) {
                                      final c = double.tryParse(val) ?? 0;
                                      setState(() => item.costPrice = c);
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Align(
                          alignment: Alignment.centerRight,
                          child: Text(
                            'Jami: ${formatMoney(item.total)} so\'m',
                            style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.primary),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
