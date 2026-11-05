import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/formatters.dart';
import '../../core/providers.dart';
import '../../theme/app_theme.dart';
import 'customers_providers.dart';

class CustomerDebtScreen extends ConsumerStatefulWidget {
  const CustomerDebtScreen({
    super.key,
    required this.customerId,
    required this.customerName,
    this.phone,
    required this.currentDebt,
  });

  final int customerId;
  final String customerName;
  final String? phone;
  final double currentDebt;

  @override
  ConsumerState<CustomerDebtScreen> createState() => _CustomerDebtScreenState();
}

class _CustomerDebtScreenState extends ConsumerState<CustomerDebtScreen> {
  late double _debt;

  @override
  void initState() {
    super.initState();
    _debt = widget.currentDebt;
  }

  Future<void> _openPaymentModal() async {
    final amountController = TextEditingController();
    final noteController = TextEditingController();
    String paymentMethod = 'CASH';
    bool isSubmitting = false;

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Qarz to\'lovini qabul qilish',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                'Mijoz: ${widget.customerName}',
                style: const TextStyle(color: AppTheme.muted, fontSize: 13),
              ),
              const SizedBox(height: 16),

              // To'lov summasi
              const Text('To\'lov summasi (so\'m) *', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                autofocus: true,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: const InputDecoration(hintText: 'Summani kiriting'),
              ),
              const SizedBox(height: 14),

              // To'lov usuli
              const Text('To\'lov turi', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(child: Text('Naqd pul')),
                      selected: paymentMethod == 'CASH',
                      onSelected: (selected) {
                        if (selected) setModalState(() => paymentMethod = 'CASH');
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(child: Text('Karta / O\'tkazma')),
                      selected: paymentMethod == 'CARD',
                      onSelected: (selected) {
                        if (selected) setModalState(() => paymentMethod = 'CARD');
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Izoh
              const Text('Izoh (ixtiyoriy)', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              TextField(
                controller: noteController,
                decoration: const InputDecoration(hintText: 'Qarz to\'lovi izohi'),
              ),
              const SizedBox(height: 24),

              // Tasdiqlash tugmasi
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          final amount = double.tryParse(amountController.text) ?? 0;
                          if (amount <= 0) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('To\'g\'ri summa kiriting'), backgroundColor: AppTheme.warning),
                            );
                            return;
                          }

                          setModalState(() => isSubmitting = true);
                          try {
                            final api = ref.read(apiClientProvider);
                            await api.post('/customer-debts/payments', data: {
                              'customerId': widget.customerId,
                              'amount': amount,
                              'paymentMethod': paymentMethod,
                              'transactionDate': DateTime.now().toIso8601String().substring(0, 10),
                              'note': noteController.text.trim().isEmpty ? null : noteController.text.trim(),
                            });

                            if (mounted) {
                              Navigator.of(ctx).pop(true);
                            }
                          } catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Xatolik: $e'), backgroundColor: AppTheme.danger),
                              );
                              setModalState(() => isSubmitting = false);
                            }
                          }
                        },
                  style: FilledButton.styleFrom(backgroundColor: AppTheme.success),
                  child: isSubmitting
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white))
                      : const Text('To\'lovni qabul qilish'),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    if (result == true && mounted) {
      ref.invalidate(customerTransactionsProvider(widget.customerId));
      ref.invalidate(customerBalancesProvider);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('To\'lov muvaffaqiyatli saqlandi'), backgroundColor: AppTheme.success),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final historyAsync = ref.watch(customerTransactionsProvider(widget.customerId));

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.customerName),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
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
                    const Text('Joriy qarzdorlik', style: TextStyle(fontSize: 12, color: AppTheme.muted)),
                    Text(
                      '${formatMoney(_debt)} so\'m',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: _debt > 0 ? AppTheme.danger : AppTheme.success,
                      ),
                    ),
                  ],
                ),
              ),
              FilledButton.icon(
                onPressed: _openPaymentModal,
                style: FilledButton.styleFrom(
                  backgroundColor: AppTheme.success,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                ),
                icon: const Icon(Icons.payment),
                label: const Text('Qarz to\'lash'),
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
            // Mijoz ma'lumotlari kartasi
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: AppTheme.primaryLight,
                    child: Text(
                      widget.customerName.isNotEmpty ? widget.customerName[0].toUpperCase() : 'M',
                      style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w700, fontSize: 18),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.customerName,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                        ),
                        const SizedBox(height: 4),
                        if (widget.phone != null && widget.phone!.isNotEmpty)
                          Row(
                            children: [
                              const Icon(Icons.phone_outlined, size: 14, color: AppTheme.muted),
                              const SizedBox(width: 4),
                              Text(widget.phone!, style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
                            ],
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            const Text(
              'Tranzaksiyalar tarixi (Nasiya va To\'lovlar)',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),

            historyAsync.when(
              loading: () => const Center(child: Padding(padding: EdgeInsets.all(30), child: CircularProgressIndicator())),
              error: (err, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      const Text('Tarixni yuklab bo\'lmadi'),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () => ref.invalidate(customerTransactionsProvider(widget.customerId)),
                        child: const Text('Qayta urinish'),
                      ),
                    ],
                  ),
                ),
              ),
              data: (transactions) {
                if (transactions.isEmpty) {
                  return Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(30),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: const Center(
                      child: Text('Tranzaksiyalar mavjud emas', style: TextStyle(color: AppTheme.muted)),
                    ),
                  );
                }

                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: transactions.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final item = transactions[index];
                    final isPayment = item.type == 'PAYMENT';
                    final isWriteOff = item.type == 'WRITE_OFF';

                    Color color = AppTheme.danger;
                    String typeTitle = 'Nasiya savdo';
                    IconData icon = Icons.arrow_upward;

                    if (isPayment) {
                      color = AppTheme.success;
                      typeTitle = 'Qarz to\'lovi';
                      icon = Icons.arrow_downward;
                    } else if (isWriteOff) {
                      color = Colors.grey;
                      typeTitle = 'Hisobdan chiqarish';
                      icon = Icons.cancel_outlined;
                    }

                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: color.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(icon, color: color, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  typeTitle,
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  formatDate(item.transactionDate),
                                  style: const TextStyle(fontSize: 12, color: AppTheme.muted),
                                ),
                                if (item.note != null && item.note!.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    item.note!,
                                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontStyle: FontStyle.italic),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          Text(
                            '${isPayment ? '-' : '+'}${formatMoney(item.amount)} so\'m',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                              color: color,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
