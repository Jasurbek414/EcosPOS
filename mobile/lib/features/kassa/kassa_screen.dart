import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/api_client.dart';
import '../../core/branch_provider.dart';
import '../../core/formatters.dart';
import '../../core/providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/branch_load_error.dart';
import '../auth/auth_controller.dart';
import '../customers/customers_providers.dart';

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

/// Joriy ochiq kassa smenasi (yoki yo'q).
final currentShiftProvider = FutureProvider.autoDispose<CashShift?>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final res = await api.get<Map<String, dynamic>>('/cash-shifts/current');
    if (res.data == null) return null;
    return CashShift.fromJson(res.data!);
  } on Exception catch (e) {
    if (isNotFound(e)) return null;
    rethrow;
  }
});

/// Do'kon mahsulotlari — qidiruv uchun.
final productsSearchProvider = FutureProvider.autoDispose<List<Product>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<List<dynamic>>('/products');
  return (res.data ?? []).map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
});

// ---------------------------------------------------------------------------
// Kassa Screen
// ---------------------------------------------------------------------------

class KassaScreen extends ConsumerWidget {
  const KassaScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authControllerProvider).session;
    if (session == null) return const SizedBox.shrink();
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Kassa')),
      body: _ShiftBody(isOwner: session.isOwner),
    );
  }
}

class _ShiftBody extends ConsumerWidget {
  const _ShiftBody({required this.isOwner});
  final bool isOwner;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (isOwner && ref.watch(selectedBranchIdProvider) == null) {
      if (ref.watch(branchLoadFailedProvider)) {
        return BranchLoadError(onRetry: () => ref.invalidate(branchesProvider));
      }
      return const Center(child: CircularProgressIndicator());
    }

    final shiftAsync = ref.watch(currentShiftProvider);

