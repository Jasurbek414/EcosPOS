import 'package:flutter/material.dart';

/// Filial ma'lumotini yuklab bo'lmaganda ko'rsatiladi.
///
/// Avval bu holatda ekran abadiy aylanardi: xato ham, yuklanish ham bir xil
/// `null` qiymat berardi va foydalanuvchi ilovani majburan yopishdan boshqa
/// hech narsa qila olmasdi.
class BranchLoadError extends StatelessWidget {
  const BranchLoadError({super.key, required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off_outlined, size: 44, color: Colors.grey.shade500),
            const SizedBox(height: 12),
            const Text(
              'Ma\'lumotni yuklab bo\'lmadi',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            Text(
              'Internet aloqasini tekshirib, qayta urinib ko\'ring.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Qayta urinish'),
            ),
          ],
        ),
      ),
    );
  }
}
