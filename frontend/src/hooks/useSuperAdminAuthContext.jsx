import { createContext, useContext, useCallback, useState } from 'react';
import { platformAuthService, getPlatformAuth, setPlatformAuth, clearPlatformAuth } from '../services/platformApi';

const SuperAdminAuthContext = createContext(null);

export function SuperAdminAuthProvider({ children }) {
  const [auth, setAuth] = useState(() => getPlatformAuth());

  const login = useCallback(async (username, password) => {
    const res = await platformAuthService.login(username, password);
    setPlatformAuth(res.data);
    setAuth(res.data);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    clearPlatformAuth();
    setAuth(null);
  }, []);

  // Superadmin o'z profilini (F.I.O.) Profil sahifasida o'zgartirganda saqlangan auth
  // obyektini joyida yangilash uchun — logout/login qilmasdan sidebar darhol yangi
  // qiymatni ko'rsatishi uchun kerak (tenant useTenantAuthContext'dagi bilan bir xil naqsh).
  const updateUser = useCallback((partial) => {
    setAuth((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      setPlatformAuth(next);
      return next;
    });
  }, []);

  const value = {
    user: auth,
    loading: false,
    login,
    logout,
    updateUser,
  };

  return <SuperAdminAuthContext.Provider value={value}>{children}</SuperAdminAuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSuperAdminAuthContext = () => useContext(SuperAdminAuthContext);