    return shiftAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 40, color: Colors.grey),
            const SizedBox(height: 8),
            const Text('Smena ma\'lumotini yuklab bo\'lmadi'),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => ref.invalidate(currentShiftProvider),
              child: const Text('Qayta urinish'),
            ),
          ],
        ),
      ),
      data: (shift) {
        if (shift == null) return const _OpenShiftView();
        return _ActiveShiftView(shift: shift);
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Smena ochish ekrani
// ---------------------------------------------------------------------------

class _OpenShiftView extends ConsumerStatefulWidget {
  const _OpenShiftView();

  @override
  ConsumerState<_OpenShiftView> createState() => _OpenShiftViewState();
}

class _OpenShiftViewState extends ConsumerState<_OpenShiftView> {
  final _cashController = TextEditingController(text: '0');
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _cashController.dispose();
    super.dispose();
  }

  Future<void> _openShift() async {
    final cash = double.tryParse(_cashController.text.replaceAll(',', '.'));
    if (cash == null || cash < 0) {
      setState(() => _error = 'Noto\'g\'ri summa');
      return;
    }

    final session = ref.read(authControllerProvider).session;
    final branchId = session?.isOwner == true
        ? ref.read(selectedBranchIdProvider)
        : session?.branchId;

    if (branchId == null) {
      setState(() => _error = 'Filial tanlanmagan');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final api = ref.read(apiClientProvider);
      await api.post<Map<String, dynamic>>('/cash-shifts/open', data: {
        'branchId': branchId,
        'openingCash': cash,
      });
      ref.invalidate(currentShiftProvider);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = apiErrorMessage(e, fallback: 'Smenani ochib bo\'lmadi');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: Color(0xFFDBEAFE),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.point_of_sale, size: 48, color: Color(0xFF2563EB)),
            ),
            const SizedBox(height: 20),
            const Text('Smenani ochish', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(
              'Boshlang\'ich naqd summani kiriting',
              style: TextStyle(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 24),
            TextFormField(
              controller: _cashController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d.,]'))],
              decoration: InputDecoration(
                labelText: 'Boshlang\'ich naqd pul (so\'m)',
                prefixIcon: const Icon(Icons.payments_outlined),
                errorText: _error,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _submitting ? null : _openShift,
                child: _submitting
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Smenani ochish'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Faol smena va savat ekrani
// ---------------------------------------------------------------------------

class _ActiveShiftView extends ConsumerStatefulWidget {
  const _ActiveShiftView({required this.shift});
  final CashShift shift;

  @override
  ConsumerState<_ActiveShiftView> createState() => _ActiveShiftViewState();
}

class _ActiveShiftViewState extends ConsumerState<_ActiveShiftView> {
  final List<CartItem> _cart = [];
  String _searchQuery = '';
  bool _submitting = false;

  double get _total => _cart.fold(0, (sum, i) => sum + i.subtotal);

  void _addToCart(Product product) {
    setState(() {
      final index = _cart.indexWhere((c) => c.product.id == product.id);
      if (index >= 0) {
        _cart[index] = _cart[index].copyWith(quantity: _cart[index].quantity + 1);
      } else {
        _cart.add(CartItem(product: product, quantity: 1));
      }
    });
  }

  void _updateQuantity(int index, double quantity) {
    setState(() {
      if (quantity <= 0) {
        _cart.removeAt(index);
      } else {
        _cart[index] = _cart[index].copyWith(quantity: quantity);
      }
    });
  }

  Future<void> _scanBarcodeForCart() async {
    final products = await ref.read(productsSearchProvider.future);
    if (!mounted) return;

    final scanned = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.black,
      builder: (ctx) => Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          foregroundColor: Colors.white,
          title: const Text('Shtrix-kodni skanerlang', style: TextStyle(color: Colors.white)),
          leading: IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(ctx).pop()),
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

    if (scanned != null && scanned.isNotEmpty && mounted) {
      final found = products.where((p) => p.barcode == scanned).firstOrNull;
      if (found != null) {
        _addToCart(found);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${found.name} savatga qo\'shildi'),
            backgroundColor: AppTheme.success,
            duration: const Duration(seconds: 1),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Shtrix-kod bo\'yicha mahsulot topilmadi: $scanned'), backgroundColor: AppTheme.warning),
        );
      }
    }
  }

  Future<double?> _askCardAmount() async {
    final controller = TextEditingController();
    String? error;
    return showDialog<double>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          title: const Text('Karta summasini kiriting'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Jami to\'lov: ${formatMoney(_total)} so\'m'),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                autofocus: true,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Karta orqali to\'lanadigan qismi',
                  errorText: error,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(ctx).pop(null), child: const Text('Bekor qilish')),
            FilledButton(
              onPressed: () {
                final val = double.tryParse(controller.text) ?? 0;
                if (val <= 0 || val >= _total) {
                  setDlgState(() => error = 'Summa 0 va jami summa orasida bo\'lishi kerak');
                  return;
                }
                Navigator.of(ctx).pop(val);
              },
              child: const Text('Davom etish'),
            ),
          ],
        ),
      ),
    );
  }

  Future<Customer?> _pickCustomerModal() async {
    final customers = await ref.read(customersListProvider(null).future);
    if (!mounted) return null;

    return showModalBottomSheet<Customer>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        String q = '';
        return StatefulBuilder(
          builder: (context, setModalState) {
            final filtered = customers.where((c) {
              if (q.isEmpty) return true;
              return c.fullName.toLowerCase().contains(q.toLowerCase()) ||
                  (c.phone != null && c.phone!.contains(q));
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
                    decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                  ),
                  const Text('Nasiya uchun mijozni tanlang', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: TextField(
                      decoration: const InputDecoration(hintText: 'Mijoz qidirish...', prefixIcon: Icon(Icons.search)),
                      onChanged: (val) => setModalState(() => q = val),
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
                        final c = filtered[idx];
                        return ListTile(
                          leading: CircleAvatar(child: Text(c.fullName.isNotEmpty ? c.fullName[0].toUpperCase() : 'M')),
                          title: Text(c.fullName, style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text(c.phone ?? 'Telefon yo\'q'),
                          onTap: () => Navigator.of(ctx).pop(c),
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

  void _showReceiptDialog(double totalAmount, String method, List<CartItem> items, String? customerName) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Center(
          child: Column(
            children: [
              Icon(Icons.check_circle, color: AppTheme.success, size: 54),
              SizedBox(height: 8),
              Text('Savdo muvaffaqiyatli!', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            ],
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '${formatMoney(totalAmount)} so\'m',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppTheme.primary),
            ),
            const SizedBox(height: 4),
            Text(
              'To\'lov usuli: ${method == "CASH" ? "Naqd pul" : method == "CARD" ? "Plastik karta" : method == "CREDIT" ? "Nasiya (Qarz)" : "Aralash"}',
              style: const TextStyle(color: AppTheme.muted, fontSize: 13),
            ),
            if (customerName != null) ...[
              const SizedBox(height: 4),
              Text('Mijoz: $customerName', style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
            const Divider(height: 24),
            Text('${items.length} xil mahsulot sotildi', style: const TextStyle(fontSize: 13, color: AppTheme.muted)),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Tayyor'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submitSale(String method) async {
    if (_cart.isEmpty) return;

    double? cardAmount;
    Customer? selectedCustomer;

    if (method == 'MIXED') {
      cardAmount = await _askCardAmount();
      if (cardAmount == null) return;
    } else if (method == 'CREDIT') {
      selectedCustomer = await _pickCustomerModal();
      if (selectedCustomer == null) return; // bekor qilindi
    }

    setState(() => _submitting = true);

    try {
      final api = ref.read(apiClientProvider);
      final saleTotal = _total;
      final cartCopy = List<CartItem>.from(_cart);

      final data = <String, dynamic>{
        'items': _cart.map((c) => {'productId': c.product.id, 'quantity': c.quantity}).toList(),
        'paymentMethod': method,
        'amountPaid': method == 'CARD' || method == 'CREDIT'
            ? 0
            : (method == 'MIXED' ? _total - cardAmount! : _total),
        if (method == 'MIXED') 'cardAmount': cardAmount,
        if (method == 'CREDIT') 'customerId': selectedCustomer!.id,
      };

      await api.post<Map<String, dynamic>>('/sales', data: data);

      setState(() {
        _cart.clear();
        _submitting = false;
      });

      if (mounted) {
        _showReceiptDialog(saleTotal, method, cartCopy, selectedCustomer?.fullName);
        ref.invalidate(currentShiftProvider);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(apiErrorMessage(e, fallback: 'Sotuvni amalga oshirib bo\'lmadi')),
          backgroundColor: AppTheme.danger,
        ),
      );
    }
  }

  void _showPaymentDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _PaymentSheet(
        total: _total,
        submitting: _submitting,
        onPay: (method) {
          Navigator.of(context).pop();
          _submitSale(method);
        },
      ),
    );
  }

  void _showCloseShiftDialog() {
    final cashController = TextEditingController(text: '0');
    final noteController = TextEditingController();
    bool closing = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const Text('Smenani yopish', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
              const SizedBox(height: 8),
              Text(
                'Kutilgan naqd: ${formatMoney(widget.shift.openingCash + _total)} so\'m',
                style: TextStyle(color: Colors.grey.shade600),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: cashController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d.,]'))],
                decoration: const InputDecoration(
                  labelText: 'Haqiqiy naqd summa',
                  prefixIcon: Icon(Icons.payments_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: noteController,
                decoration: const InputDecoration(
                  labelText: 'Izoh (ixtiyoriy)',
                  prefixIcon: Icon(Icons.notes_outlined),
                ),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: closing
                    ? null
                    : () async {
                        final cash = double.tryParse(cashController.text.replaceAll(',', '.'));
                        if (cash == null || cash < 0) return;
                        setSheetState(() => closing = true);
                        try {
                          final api = ref.read(apiClientProvider);
                          await api.post<Map<String, dynamic>>(
                            '/cash-shifts/${widget.shift.id}/close',
                            data: {
                              'closingCash': cash,
                              'note': noteController.text.trim().isEmpty ? null : noteController.text.trim(),
                            },
                          );
                          ref.invalidate(currentShiftProvider);
                          if (context.mounted) Navigator.of(context).pop();
                        } catch (e) {
                          setSheetState(() => closing = false);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(apiErrorMessage(e)), backgroundColor: AppTheme.danger),
                            );
                          }
                        }
                      },
                child: closing
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Smenani yopish'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Smena info
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          color: const Color(0xFFECFDF5),
          child: Row(
            children: [
              const Icon(Icons.circle, color: AppTheme.success, size: 10),
              const SizedBox(width: 8),
              Text(
                'Smena #${widget.shift.id} · Boshlang\'ich: ${formatMoney(widget.shift.openingCash)} so\'m',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
              ),
              const Spacer(),
              TextButton(
                onPressed: _cart.isNotEmpty ? null : _showCloseShiftDialog,
                style: TextButton.styleFrom(foregroundColor: AppTheme.danger),
                child: const Text('Yopish', style: TextStyle(fontSize: 13)),
              ),
            ],
          ),
        ),

        // Savat
        if (_cart.isNotEmpty) _buildCart(),

        // Mahsulotlar qidiruvi + ro'yxati
        Expanded(child: _buildProductList()),
      ],
    );
  }

  Widget _buildCart() {
    return Container(
      constraints: const BoxConstraints(maxHeight: 180),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Column(
        children: [
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: _cart.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final item = _cart[index];
                return Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.product.name, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
                          Text(
                            '${formatMoney(item.product.salePrice)} so\'m × ${formatQuantity(item.quantity)} = ${formatMoney(item.subtotal)} so\'m',
                            style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline, size: 22),
                          onPressed: () => _updateQuantity(index, item.quantity - 1),
                          visualDensity: VisualDensity.compact,
                        ),
                        Text(formatQuantity(item.quantity), style: const TextStyle(fontWeight: FontWeight.w600)),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline, size: 22),
                          onPressed: () => _updateQuantity(index, item.quantity + 1),
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ),
                  ],
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              border: Border(top: BorderSide(color: Colors.grey.shade200)),
            ),
            child: Row(
              children: [
                Text('Jami:', style: TextStyle(color: Colors.grey.shade600)),
                const SizedBox(width: 8),
                Text(
                  '${formatMoney(_total)} so\'m',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const Spacer(),
                SizedBox(
                  height: 38,
                  child: FilledButton(
                    onPressed: _submitting ? null : _showPaymentDialog,
                    child: const Text('To\'lash'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductList() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  onChanged: (v) => setState(() => _searchQuery = v.toLowerCase()),
                  decoration: InputDecoration(
                    hintText: 'Mahsulot qidirish...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    filled: true,
                    fillColor: const Color(0xFFF1F5F9),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: _scanBarcodeForCart,
                icon: const Icon(Icons.qr_code_scanner),
                style: IconButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.all(12),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ref.watch(productsSearchProvider).when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline, size: 40, color: Colors.grey),
                  const SizedBox(height: 8),
                  const Text('Mahsulotlarni yuklab bo\'lmadi'),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () => ref.invalidate(productsSearchProvider),
                    child: const Text('Qayta urinish'),
                  ),
                ],
              ),
            ),
            data: (products) {
              final filtered = _searchQuery.isEmpty
                  ? products
                  : products.where((p) =>
                      p.name.toLowerCase().contains(_searchQuery) ||
                      (p.barcode ?? '').toLowerCase().contains(_searchQuery)).toList();

              if (filtered.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.inventory_2_outlined, size: 48, color: Colors.grey.shade300),
                      const SizedBox(height: 8),
                      Text('Mahsulot topilmadi', style: TextStyle(color: Colors.grey.shade500)),
                    ],
                  ),
                );
              }

              return RefreshIndicator(
                onRefresh: () async => ref.invalidate(productsSearchProvider),
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final p = filtered[index];
                    final inCart = _cart.where((c) => c.product.id == p.id);
                    final qty = inCart.isNotEmpty ? inCart.first.quantity : 0;

                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                      title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.w500)),
                      subtitle: Text('${formatMoney(p.salePrice)} so\'m · ${p.unit}'),
                      trailing: qty > 0
                          ? Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppTheme.primary,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                formatQuantity(qty),
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                            )
                          : IconButton(
                              icon: const Icon(Icons.add_circle_outline, color: AppTheme.primary),
                              onPressed: () => _addToCart(p),
                            ),
                      onTap: () => _addToCart(p),
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// To'lov paneli
// ---------------------------------------------------------------------------

