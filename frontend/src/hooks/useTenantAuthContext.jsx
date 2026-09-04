import { createContext, useContext, useCallback, useState } from 'react';
import { authService, getTenantAuth, setTenantAuth, clearTenantAuth } from '../services/api';

const TenantAuthContext = createContext(null);

export function TenantAuthProvider({ children }) {
  const [auth, setAuth] = useState(() => getTenantAuth());

  const login = useCallback(async (companyCode, username, password) => {
    const res = await authService.login(companyCode, username, password);
    setTenantAuth(res.data);
    setAuth(res.data);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    clearTenantAuth();
    setAuth(null);
  }, []);

  // Foydalanuvchi o'z profilini (masalan F.I.O.) Sozlamalar sahifasida o'zgartirganda
  // saqlangan auth obyektini joyida yangilash uchun — logout/login qilmasdan sidebar/topbar
  // darhol yangi qiymatni ko'rsatishi uchun kerak.
  const updateUser = useCallback((partial) => {
    setAuth((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      setTenantAuth(next);
      return next;
    });
  }, []);

  const value = {
    user: auth,
    role: auth?.role ?? null,
    isOwner: auth?.role === 'OWNER',
    isManager: auth?.role === 'MANAGER' || auth?.role === 'OWNER',
    loading: false,
    login,
    logout,
    updateUser,
  };

  return <TenantAuthContext.Provider value={value}>{children}</TenantAuthContext.Provider>;
}

// Provider komponenti bilan bir faylda: reference (invertizatsiya) loyihasidagi
// konventsiyaga muvofiq. Fast-refresh bu haqda ogohlantiradi, lekin funksional
// muammo emas.
// eslint-disable-next-line react-refresh/only-export-components
export const useTenantAuthContext = () => useContext(TenantAuthContext);
