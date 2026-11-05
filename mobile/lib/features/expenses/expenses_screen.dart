import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../core/branch_provider.dart';
import '../../core/formatters.dart';
import '../../core/providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_drawer.dart';
import '../auth/auth_controller.dart';
import 'expense_form_screen.dart';
import 'expenses_providers.dart';

class ExpensesScreen extends ConsumerWidget {
  const ExpensesScreen({super.key});

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

  void _showAddCategoryDialog(BuildContext context, WidgetRef ref) {
    final catNameController = TextEditingController();
    bool isSavingCat = false;
    String? catError;

    showDialog(
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
                        if (ctx.mounted) {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('"$name" toifasi muvaffaqiyatli qo\'shildi'),
                              backgroundColor: AppTheme.success,
                            ),
                          );
                        }
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
  }

  void _showCategoriesSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Consumer(
          builder: (context, ref, _) {
            final catsAsync = ref.watch(expenseCategoriesProvider);

            return DraggableScrollableSheet(
              initialChildSize: 0.65,
              minChildSize: 0.4,
              maxChildSize: 0.9,
              expand: false,
              builder: (_, scrollCtrl) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: [
                    Container(
                      margin: const EdgeInsets.symmetric(vertical: 12),
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Xarajat toifalari',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                        ),
                        FilledButton.icon(
                          onPressed: () => _showAddCategoryDialog(context, ref),
                          icon: const Icon(Icons.add, size: 16),
                          label: const Text('Yangi toifa'),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Expanded(
                      child: catsAsync.when(
                        loading: () => const Center(child: CircularProgressIndicator()),
                        error: (e, _) => Center(child: Text('Yuklashda xatolik: $e')),
                        data: (cats) {
                          if (cats.isEmpty) {
                            return const Center(child: Text('Toifalar hali kiritilmagan'));
                          }
                          return ListView.separated(
                            controller: scrollCtrl,
                            itemCount: cats.length,
                            separatorBuilder: (_, __) => const Divider(height: 1),
                            itemBuilder: (ctx, i) {
                              final cat = cats[i];
                              return ListTile(
                                leading: CircleAvatar(
                                  radius: 18,
                                  backgroundColor: AppTheme.primary.withOpacity(0.1),
                                  child: const Icon(Icons.category, color: AppTheme.primary, size: 18),
                                ),
                                title: Text(cat.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                                subtitle: cat.code.isNotEmpty
                                    ? Text('Kod: ${cat.code}', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)))
                                    : null,
                              );
                            },
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authControllerProvider).session;
    final branchId = ref.watch(selectedBranchIdProvider);
    final expensesAsync = ref.watch(expensesListProvider(branchId));

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Xarajatlar'),
        actions: [
          IconButton(
            icon: const Icon(Icons.category_outlined),
            tooltip: 'Xarajat toifalari',
            onPressed: () => _showCategoriesSheet(context, ref),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(expensesListProvider),
          ),
        ],
      ),
      floatingActionButton: (session?.isManager ?? false)
          ? FloatingActionButton.extended(
              onPressed: () async {
                final added = await Navigator.of(context).push<bool>(
                  MaterialPageRoute(builder: (_) => const ExpenseFormScreen()),
                );
                if (added == true) {
                  ref.invalidate(expensesListProvider);
                }
              },
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add),
              label: const Text('Xarajat qo\'shish'),
            )
          : null,
      body: expensesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
              const SizedBox(height: 12),
              const Text('Xarajatlarni yuklab bo\'lmadi'),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => ref.invalidate(expensesListProvider),
                child: const Text('Qayta urinish'),
              ),
            ],
          ),
        ),
        data: (expenses) {
          final totalExpense = expenses.fold(0.0, (sum, e) => sum + e.amount);

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(expensesListProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Jami xarajat kartasi
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppTheme.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Jami Xarajatlar',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.muted,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '${formatMoney(totalExpense)} so\'m',
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.danger,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${expenses.length} ta operatsiya',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppTheme.muted,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Xarajatlar ro'yxati
                if (expenses.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(32),
                    alignment: Alignment.center,
                    child: Column(
                      children: [
                        Icon(Icons.receipt_long_outlined, size: 48, color: Colors.grey.shade400),
                        const SizedBox(height: 12),
                        const Text(
                          'Hozircha xarajatlar yo\'q',
                          style: TextStyle(fontSize: 16, color: AppTheme.muted),
                        ),
                      ],
                    ),
                  )
                else ...[
                  const Text(
                    'Oxirgi xarajatlar',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...expenses.map((expense) => _ExpenseCard(expense: expense)),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ExpenseCard extends StatelessWidget {
  const _ExpenseCard({required this.expense});

  final Expense expense;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.outbox_rounded, color: AppTheme.danger, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  expense.category,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                ),
                const SizedBox(height: 2),
                Text(
                  formatDate(expense.expenseDate),
                  style: const TextStyle(fontSize: 12, color: AppTheme.muted),
                ),
                if (expense.note != null && expense.note!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    expense.note!,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ],
            ),
          ),
          Text(
            '-${formatMoney(expense.amount)} so\'m',
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 15,
              color: AppTheme.danger,
            ),
          ),
        ],
      ),
    );
  }
}
