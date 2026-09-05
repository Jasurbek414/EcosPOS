import { useEffect, useState } from 'react';
import { expenseCategoryService } from '../services/api';

// useUnits.js bilan bir xil naqsh — xarajat turlari ham bir nechta joyda (xarajat
// yaratish formasi, xarajatlar jadvali) kerak bo'lgani uchun umumiy hook sifatida
// ajratilgan. Har bir chaqiruvchi komponent o'zining so'rovini yuboradi (global
// kesh/kontekst yo'q).
export function useExpenseCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    expenseCategoryService
      .list()
      .then((res) => {
        if (!cancelled) setCategories(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Kodga mos toifa nomini topadi (katta-kichik harfga sezgir emas); topilmasa —
  // masalan, toifa keyinchalik nofaollashtirilgan yoki kodi o'zgartirilgan bo'lsa —
  // xom kodning o'zini qaytaradi (chek/tarix kabi joylarda hech qachon bo'sh chiqmasligi uchun).
  const categoryLabel = (code) => {
    if (!code) return '';
    const match = categories.find((c) => c.code?.toLowerCase() === code.toLowerCase());
    return match ? match.name : code;
  };

  return { categories, loading, categoryLabel };
}
