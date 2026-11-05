import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../theme/app_theme.dart';
import '../staff/staff_providers.dart';
import 'payroll_providers.dart';

class SalaryPaymentSheet extends ConsumerStatefulWidget {
  const SalaryPaymentSheet({super.key});

  @override
  ConsumerState<SalaryPaymentSheet> createState() => _SalaryPaymentSheetState();
}

class _SalaryPaymentSheetState extends ConsumerState<SalaryPaymentSheet> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();

  int? _selectedUserId;
  late String _periodMonth;
  late DateTime _paymentDate;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _paymentDate = now;
    _periodMonth = DateFormat('yyyy-MM').format(now);
  }

  @override
  void dispose() {
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedUserId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Xodimni tanlang'), backgroundColor: AppTheme.danger),
      );
      return;
    }

    final amount = double.tryParse(_amountController.text.trim()) ?? 0;
    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Summa musbat bo\'lishi kerak'), backgroundColor: AppTheme.danger),
      );
      return;
    }

    setState(() => _submitting = true);
    final repo = ref.read(payrollRepositoryProvider);
    final dateStr = DateFormat('yyyy-MM-dd').format(_paymentDate);

    try {
      await repo.createPayment(
        userId: _selectedUserId!,
        amount: amount,
        periodMonth: _periodMonth,
        paymentDate: dateStr,
        note: _noteController.text.trim().isEmpty ? null : _noteController.text.trim(),
      );

      ref.invalidate(salaryPaymentsProvider);
      if (mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Maosh to\'lovi muvaffaqiyatli saqlandi')),
        );
      }
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.response?.data?['message']?.toString() ?? 'Xatolik yuz berdi'),
            backgroundColor: AppTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final staffAsync = ref.watch(staffListProvider);

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Icon(Icons.payments, color: Color(0xFF059669)),
                  const SizedBox(width: 8),
                  const Text('Oylik Maosh To\'lash', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const Spacer(),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(context).pop()),
                ],
              ),
              const SizedBox(height: 16),

              // Xodim tanlash
              staffAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text('Xodimlarni yuklab bo\'lmadi: $e', style: const TextStyle(color: AppTheme.danger)),
                data: (users) {
                  return DropdownButtonFormField<int>(
                    value: _selectedUserId,
                    decoration: const InputDecoration(
                      labelText: 'Xodimni tanlang',
                      prefixIcon: Icon(Icons.person),
                    ),
                    items: users
                        .map((u) => DropdownMenuItem(
                              value: u.id,
                              child: Text('${u.fullName} (${u.role})'),
                            ))
                        .toList(),
                    onChanged: (val) {
                      setState(() {
                        _selectedUserId = val;
                        final user = users.firstWhere((u) => u.id == val);
                        if (user.baseSalary != null && user.baseSalary! > 0) {
                          _amountController.text = user.baseSalary!.toInt().toString();
                        }
                      });
                    },
                    validator: (v) => v == null ? 'Xodimni tanlang' : null,
                  );
                },
              ),
              const SizedBox(height: 14),

              TextFormField(
                controller: _amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'To\'lov summasi (so\'m)',
                  prefixIcon: Icon(Icons.attach_money),
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Summani kiriting' : null,
              ),
              const SizedBox(height: 14),

              Row(
                children: [
                  // Oylik davr (yyyy-MM)
                  Expanded(
                    child: InkWell(
                      onTap: () async {
                        final now = DateTime.now();
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: _paymentDate,
                          firstDate: DateTime(now.year - 2),
                          lastDate: DateTime(now.year + 1),
                        );
                        if (picked != null) {
                          setState(() {
                            _paymentDate = picked;
                            _periodMonth = DateFormat('yyyy-MM').format(picked);
                          });
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                        decoration: BoxDecoration(
                          color: AppTheme.background,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Oylik davri:', style: TextStyle(fontSize: 11, color: AppTheme.muted)),
                            const SizedBox(height: 4),
                            Text(_periodMonth, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // To'lov sanasi
                  Expanded(
                    child: InkWell(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: _paymentDate,
                          firstDate: DateTime(2020),
                          lastDate: DateTime(2030),
                        );
                        if (picked != null) {
                          setState(() => _paymentDate = picked);
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                        decoration: BoxDecoration(
                          color: AppTheme.background,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('To\'lov sanasi:', style: TextStyle(fontSize: 11, color: AppTheme.muted)),
                            const SizedBox(height: 4),
                            Text(DateFormat('dd.MM.yyyy').format(_paymentDate), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              TextFormField(
                controller: _noteController,
                decoration: const InputDecoration(
                  labelText: 'Izoh (ixtiyoriy)',
                  prefixIcon: Icon(Icons.notes),
                ),
              ),
              const SizedBox(height: 20),

              FilledButton(
                onPressed: _submitting ? null : _submit,
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFF059669)),
                child: _submitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('To\'lovni tasdiqlash'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
