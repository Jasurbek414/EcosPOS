import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const AUTH_STORAGE_KEY = 'savdo_tenant_auth';

// --- Tenant auth ma'lumotlarini localStorage'da bitta obyekt sifatida saqlash ---
// {accessToken, refreshToken, username, fullName, role, companyId, branchId}
export function getTenantAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setTenantAuth(auth) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearTenantAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Har bir so'rovga JWT token qo'shish
api.interceptors.request.use((config) => {
  const auth = getTenantAuth();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

// Bir vaqtda faqat bitta refresh so'rovi yuborilishi uchun umumiy promise
let refreshPromise = null;

// 401 bo'lsa — refresh token bilan bir marta urinish, aks holda /login'ga yo'naltirish
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthCall = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthCall) {
      originalRequest._retry = true;
      const auth = getTenantAuth();

      if (auth?.refreshToken) {
        try {
          if (!refreshPromise) {
            refreshPromise = axios
              .post(`${API_BASE_URL}/api/v1/auth/refresh`, { refreshToken: auth.refreshToken })
              .finally(() => {
                refreshPromise = null;
              });
          }
          const res = await refreshPromise;
          const newAuth = { ...auth, ...res.data };
          setTenantAuth(newAuth);
          originalRequest.headers.Authorization = `Bearer ${newAuth.accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          clearTenantAuth();
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
        clearTenantAuth();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (companyCode, username, password) => api.post('/auth/login', { companyCode, username, password }),
};

export const branchService = {
  list: () => api.get('/branches'),
  create: (data) => api.post('/branches', data),
};

export const userService = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
};

export const categoryService = {
  list: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  remove: (id) => api.delete(`/categories/${id}`),
};

export const productService = {
  list: (params) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
};

export const supplierService = {
  list: () => api.get('/suppliers'),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  remove: (id) => api.delete(`/suppliers/${id}`),
};

export const stockService = {
  list: (branchId) => api.get('/stock', { params: { branchId } }),
  low: (branchId) => api.get('/stock/low', { params: { branchId } }),
  adjust: (data) => api.post('/stock/adjustments', data),
};

export const goodsReceiptService = {
  list: (branchId) => api.get('/goods-receipts', { params: { branchId } }),
  get: (id) => api.get(`/goods-receipts/${id}`),
  create: (data) => api.post('/goods-receipts', data),
};

export const cashShiftService = {
  current: () => api.get('/cash-shifts/current', { validateStatus: (status) => status === 200 || status === 204 }),
  open: (data) => api.post('/cash-shifts/open', data),
  close: (id, data) => api.post(`/cash-shifts/${id}/close`, data),
};

export const saleService = {
  create: (data) => api.post('/sales', data),
};

export const posProductService = {
  byBarcode: (code) => api.get(`/products/barcode/${encodeURIComponent(code)}`, { validateStatus: (status) => status === 200 || status === 404 }),
  search: (search) => api.get('/products', { params: { search } }),
};

export default api;
