import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router.dart';
import 'theme/app_theme.dart';

class SavdoApp extends ConsumerWidget {
  const SavdoApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'Savdo',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme(),
      routerConfig: router,
    );
  }
}
