import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/branch_provider.dart';
import '../models/models.dart';

/// OWNER uchun filial tanlagich — faqat OWNER roli filial tanlashi kerak bo'lgan
/// ekranlarda (Qoldiqlar, Skanerlash, Savdolar) ko'rsatiladi. MANAGER/CASHIER uchun
/// backend o'zi filialni biladi, shuning uchun bu widget ular uchun chaqirilmaydi.
///
/// Flutter'ning turli versiyalarida DropdownButtonFormField parametr nomi
/// o'zgarishi mumkinligi sababli (value/initialValue), ataylab oddiy tugma +
/// bottom sheet asosidagi o'z tanlagichimiz ishlatiladi — buzilmaydigan yechim.
class BranchPicker extends ConsumerWidget {
  const BranchPicker({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final branchesAsync = ref.watch(branchesProvider);
    final selectedId = ref.watch(selectedBranchIdProvider);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: branchesAsync.when(
        loading: () => const LinearProgressIndicator(minHeight: 2),
        error: (e, _) => Text(
          'Filiallar ro\'yxatini yuklab bo\'lmadi',
          style: TextStyle(color: Theme.of(context).colorScheme.error),
        ),
        data: (branches) {
          if (branches.isEmpty) {
            return const Text('Filiallar topilmadi');
          }
          final selected = branches.where((b) => b.id == selectedId).cast<Branch?>().firstOrNull;
          return InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () async {
              final chosen = await showModalBottomSheet<int>(
                context: context,
                showDragHandle: true,
                builder: (context) => SafeArea(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(bottom: 8),
                        child: Text('Filialni tanlang', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                      ),
                      for (final b in branches)
                        ListTile(
                          leading: Icon(
                            b.id == selectedId ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                            color: b.id == selectedId ? Theme.of(context).colorScheme.primary : null,
                          ),
                          title: Text(b.name),
                          subtitle: b.address == null || b.address!.isEmpty ? null : Text(b.address!),
                          onTap: () => Navigator.of(context).pop(b.id),
                        ),
                    ],
                  ),
                ),
              );
              if (chosen != null) {
                ref.read(selectedBranchIdProvider.notifier).state = chosen;
              }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.store_outlined),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      selected?.name ?? 'Filialni tanlang',
                      style: TextStyle(
                        fontWeight: FontWeight.w500,
                        color: selected == null ? Colors.grey.shade600 : null,
                      ),
                    ),
                  ),
                  const Icon(Icons.expand_more),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
