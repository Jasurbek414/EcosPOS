import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

class LanguageSheet extends StatefulWidget {
  const LanguageSheet({super.key, required this.currentLang, required this.onSelect});

  final String currentLang;
  final ValueChanged<String> onSelect;

  @override
  State<LanguageSheet> createState() => _LanguageSheetState();
}

class _LanguageSheetState extends State<LanguageSheet> {
  late String _selected;

  final _languages = const [
    {'code': 'uz', 'name': 'O\'zbekcha (Lotin)', 'flag': '🇺🇿'},
    {'code': 'uz_cyrl', 'name': 'Ўзбекча (Кирилл)', 'flag': '🇺🇿'},
    {'code': 'ru', 'name': 'Русский', 'flag': '🇷🇺'},
    {'code': 'en', 'name': 'English', 'flag': '🇬🇧'},
  ];

  @override
  void initState() {
    super.initState();
    _selected = widget.currentLang;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(Icons.language, color: AppTheme.primary),
              const SizedBox(width: 10),
              const Text('Tilni tanlang', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const Spacer(),
              IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(context).pop()),
            ],
          ),
          const SizedBox(height: 16),
          ..._languages.map((lang) {
            final isSelected = _selected == lang['code'];
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: isSelected ? AppTheme.primaryLight : AppTheme.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isSelected ? AppTheme.primary : AppTheme.border),
              ),
              child: ListTile(
                leading: Text(lang['flag']!, style: const TextStyle(fontSize: 24)),
                title: Text(
                  lang['name']!,
                  style: TextStyle(
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected ? AppTheme.primary : const Color(0xFF0F172A),
                  ),
                ),
                trailing: isSelected ? const Icon(Icons.check_circle, color: AppTheme.primary) : null,
                onTap: () {
                  setState(() => _selected = lang['code']!);
                  widget.onSelect(lang['code']!);
                  Navigator.of(context).pop();
                },
              ),
            );
          }),
        ],
      ),
    );
  }
}
