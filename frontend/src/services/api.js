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

// Product.imageUrl kabi backend qaytargan "/api/v1/..." absolyut yo'llarni <img src>
// uchun to'liq URL'ga aylantirish — api instansiyasining baseURL'i bilan bir xil
// VITE_API_BASE_URL manbasidan foydalanadi (lekin "/api/v1" qo'shilmaydi, chunki
// backend qaytargan url'da u allaqachon bor).
export function resolveFileUrl(url) {
  if (!url) return null;
  return `${API_BASE_URL}${url}`;
}

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
  listNames: () => api.get('/branches/all-names'),
  get: (id) => api.get(`/branches/${id}`),
  stats: (id) => api.get(`/branches/${id}/stats`),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  remove: (id) => api.delete(`/branches/${id}`),
  // Tarif bo'yicha filiallar soni limiti + "Filiallar funksiyasi" yoqilganligi —
  // BranchListPage'da "+ Yangi filial" tugmasini disable qilish uchun ishlatiladi.
  limits: () => api.get('/branches/limits'),
};

export const userService = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  remove: (id) => api.delete(`/users/${id}`),
  resetPassword: (id) => api.post(`/users/${id}/reset-password`),
};

// O'lchov birliklari — har qanday autentifikatsiya qilingan tenant foydalanuvchisi
// GET bilan BARCHASINI (faol+nofaol) oladi, yaratish/tahrirlash/faollashtirish esa
// categoryService kabi faqat OWNER/MANAGER uchun (backend 403 qaytaradi).
export const unitService = {
  list: () => api.get('/units'),
  create: (data) => api.post('/units', data),
  update: (id, data) => api.put(`/units/${id}`, data),
  activate: (id) => api.patch(`/units/${id}/activate`),
  deactivate: (id) => api.patch(`/units/${id}/deactivate`),
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

export const stockMovementService = {
  list: (params) => api.get('/stock/movements', { params }),
};

export const stockTransferService = {
  list: (branchId) => api.get('/stock/transfers', { params: { branchId } }),
  create: (data) => api.post('/stock/transfers', data),
};

// Mahsulot rasmlarini yuklash. Backend multipart/form-data'da "file" maydonini kutadi
// va faqat isManager (katalogni boshqarish huquqi) uchun ruxsat beradi.
export const fileService = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const goodsReceiptService = {
  list: (params) => api.get('/goods-receipts', { params }),
  get: (id) => api.get(`/goods-receipts/${id}`),
  create: (data) => api.post('/goods-receipts', data),
};

export const cashShiftService = {
  current: () => api.get('/cash-shifts/current', { validateStatus: (status) => status === 200 || status === 204 }),
  open: (data) => api.post('/cash-shifts/open', data),
  close: (id, data) => api.post(`/cash-shifts/${id}/close`, data),
  list: (params) => api.get('/cash-shifts', { params }),
};

export const saleService = {
  create: (data) => api.post('/sales', data),
  list: (params) => api.get('/sales', { params }),
  get: (id) => api.get(`/sales/${id}`),
};

export const posProductService = {
  byBarcode: (code) => api.get(`/products/barcode/${encodeURIComponent(code)}`, { validateStatus: (status) => status === 200 || status === 404 }),
  search: (search) => api.get('/products', { params: { search } }),
};

export const reportService = {
  dashboard: (params) => api.get('/reports/dashboard', { params }),
  salesSummary: (params) => api.get('/reports/sales-summary', { params }),
  topProducts: (params) => api.get('/reports/top-products', { params }),
  profit: (params) => api.get('/reports/profit', { params }),
  inventoryValue: (params) => api.get('/reports/inventory-value', { params }),
};

export const profileService = {
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
  changePassword: (data) => api.post('/profile/change-password', data),
};

// Faqat OWNER — bu servisga murojaat isOwner tekshiruvi bilan cheklanadi, chunki
// backend boshqa rollarga 403 qaytaradi.
export const companyProfileService = {
  get: () => api.get('/company'),
  update: (data) => api.put('/company', data),
  updateReceiptSettings: (data) => api.put('/company/receipt-settings', data),
};

// Har qanday autentifikatsiya qilingan tenant foydalanuvchisi (OWNER/MANAGER/CASHIER)
// uchun — faqat chek(receipt)da ko'rsatiladigan brend ma'lumotlari (name/address/phone/logoUrl).
export const companyInfoService = {
  get: () => api.get('/company/info'),
};

export default api;