class _PaymentSheet extends StatelessWidget {
  const _PaymentSheet({required this.total, required this.submitting, required this.onPay});

  final double total;
  final bool submitting;
  final void Function(String method) onPay;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).padding.bottom + 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const Text('To\'lov usulini tanlang', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
          const SizedBox(height: 8),
          Text(
            'Jami: ${formatMoney(total)} so\'m',
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primary),
          ),
          const SizedBox(height: 20),
          _PaymentButton(
            icon: Icons.payments_outlined,
            label: 'Naqd pul',
            color: AppTheme.success,
            onPressed: submitting ? null : () => onPay('CASH'),
          ),
          const SizedBox(height: 12),
          _PaymentButton(
            icon: Icons.credit_card,
            label: 'Plastik karta',
            color: const Color(0xFF2563EB),
            onPressed: submitting ? null : () => onPay('CARD'),
          ),
          const SizedBox(height: 12),
          _PaymentButton(
            icon: Icons.person_pin_outlined,
            label: 'Nasiya (Qarzga sotish)',
            color: AppTheme.danger,
            onPressed: submitting ? null : () => onPay('CREDIT'),
          ),
          const SizedBox(height: 12),
          _PaymentButton(
            icon: Icons.account_balance_wallet_outlined,
            label: 'Aralash (Naqd + Karta)',
            color: const Color(0xFF9333EA),
            onPressed: submitting ? null : () => onPay('MIXED'),
          ),
        ],
      ),
    );
  }
}

class _PaymentButton extends StatelessWidget {
  const _PaymentButton({required this.icon, required this.label, required this.color, required this.onPressed});

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, color: color),
        label: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600)),
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: color.withOpacity(0.3)),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }
}
