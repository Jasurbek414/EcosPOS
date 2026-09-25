import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/branch_provider.dart';
import '../../widgets/branch_load_error.dart';
import '../../core/formatters.dart';
import '../../core/providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_controller.dart';

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
              decoration: BoxDecoration(
                color: const Color(0xFFDBEAFE),
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
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              decoration: const InputDecoration(
                hintText: '0',
                suffixText: 'so\'m',
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppTheme.danger)),
            ],
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _submitting ? null : _openShift,
                child: _submitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
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
// Faol smena — POS ekrani
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

  double get _total => _cart.fold(0, (sum, item) => sum + item.subtotal);

  void _addToCart(Product product) {
    setState(() {
      final idx = _cart.indexWhere((c) => c.product.id == product.id);
      if (idx >= 0) {
        _cart[idx] = _cart[idx].copyWith(quantity: _cart[idx].quantity + 1);
      } else {
        _cart.add(CartItem(product: product, quantity: 1));
      }
    });
  }

  void _removeFromCart(int index) {
    setState(() => _cart.removeAt(index));
  }

  void _updateQuantity(int index, double qty) {
    if (qty <= 0) {
      _removeFromCart(index);
      return;
    }
    setState(() => _cart[index] = _cart[index].copyWith(quantity: qty));
  }

  /// Aralash to'lov uchun karta summasini so'raydi. Bekor qilinsa null qaytaradi.
  Future<double?> _askCardAmount() async {
    final controller = TextEditingController();
    String? xato;
    return showDialog<double>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) => AlertDialog(
          title: const Text('Aralash to\'lov'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Jami: ${formatMoney(_total)} so\'m'),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                autofocus: true,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d.,]'))],
                decoration: InputDecoration(
                  labelText: 'Karta orqali',
                  suffixText: 'so\'m',
                  errorText: xato,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Bekor qilish'),
            ),
            FilledButton(
              onPressed: () {
                final karta = double.tryParse(controller.text.replaceAll(',', '.'));
                if (karta == null || karta <= 0 || karta >= _total) {
                  setDialogState(() => xato = '0 dan katta va jamidan kichik bo\'lsin');
                  return;
                }
                Navigator.of(dialogContext).pop(karta);
              },
              child: const Text('Davom etish'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submitSale(String method) async {
    if (_cart.isEmpty) return;

    // Aralash to'lovda karta qismini SO'RASH SHART: backend cardAmount'siz MIXED
    // so'rovini rad etadi (0 < cardAmount < jami bo'lishi kerak), shuning uchun
    // avval bu tugma har doim xato berardi.
    double? cardAmount;
    if (method == 'MIXED') {
      cardAmount = await _askCardAmount();
      if (cardAmount == null) return; // foydalanuvchi bekor qildi
    }

    setState(() {
      _submitting = true;
    });

    try {
      final api = ref.read(apiClientProvider);
      final data = <String, dynamic>{
        'items': _cart
            .map((c) => {'productId': c.product.id, 'quantity': c.quantity})
            .toList(),
        'paymentMethod': method,
        // MIXED'da kassaga faqat naqd qismi tushadi, karta qismi drawer'ga tegmaydi.
        'amountPaid': method == 'CARD' ? 0 : (method == 'MIXED' ? _total - cardAmount! : _total),
        if (method == 'MIXED') 'cardAmount': cardAmount,
      };
      await api.post<Map<String, dynamic>>('/sales', data: data);
      setState(() {
        _cart.clear();
        _submitting = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Sotuv amalga oshirildi!'), backgroundColor: AppTheme.success),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(apiErrorMessage(e, fallback: 'Sotuvni amalga oshirib bo\'lmadi')), backgroundColor: AppTheme.danger),
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
                  width: 40, height: 4,
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
                            '${formatMoney(item.product.salePrice)} x ${formatQuantity(item.quantity)} = ${formatMoney(item.subtotal)} so\'m',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
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
                                '${formatQuantity(qty)}',
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
              width: 40, height: 4,
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
            label: 'Naqd',
            color: AppTheme.success,
            onPressed: submitting ? null : () => onPay('CASH'),
          ),
          const SizedBox(height: 12),
          _PaymentButton(
            icon: Icons.credit_card,
            label: 'Karta',
            color: const Color(0xFF2563EB),
            onPressed: submitting ? null : () => onPay('CARD'),
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
