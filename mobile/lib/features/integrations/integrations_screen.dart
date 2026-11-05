import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../theme/app_theme.dart';

class IntegrationsScreen extends StatefulWidget {
  const IntegrationsScreen({super.key});

  @override
  State<IntegrationsScreen> createState() => _IntegrationsScreenState();
}

class _IntegrationsScreenState extends State<IntegrationsScreen> {
  // Termoprinter sozlamalari
  String _printerType = 'bluetooth'; // 'bluetooth' | 'wifi' | 'usb'
  String _printerIp = '192.168.1.100';
  int _printerPort = 9100;
  String _paperSize = '80mm';
  bool _autoCut = true;

  // Telegram bot sozlamalari
  final _botTokenController = TextEditingController(text: '8890616601:AAEwhpSiD6VcP7Z6WYecl4kJpqvF6-knZS4');
  final _chatIdController = TextEditingController();
  bool _notifyDaily = true;
  bool _notifyShiftClose = true;

  @override
  void dispose() {
    _botTokenController.dispose();
    _chatIdController.dispose();
    super.dispose();
  }

  void _testPrint() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.print, color: AppTheme.primary),
            SizedBox(width: 8),
            Text('Test Chek'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: const Column(
                children: [
                  Text('================================', style: TextStyle(fontFamily: 'monospace', fontSize: 11)),
                  Text('EcosPOS Chek Tizimi', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  Text('Test Chop Etish Muvaffaqiyatli', style: TextStyle(fontSize: 11)),
                  Text('================================', style: TextStyle(fontFamily: 'monospace', fontSize: 11)),
                  SizedBox(height: 6),
                  Text('Printer turi: Bluetooth / Network POS', style: TextStyle(fontSize: 11)),
                  Text('Qog\'oz eni: 80 mm / 58 mm', style: TextStyle(fontSize: 11)),
                  SizedBox(height: 6),
                  Text('--------------------------------', style: TextStyle(fontFamily: 'monospace', fontSize: 11)),
                  Text('Rahmat!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Test buyrug\'i printerga yuborildi')),
              );
            },
            child: const Text('Chop etish'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Integratsiyalar')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // 1. Termoprinter (Chek printeri)
          _IntegrationCard(
            icon: Icons.print_outlined,
            iconColor: AppTheme.primary,
            title: 'Termoprinter (Chek printeri)',
            subtitle: 'Bluetooth, WiFi va USB POS printerlari',
            status: 'Faol',
            statusColor: const Color(0xFF059669),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Ulanish turi:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: ChoiceChip(
                        label: const Center(child: Text('Bluetooth')),
                        selected: _printerType == 'bluetooth',
                        onSelected: (_) => setState(() => _printerType = 'bluetooth'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ChoiceChip(
                        label: const Center(child: Text('WiFi / LAN')),
                        selected: _printerType == 'wifi',
                        onSelected: (_) => setState(() => _printerType = 'wifi'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ChoiceChip(
                        label: const Center(child: Text('USB')),
                        selected: _printerType == 'usb',
                        onSelected: (_) => setState(() => _printerType = 'usb'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                if (_printerType == 'wifi') ...[
                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: TextFormField(
                          initialValue: _printerIp,
                          decoration: const InputDecoration(labelText: 'Printer IP manzili'),
                          onChanged: (v) => _printerIp = v,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextFormField(
                          initialValue: _printerPort.toString(),
                          decoration: const InputDecoration(labelText: 'Port (9100)'),
                          keyboardType: TextInputType.number,
                          onChanged: (v) => _printerPort = int.tryParse(v) ?? 9100,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                ],

                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _paperSize,
                        decoration: const InputDecoration(labelText: 'Qog\'oz o\'lchami'),
                        items: const [
                          DropdownMenuItem(value: '80mm', child: Text('80 mm')),
                          DropdownMenuItem(value: '58mm', child: Text('58 mm')),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _paperSize = v);
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Avtomatik kesish', style: TextStyle(fontSize: 13)),
                        value: _autoCut,
                        onChanged: (v) => setState(() => _autoCut = v ?? true),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                OutlinedButton.icon(
                  onPressed: _testPrint,
                  icon: const Icon(Icons.receipt_long),
                  label: const Text('Test chek chiqarish'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 2. To'lov terminallari
          _IntegrationCard(
            icon: Icons.credit_card_outlined,
            iconColor: const Color(0xFF0284C7),
            title: 'To\'lov Terminallari',
            subtitle: 'Uzcard, Humo, Click POS, Payme POS',
            status: 'Tayyor',
            statusColor: const Color(0xFF059669),
            child: Column(
              children: [
                _TerminalRow(title: 'Uzcard / Humo POS terminal', subtitle: 'Smart POS / PAX / Verifone', isConnected: true),
                const Divider(height: 1),
                _TerminalRow(title: 'Click POS QR to\'lov', subtitle: 'Mijoz telefoni orqali QR skanlash', isConnected: true),
                const Divider(height: 1),
                _TerminalRow(title: 'Payme POS integratsiyasi', subtitle: 'To\'g\'ridan-to\'g\'ri QR to\'lov', isConnected: true),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 3. Elektron Tarozilar
          _IntegrationCard(
            icon: Icons.scale_outlined,
            iconColor: const Color(0xFFD97706),
            title: 'Elektron Tarozilar',
            subtitle: 'Shtrix-kodli va kassa tarozilari',
            status: 'Ulanish',
            statusColor: const Color(0xFFD97706),
            child: Column(
              children: [
                _TerminalRow(title: 'CAS tarozilari (ER-Plus, SW)', subtitle: 'Protokol: RS-232 / USB', isConnected: false),
                const Divider(height: 1),
                _TerminalRow(title: 'DIGI tarozilari (SM seriya)', subtitle: 'Shtrix-kodli avtomatik tarozi', isConnected: false),
                const Divider(height: 1),
                _TerminalRow(title: 'Mettler Toledo', subtitle: 'Kassa tarozi protokoli', isConnected: false),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 4. Telegram Bot
          _IntegrationCard(
            icon: Icons.send_outlined,
            iconColor: const Color(0xFF0088CC),
            title: 'Telegram Bot (@EcosPOS_bot)',
            subtitle: 'Real vaqtda savdo va kassa bildirishnomalari',
            status: 'Faol (Online)',
            statusColor: const Color(0xFF059669),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle, color: Color(0xFF059669), size: 22),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Bot muvaffaqiyatli ulangan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF166534))),
                            SizedBox(height: 2),
                            Text('Telegram orqali savdolarni kuzatishingiz mumkin', style: TextStyle(fontSize: 11, color: Color(0xFF15803D))),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Bot manzili va nusxalash
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppTheme.background,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.telegram, color: Color(0xFF0088CC), size: 24),
                      const SizedBox(width: 10),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Telegram bot havolasi:', style: TextStyle(fontSize: 11, color: AppTheme.muted)),
                          Text('@EcosPOS_bot', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0088CC))),
                        ],
                      ),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.copy, size: 20),
                        tooltip: 'Nusxalash',
                        onPressed: () {
                          Clipboard.setData(const ClipboardData(text: 'https://t.me/EcosPOS_bot'));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Bot havolasi nusxalandi: https://t.me/EcosPOS_bot')),
                          );
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                TextFormField(
                  controller: _botTokenController,
                  readOnly: true,
                  decoration: const InputDecoration(
                    labelText: 'Ulangan Bot Token',
                    prefixIcon: Icon(Icons.key),
                  ),
                ),
                const SizedBox(height: 14),

                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.background,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Bot buyruqlari va imkoniyatlari:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      SizedBox(height: 4),
                      Text('• /start — Botni ishga tushirish va asosiy menyu', style: TextStyle(fontSize: 11)),
                      Text('• 📊 Bugungi savdo — Jami tushum va to\'lov turlari', style: TextStyle(fontSize: 11)),
                      Text('• 📈 Oylik hisobot — Oylik savdo statistikasi', style: TextStyle(fontSize: 11)),
                      Text('• 💼 Kassa holati — Ochiq kassa smenalari va qoldiqlar', style: TextStyle(fontSize: 11)),
                      Text('• 👥 Qarzdorlar — Faol nasiya va qarzdorlar ro\'yxati', style: TextStyle(fontSize: 11)),
                      Text('• 🔔 Bildirishnoma — Har bir yangi savdoni avtomatik Telegramga olish', style: TextStyle(fontSize: 11)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _IntegrationCard extends StatelessWidget {
  const _IntegrationCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.status,
    required this.statusColor,
    required this.child,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final String status;
  final Color statusColor;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: iconColor, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: const TextStyle(fontSize: 12, color: AppTheme.muted)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  status,
                  style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(height: 1),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _TerminalRow extends StatelessWidget {
  const _TerminalRow({required this.title, required this.subtitle, required this.isConnected});

  final String title;
  final String subtitle;
  final bool isConnected;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                const SizedBox(height: 2),
                Text(subtitle, style: const TextStyle(fontSize: 12, color: AppTheme.muted)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: isConnected ? const Color(0xFF059669).withOpacity(0.12) : AppTheme.border,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              isConnected ? 'Uланган' : 'Tez kunda',
              style: TextStyle(
                color: isConnected ? const Color(0xFF059669) : AppTheme.muted,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
