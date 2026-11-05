import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/branch_provider.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import 'staff_providers.dart';

class StaffFormScreen extends ConsumerStatefulWidget {
  const StaffFormScreen({super.key, this.user});

  final UserStaff? user;

  @override
  ConsumerState<StaffFormScreen> createState() => _StaffFormScreenState();
}

class _StaffFormScreenState extends ConsumerState<StaffFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _usernameController;
  late final TextEditingController _passwordController;
  late final TextEditingController _fullNameController;
  late final TextEditingController _salaryController;

  late String _role;
  int? _branchId;
  late bool _isActive;
  bool _obscurePassword = true;
  bool _submitting = false;

  bool get _isEdit => widget.user != null;

  @override
  void initState() {
    super.initState();
    final u = widget.user;
    _usernameController = TextEditingController(text: u?.username ?? '');
    _passwordController = TextEditingController();
    _fullNameController = TextEditingController(text: u?.fullName ?? '');
    _salaryController = TextEditingController(
      text: u?.baseSalary != null && u!.baseSalary! > 0 ? u.baseSalary!.toInt().toString() : '',
    );
    _role = u?.role ?? 'CASHIER';
    _branchId = u?.branchId;
    _isActive = u?.isActive ?? true;
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _fullNameController.dispose();
    _salaryController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_role != 'OWNER' && _branchId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Xodim uchun filial tanlanishi shart'), backgroundColor: AppTheme.danger),
      );
      return;
    }

    setState(() => _submitting = true);
    final repo = ref.read(staffRepositoryProvider);
    final salary = double.tryParse(_salaryController.text.trim());

    try {
      if (_isEdit) {
        await repo.updateUser(
          id: widget.user!.id,
          fullName: _fullNameController.text.trim(),
          role: _role,
          branchId: _branchId,
          baseSalary: salary,
          isActive: _isActive,
        );
      } else {
        await repo.createUser(
          username: _usernameController.text.trim(),
          password: _passwordController.text,
          fullName: _fullNameController.text.trim(),
          role: _role,
          branchId: _branchId,
          baseSalary: salary,
        );
      }

      ref.invalidate(staffListProvider);
      if (mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_isEdit ? 'Xodim ma\'lumotlari yangilandi' : 'Yangi xodim muvaffaqiyatli qo\'shildi')),
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
    final branchesAsync = ref.watch(branchesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Xodimni tahrirlash' : 'Yangi xodim qo\'shish'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _fullNameController,
                decoration: const InputDecoration(
                  labelText: 'F.I.O (Ism-sharifi)',
                  prefixIcon: Icon(Icons.person_outline),
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'F.I.O ni kiriting' : null,
              ),
              const SizedBox(height: 14),

              if (!_isEdit) ...[
                TextFormField(
                  controller: _usernameController,
                  decoration: const InputDecoration(
                    labelText: 'Login (foydalanuvchi nomi)',
                    prefixIcon: Icon(Icons.alternate_email),
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Loginni kiriting' : null,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: 'Parol',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Parolni kiriting';
                    if (v.length < 4) return 'Kamida 4 ta belgi bo\'lishi kerak';
                    return null;
                  },
                ),
                const SizedBox(height: 14),
              ],

              // Rol tanlash
              DropdownButtonFormField<String>(
                value: _role,
                decoration: const InputDecoration(
                  labelText: 'Tizimdagi roli',
                  prefixIcon: Icon(Icons.security),
                ),
                items: const [
                  DropdownMenuItem(value: 'CASHIER', child: Text('Kassir (faqat savdo va chek)')),
                  DropdownMenuItem(value: 'MANAGER', child: Text('Menejer (ombor, hisobot, tovarlar)')),
                  DropdownMenuItem(value: 'OWNER', child: Text('Do\'kon egasi (to\'liq huquq)')),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _role = val);
                },
              ),
              const SizedBox(height: 14),

              // Filial tanlash (agar OWNER bo'lmasa)
              if (_role != 'OWNER')
                branchesAsync.when(
                  loading: () => const LinearProgressIndicator(),
                  error: (e, _) => Text('Filiallarni yuklab bo\'lmadi: $e', style: const TextStyle(color: AppTheme.danger)),
                  data: (branches) {
                    if (_branchId == null && branches.isNotEmpty) {
                      _branchId = branches.first.id;
                    }
                    return DropdownButtonFormField<int>(
                      value: _branchId,
                      decoration: const InputDecoration(
                        labelText: 'Biriktirilgan filial',
                        prefixIcon: Icon(Icons.store),
                      ),
                      items: branches
                          .map((b) => DropdownMenuItem(value: b.id, child: Text(b.name)))
                          .toList(),
                      onChanged: (val) => setState(() => _branchId = val),
                    );
                  },
                ),
              if (_role != 'OWNER') const SizedBox(height: 14),

              TextFormField(
                controller: _salaryController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Oylik maoshi (so\'m)',
                  hintText: 'masalan: 3500000',
                  prefixIcon: Icon(Icons.payments_outlined),
                ),
              ),
              const SizedBox(height: 14),

              if (_isEdit)
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Xodim faol (tizimga kira oladi)'),
                  value: _isActive,
                  onChanged: (v) => setState(() => _isActive = v),
                ),
              const SizedBox(height: 24),

              FilledButton(
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(_isEdit ? 'O\'zgarishlarni saqlash' : 'Xodimni qo\'shish'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
