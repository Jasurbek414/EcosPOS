import { useEffect, useState } from 'react';
import { unitService } from '../services/api';

// O'lchov birliklari 6+ turli sahifada (mahsulot formasi, POS, ombor harakatlari,
// hisobotlar va h.k.) kerak bo'lgani uchun umumiy hook sifatida ajratilgan — bu
// kodlar bazasining odatdagi "har sahifa o'z ma'lumotini mustaqil useEffect bilan
// yuklaydi" konventsiyasidan farqli, lekin shu holat uchun asoslangan. Har bir
// chaqiruvchi komponent o'zining so'rovini yuboradi (global kesh/kontekst yo'q).
export function useUnits() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    unitService
      .list()
      .then((res) => {
        if (!cancelled) setUnits(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Kodga mos birlik nomini topadi (katta-kichik harfga sezgir emas); topilmasa —
  // masalan, birlik keyinchalik nofaollashtirilgan yoki o'chirilgan bo'lsa — xom
  // kodning o'zini qaytaradi (chek/tarix kabi joylarda hech qachon bo'sh chiqmasligi uchun).
  const unitLabel = (code) => {
    if (!code) return '';
    const match = units.find((u) => u.code?.toLowerCase() === code.toLowerCase());
    return match ? match.name : code;
  };

  return { units, loading, unitLabel };
}
