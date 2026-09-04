import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const PLATFORM_AUTH_STORAGE_KEY = 'savdo_platform_auth';

// Superadmin uchun butunlay alohida saqlash kaliti — tenant api.js (savdo_tenant_auth)
// bilan bir xil brauzerda ikkalasi ham ishlashi mumkin.
export function getPlatformAuth() {
  try {
    const raw = localStorage.getItem(PLATFORM_AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setPlatformAuth(auth) {
  localStorage.setItem(PLATFORM_AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearPlatformAuth() {
  localStorage.removeItem(PLATFORM_AUTH_STORAGE_KEY);
}

const platformApi = axios.create({
  baseURL: `${API_BASE_URL}/api/v1/platform`,
  headers: { 'Content-Type': 'application/json' },
});

platformApi.interceptors.request.use((config) => {
  const auth = getPlatformAuth();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

// Superadmin uchun hozircha refresh token oqimi yo'q — 401 bo'lsa to'g'ridan-to'g'ri
// qayta login qildiramiz.
platformApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      clearPlatformAuth();
      if (window.location.pathname !== '/spd') {
        window.location.href = '/spd';
      }
    }
    return Promise.reject(error);
  }
);

export const platformAuthService = {
  login: (username, password) => platformApi.post('/auth/login', { username, password }),
};

export const companyService = {
  list: () => platformApi.get('/companies'),
  detail: (id) => platformApi.get(`/companies/${id}`),
  create: (data) => platformApi.post('/companies', data),
  update: (id, data) => platformApi.put(`/companies/${id}`, data),
  block: (id, data) => platformApi.patch(`/companies/${id}/block`, data),
  unblock: (id) => platformApi.patch(`/companies/${id}/unblock`),
  resetAdminPassword: (id) => platformApi.post(`/companies/${id}/reset-admin-password`),
};

// Boshqa superadmin hisoblarini boshqarish (hamkasblarni qo'shish/faolsizlantirish) —
// CompanyDetailPage'dagi companyService bilan bir xil axios instance pattern.
export const platformAdminService = {
  list: () => platformApi.get('/admins'),
  create: (data) => platformApi.post('/admins', data),
  activate: (id) => platformApi.patch(`/admins/${id}/activate`),
  deactivate: (id) => platformApi.patch(`/admins/${id}/deactivate`),
};

export const auditLogService = {
  list: (companyId) => platformApi.get('/audit-log', { params: companyId ? { companyId } : {} }),
};

export const platformProfileService = {
  get: () => platformApi.get('/profile'),
  update: (data) => platformApi.put('/profile', data),
  changePassword: (data) => platformApi.post('/profile/change-password', data),
};

export default platformApi;
