import 'package:flutter/material.dart';
import '../../widgets/app_drawer.dart';
import '../stock/stock_screen.dart';
import 'movements_tab.dart';
import 'products_screen.dart';
import 'receipts_screen.dart';
import 'suppliers_tab.dart';

class InventoryHubScreen extends StatefulWidget {
  const InventoryHubScreen({super.key});

  @override
  State<InventoryHubScreen> createState() => _InventoryHubScreenState();
}

class _InventoryHubScreenState extends State<InventoryHubScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Ombor va Mahsulotlar'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: const [
            Tab(icon: Icon(Icons.category_outlined, size: 20), text: 'Katalog'),
            Tab(icon: Icon(Icons.inventory_2_outlined, size: 20), text: 'Qoldiqlar'),
            Tab(icon: Icon(Icons.input_rounded, size: 20), text: 'Kirim (Prixod)'),
            Tab(icon: Icon(Icons.local_shipping_outlined, size: 20), text: 'Ta\'minotchilar'),
            Tab(icon: Icon(Icons.history_rounded, size: 20), text: 'Harakatlar'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          ProductsScreen(isTab: true),
          StockScreen(isTab: true),
          ReceiptsScreen(isTab: true),
          SuppliersTab(),
          MovementsTab(),
        ],
      ),
    );
  }
}
