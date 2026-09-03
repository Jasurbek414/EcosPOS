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

  const value = {
    user: auth,
    role: auth?.role ?? null,
    isOwner: auth?.role === 'OWNER',
    isManager: auth?.role === 'MANAGER' || auth?.role === 'OWNER',
    loading: false,
    login,
    logout,
  };

  return <TenantAuthContext.Provider value={value}>{children}</TenantAuthContext.Provider>;
}

// Provider komponenti bilan bir faylda: reference (invertizatsiya) loyihasidagi
// konventsiyaga muvofiq. Fast-refresh bu haqda ogohlantiradi, lekin funksional
// muammo emas.
// eslint-disable-next-line react-refresh/only-export-components
export const useTenantAuthContext = () => useContext(TenantAuthContext);
