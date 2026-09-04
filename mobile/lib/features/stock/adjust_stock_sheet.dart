import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/providers.dart';
import 'stock_providers.dart';

/// Shtrix-kod skaneridan ham (bir dona mahsulot uchun), qoldiqlar ro'yxatidan ham
/// ochiladigan tezkor tuzatish oynasi. Faqat OWNER/MANAGER uchun chaqiriladi
/// (CASHIER uchun bu ekranga umuman kirish tugmasi ko'rsatilmaydi).
class AdjustStockSheet extends ConsumerStatefulWidget {
  const AdjustStockSheet({
    super.key,
    required this.productId,
    required this.productName,
    required this.unit,
    required this.branchId,
    this.currentQuantity,
  });

  final int productId;
  final String productName;
  final String unit;
  final int branchId;
  final double? currentQuantity;

  @override
  ConsumerState<AdjustStockSheet> createState() => _AdjustStockSheetState();
}

class _AdjustStockSheetState extends ConsumerState<AdjustStockSheet> {
  final _formKey = GlobalKey<FormState>();
  final _deltaController = TextEditingController();
  final _reasonController = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _deltaController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final delta = double.parse(_deltaController.text.replaceAll(',', '.'));
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final result = await adjustStock(
        ref.read(apiClientProvider),
        branchId: widget.branchId,
        productId: widget.productId,
        quantityDelta: delta,
        reason: _reasonController.text.trim(),
      );
      ref.invalidate(lowStockProvider);
      if (!mounted) return;
      Navigator.of(context).pop(result);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = apiErrorMessage(e, fallback: 'Qoldiqni yangilab bo\'lmadi');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Form(
        key: _formKey,
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
            Text(widget.productName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
            if (widget.currentQuantity != null) ...[
              const SizedBox(height: 4),
              Text(
                'Hozirgi qoldiq: ${widget.currentQuantity} ${widget.unit}',
                style: TextStyle(color: Colors.grey.shade600),
              ),
            ],
            const SizedBox(height: 18),
            TextFormField(
              controller: _deltaController,
              keyboardType: const TextInputType.numberWithOptions(signed: true, decimal: true),
              decoration: InputDecoration(
                labelText: 'O\'zgarish miqdori (${widget.unit})',
                hintText: 'Masalan: -3 yoki 10',
                prefixIcon: const Icon(Icons.exposure),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Miqdorni kiriting';
                final parsed = double.tryParse(v.replaceAll(',', '.'));
                if (parsed == null) return 'Noto\'g\'ri son';
                if (parsed == 0) return 'Nol bo\'lishi mumkin emas';
                return null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _reasonController,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Sabab',
                hintText: 'Masalan: inventarizatsiya, buzilgan tovar',
                prefixIcon: Icon(Icons.notes_outlined),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Sababni kiriting' : null,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 18),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Saqlash'),
            ),
          ],
        ),
      ),
    );
  }
}
