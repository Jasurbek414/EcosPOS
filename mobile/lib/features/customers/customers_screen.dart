import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/formatters.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_drawer.dart';
import 'customer_debt_screen.dart';
import 'customer_form_screen.dart';
import 'customers_providers.dart';

class CustomersScreen extends ConsumerStatefulWidget {
  const CustomersScreen({super.key});

  @override
  ConsumerState<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends ConsumerState<CustomersScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final balancesAsync = ref.watch(customerBalancesProvider);
    final customersAsync = ref.watch(customersListProvider(_searchQuery));

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Mijozlar va Nasiya'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(customerBalancesProvider);
              ref.invalidate(customersListProvider);
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Nasiya daftari'),
            Tab(text: 'Barcha mijozlar'),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final added = await Navigator.of(context).push<bool>(
            MaterialPageRoute(builder: (_) => const CustomerFormScreen()),
          );
          if (added == true) {
            ref.invalidate(customersListProvider);
          }
        },
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.person_add),
        label: const Text('Yangi mijoz'),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // 1-Tab: Nasiya daftari (Qarzdorlar)
          balancesAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, _) => Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
                  const SizedBox(height: 12),
                  const Text('Qarzdorlik ma\'lumotlarini yuklab bo\'lmadi'),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () => ref.invalidate(customerBalancesProvider),
                    child: const Text('Qayta urinish'),
                  ),
                ],
              ),
            ),
            data: (balances) {
              final totalDebt = balances.fold(0.0, (sum, b) => sum + b.balance);

              return RefreshIndicator(
                onRefresh: () async => ref.invalidate(customerBalancesProvider),
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Jami qarz kartasi
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFDC2626), Color(0xFFEF4444)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.red.withOpacity(0.3),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.account_balance_wallet_outlined, color: Colors.white70, size: 18),
                              SizedBox(width: 8),
                              Text(
                                'Jami kutilayotgan nasiya (qarz)',
                                style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            '${formatMoney(totalDebt)} so\'m',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '${balances.length} ta qarzdor mijoz',
                            style: const TextStyle(color: Colors.white, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    if (balances.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(40),
                        alignment: Alignment.center,
                        child: Column(
                          children: [
                            const Icon(Icons.check_circle_outline, size: 56, color: AppTheme.success),
                            const SizedBox(height: 12),
                            const Text(
                              'Hozircha hech kimda qarz yo\'q',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Barcha hisob-kitoblar to\'liq amalga oshirilgan',
                              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                            ),
                          ],
                        ),
                      )
                    else ...[
                      const Text(
                        'Qarzdorlar ro\'yxati',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 10),
                      ...balances.map((b) => _DebtorCard(
                            balance: b,
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => CustomerDebtScreen(
                                    customerId: b.customerId,
                                    customerName: b.customerFullName,
                                    phone: b.customerPhone,
                                    currentDebt: b.balance,
                                  ),
                                ),
                              );
                            },
                          )),
                    ],
                  ],
                ),
              );
            },
          ),

          // 2-Tab: Barcha mijozlar
          Column(
            children: [
              Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Mijoz nomi yoki telefoni bo\'yicha...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 20),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                  ),
                  onChanged: (val) => setState(() => _searchQuery = val),
                ),
              ),
              Expanded(
                child: customersAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, _) => Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('Mijozlarni yuklab bo\'lmadi'),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: () => ref.invalidate(customersListProvider),
                          child: const Text('Qayta urinish'),
                        ),
                      ],
                    ),
                  ),
                  data: (customers) {
                    if (customers.isEmpty) {
                      return const Center(child: Text('Mijozlar topilmadi'));
                    }

                    return RefreshIndicator(
                      onRefresh: () async => ref.invalidate(customersListProvider),
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: customers.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, idx) {
                          final c = customers[idx];
                          return Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppTheme.border),
                            ),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: AppTheme.primaryLight,
                                child: Text(
                                  c.fullName.isNotEmpty ? c.fullName[0].toUpperCase() : 'M',
                                  style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w700),
                                ),
                              ),
                              title: Text(c.fullName, style: const TextStyle(fontWeight: FontWeight.w700)),
                              subtitle: Text(
                                c.phone ?? 'Telefon kiritilmagan',
                                style: const TextStyle(fontSize: 13, color: AppTheme.muted),
                              ),
                              trailing: const Icon(Icons.chevron_right, color: AppTheme.muted),
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => CustomerDebtScreen(
                                      customerId: c.id,
                                      customerName: c.fullName,
                                      phone: c.phone,
                                      currentDebt: c.balance,
                                    ),
                                  ),
                                );
                              },
                            ),
                          );
                        },
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DebtorCard extends StatelessWidget {
  const _DebtorCard({required this.balance, required this.onTap});

  final CustomerBalance balance;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: AppTheme.dangerLight,
          child: const Icon(Icons.warning_amber_rounded, color: AppTheme.danger),
        ),
        title: Text(
          balance.customerFullName,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
        subtitle: balance.customerPhone != null && balance.customerPhone!.isNotEmpty
            ? Text(balance.customerPhone!, style: const TextStyle(color: AppTheme.muted, fontSize: 13))
            : null,
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            const Text('Qarz', style: TextStyle(fontSize: 11, color: AppTheme.danger, fontWeight: FontWeight.w600)),
            Text(
              '${formatMoney(balance.balance)} so\'m',
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 15,
                color: AppTheme.danger,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
