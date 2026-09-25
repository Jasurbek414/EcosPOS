import { useCallback, useEffect, useState } from 'react';
import { branchService } from '../services/api';
import { useTenantAuthContext } from './useTenantAuthContext';

// Filiallar UI'dan olib tashlangan — endi foydalanuvchiga tanlatilmaydi.
// CASHIER/MANAGER kabi bitta filialga biriktirilgan foydalanuvchilar uchun
// user.branchId ishlatiladi, OWNER uchun esa kompaniyaning birinchi (yagona)
// filiali avtomatik tanlanadi.
//
// `error` ATAYLAB qaytariladi: avval xato bo'sh catch ichida yutilardi va
// branchId hech qachon kelmasdi. Sahifalar esa ma'lumot so'rovini branchId
// kelishiga bog'lagani uchun abadiy "Yuklanmoqda..." holatida qotib qolardi —
// na xabar, na qayta urinish imkoni bilan.
export function useDefaultBranchId() {
  const { user, isOwner } = useTenantAuthContext();
  const [branchId, setBranchId] = useState(() => (isOwner ? '' : String(user?.branchId ?? '')));
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!isOwner || branchId) return undefined;
    let cancelled = false;
    branchService
      .list()
      .then((res) => {
        if (cancelled) return;
        const firstId = res.data?.[0]?.id;
        if (firstId != null) {
          setBranchId(String(firstId));
        } else {
          setError('empty');
        }
      })
      .catch(() => {
        if (!cancelled) setError('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [isOwner, branchId, attempt]);

  return { branchId, error, retry };
}
