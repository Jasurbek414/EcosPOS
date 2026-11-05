/// Formatlash yordamchilari

/// Pul summasini "1 234 567" ko'rinishida guruhlab formatlaydi (so'm).
String formatMoney(num value) {
  final rounded = value.round();
  final isNegative = rounded < 0;
  final digits = rounded.abs().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    final fromEnd = digits.length - i;
    if (i > 0 && fromEnd % 3 == 0) buffer.write(' ');
    buffer.write(digits[i]);
  }
  return (isNegative ? '-' : '') + buffer.toString();
}

/// Pul summasini "1 234 567 so'm" ko'rinishida formatlaydi.
String formatCurrency(num value) => '${formatMoney(value)} so\'m';

/// Miqdorni butun bo'lsa butun, aks holda 2 xonali kasr bilan ko'rsatadi (masalan 12 yoki 12.50).
String formatQuantity(num value) {
  if (value == value.roundToDouble()) return value.toInt().toString();
  return value.toStringAsFixed(2);
}

String _two(int n) => n.toString().padLeft(2, '0');

/// "04.11.2026" ko'rinishida sana.
String formatDate(DateTime dt) {
  final local = dt.toLocal();
  return '${_two(local.day)}.${_two(local.month)}.${local.year}';
}

/// "04.11.2026 14:35" ko'rinishida sana va vaqt.
String formatDateTime(DateTime dt) {
  final local = dt.toLocal();
  return '${_two(local.day)}.${_two(local.month)}.${local.year} ${_two(local.hour)}:${_two(local.minute)}';
}
