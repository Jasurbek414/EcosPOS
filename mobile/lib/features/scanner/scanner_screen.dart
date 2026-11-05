import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/api_client.dart';
import '../../core/branch_provider.dart';
import '../../core/formatters.dart';
import '../../core/providers.dart';
import '../../models/models.dart';
import '../../widgets/app_drawer.dart';
import '../auth/auth_controller.dart';
import '../stock/adjust_stock_sheet.dart';

enum _ScanState { scanning, loading, found, notFound, error }

/// Do'kon ichida telefon kamerasini shtrix-kod skaneri sifatida ishlatish — bu
/// ilovaning eng mobil-o'ziga xos funksiyasi. Oqim: skanerlash -> natija -> yopish
/// yoki qayta skanerlash, minimal bosishlar bilan.
class ScannerScreen extends ConsumerStatefulWidget {
  const ScannerScreen({super.key});

  @override
  ConsumerState<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends ConsumerState<ScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();
  _ScanState _state = _ScanState.scanning;
  Product? _product;
  String? _lastCode;
  String? _errorMessage;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_state != _ScanState.scanning) return;
    final code = capture.barcodes.isNotEmpty ? capture.barcodes.first.rawValue : null;
    if (code == null || code.isEmpty) return;

    setState(() {
      _state = _ScanState.loading;
      _lastCode = code;
    });
    // Natija ko'rsatilayotganda kamera bandligini to'xtatamiz; xato bo'lsa ham
    // muhim emas (ekrandan chiqishda ham dispose bo'ladi).
    // ignore: unawaited_futures
    _controller.stop();

    final api = ref.read(apiClientProvider);
    try {
      final res = await api.get<Map<String, dynamic>>('/products/barcode/$code');
      if (!mounted) return;
      setState(() {
        _product = Product.fromJson(res.data!);
        _state = _ScanState.found;
      });
    } catch (e) {
      if (!mounted) return;
      if (isNotFound(e)) {
        setState(() => _state = _ScanState.notFound);
      } else {
        setState(() {
          _state = _ScanState.error;
          _errorMessage = apiErrorMessage(e, fallback: 'Mahsulotni tekshirib bo\'lmadi');
        });
      }
    }
  }

  Future<void> _rescan() async {
    setState(() {
      _state = _ScanState.scanning;
      _product = null;
      _lastCode = null;
      _errorMessage = null;
    });
    await _controller.start();
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(authControllerProvider).session;

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Shtrix-kod skaneri')),
      body: Stack(
        children: [
          MobileScanner(controller: _controller, onDetect: _onDetect),
          _ScanFrameOverlay(showFrame: _state == _ScanState.scanning),
          if (_state != _ScanState.scanning)
            Align(
              alignment: Alignment.bottomCenter,
              child: _ResultPanel(
                state: _state,
                product: _product,
                code: _lastCode,
                errorMessage: _errorMessage,
                isManager: session?.isManager ?? false,
                isOwner: session?.isOwner ?? false,
                onRescan: _rescan,
              ),
            ),
        ],
      ),
    );
  }
}

class _ScanFrameOverlay extends StatelessWidget {
  const _ScanFrameOverlay({required this.showFrame});

  final bool showFrame;

  @override
  Widget build(BuildContext context) {
    if (!showFrame) return const SizedBox.shrink();
    return Center(
      child: Container(
        width: 240,
        height: 240,
        decoration: BoxDecoration(
          border: Border.all(color: Colors.white, width: 2),
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }
}

class _ResultPanel extends ConsumerWidget {
  const _ResultPanel({
    required this.state,
    required this.product,
    required this.code,
    required this.errorMessage,
    required this.isManager,
    required this.isOwner,
    required this.onRescan,
  });

  final _ScanState state;
  final Product? product;
  final String? code;
  final String? errorMessage;
  final bool isManager;
  final bool isOwner;
  final VoidCallback onRescan;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).padding.bottom + 20),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: _buildContent(context, ref),
    );
  }

  Widget _buildContent(BuildContext context, WidgetRef ref) {
    switch (state) {
      case _ScanState.loading:
        return const SizedBox(
          height: 100,
          child: Center(child: CircularProgressIndicator()),
        );
      case _ScanState.found:
        final p = product!;
        final branchId = isOwner ? ref.watch(selectedBranchIdProvider) : ref.watch(authControllerProvider).session?.branchId;
        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.check_circle, color: Color(0xFF059669)),
                const SizedBox(width: 8),
                Expanded(child: Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17))),
              ],
            ),
            const SizedBox(height: 10),
            _InfoRow(label: 'Birlik', value: p.unit),
            _InfoRow(label: 'Sotuv narxi', value: '${formatMoney(p.salePrice)} so\'m'),
            if (isManager) _InfoRow(label: 'Tannarx', value: '${formatMoney(p.costPrice)} so\'m'),
            const SizedBox(height: 16),
            if (isManager)
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(onPressed: onRescan, child: const Text('Qayta skanerlash')),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: branchId == null
                          ? null
                          : () async {
                              await showModalBottomSheet<StockAdjustmentResult>(
                                context: context,
                                isScrollControlled: true,
                                builder: (_) => AdjustStockSheet(
                                  productId: p.id,
                                  productName: p.name,
                                  unit: p.unit,
                                  branchId: branchId,
                                ),
                              );
                            },
                      child: const Text('Qoldiqni tuzatish'),
                    ),
                  ),
                ],
              )
            else
              SizedBox(
                width: double.infinity,
                child: FilledButton(onPressed: onRescan, child: const Text('Qayta skanerlash')),
              ),
            if (isManager && branchId == null) ...[
              const SizedBox(height: 8),
              Text(
                'Qoldiqni tuzatish uchun avval Qoldiqlar sahifasida filialni tanlang',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        );
      case _ScanState.notFound:
        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.search_off, color: Colors.grey, size: 36),
            const SizedBox(height: 8),
            const Text('Mahsulot topilmadi', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            if (code != null) ...[
              const SizedBox(height: 4),
              Text('Kod: $code', style: TextStyle(color: Colors.grey.shade600)),
            ],
            const SizedBox(height: 16),
            FilledButton(onPressed: onRescan, child: const Text('Qayta skanerlash')),
          ],
        );
      case _ScanState.error:
        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 36),
            const SizedBox(height: 8),
            Text(errorMessage ?? 'Xatolik yuz berdi', textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRescan, child: const Text('Qayta skanerlash')),
          ],
        );
      case _ScanState.scanning:
        return const SizedBox.shrink();
    }
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade600)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
