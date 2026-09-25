import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  Package, Plus, X, Pencil, Trash2, Search, LayoutGrid, List, ImagePlus, Loader2,
  Sparkles, Check, Barcode, TrendingUp, TrendingDown, Store, AlertCircle,
} from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { useUnits } from '../../hooks/useUnits';
import { categoryService, fileService, productService, resolveFileUrl, stockService, supplierService } from '../../services/api';
import InventoryTabs from './InventoryTabs';
import InventoryStatsHeader from '../../components/ui/InventoryStatsHeader';

const VIEW_STORAGE_KEY = 'savdo_products_view';
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

// POSPage.jsx'dagi "rasm yo'q bo'lsa rangli bosh harf" naqshi bilan bir xil —
// alohida umumiy util fayl yo'q bo'lgani uchun shu yerda takrorlanadi (bir xil
// CARD_COLORS ro'yxati bilan, natija ikkala sahifada ham bir xil rang chiqishi uchun).
const CARD_COLORS = [
  '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#c026d3', '#65a30d',
];
function colorForName(name) {
  const code = (name || '?').charCodeAt(0) || 0;
  return CARD_COLORS[code % CARD_COLORS.length];
}
function initialsForName(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

// Mahsulot miniatyurasi — jadval qatorida ("sm") va grid kartada ("lg") bitta
// manbadan (rasm yoki rangli bosh harf) chiqarish uchun yagona komponent.
function ProductThumb({ product, size = 'sm' }) {
  const resolvedUrl = resolveFileUrl(product.imageUrl);
  const imgClass = size === 'sm' ? 'inv-thumb-sm' : 'inv-product-card-thumb';
  const fallbackClass = size === 'sm' ? 'inv-thumb-sm-fallback' : 'inv-product-card-thumb-fallback';
  if (resolvedUrl) {
    return <img src={resolvedUrl} alt={product.name} className={imgClass} />;
  }
  return (
    <div className={`${imgClass} ${fallbackClass}`} style={{ background: colorForName(product.name) }}>
      {initialsForName(product.name)}
    </div>
  );
}

function ProductModal({ product, categories, units, onClose, onSaved, onCategoryCreated }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [inlineCategoryOpen, setInlineCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      categoryId: product?.categoryId || '',
      name: product?.name || '',
      barcode: product?.barcode || '',
      unit: product?.unit || 'DONA',
      costPrice: product?.costPrice ?? '',
      salePrice: product?.salePrice ?? '',
      minStockLevel: product?.minStockLevel ?? '',
    },
  });

  const nameWatch = watch('name');
  const costWatch = watch('costPrice');
  const saleWatch = watch('salePrice');

  // Jonli foyda va rentabellik hisobi
  const profitInfo = useMemo(() => {
    const cost = parseFloat(costWatch);
    const sale = parseFloat(saleWatch);
    if (!isNaN(cost) && !isNaN(sale) && cost >= 0 && sale >= 0) {
      const profit = sale - cost;
      const margin = cost > 0 ? ((profit / cost) * 100).toFixed(1) : profit > 0 ? '100' : '0';
      return {
        valid: true,
        profit,
        margin,
        isPositive: profit > 0,
        isNegative: profit < 0,
        isZero: profit === 0,
      };
    }
    return { valid: false };
  }, [costWatch, saleWatch]);

  // Ichki shtrix-kod generatsiyasi
  const handleGenerateBarcode = () => {
    const randomPart = Math.floor(100000000 + Math.random() * 900000000).toString();
    const raw12 = `200${randomPart}`;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(raw12[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const fullBarcode = `${raw12}${checkDigit}`;
    setValue('barcode', fullBarcode);
    toast.success(`${t('inventory.products.barcode')}: ${fullBarcode}`);
  };

  // Yangi kategoriya yaratish (inline)
  const handleCreateInlineCategory = async () => {
    if (!newCategoryName.trim()) return;
    setSavingCategory(true);
    try {
      const res = await categoryService.create({ name: newCategoryName.trim() });
      onCategoryCreated(res.data);
      setValue('categoryId', String(res.data.id));
      setNewCategoryName('');
      setInlineCategoryOpen(false);
      toast.success(t('inventory.categories.createSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('inventory.categories.createError'));
    } finally {
      setSavingCategory(false);
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(t('inventory.products.imageInvalidType'));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(t('inventory.products.imageTooLarge'));
      return;
    }

    setUploadingImage(true);
    try {
      const res = await fileService.upload(file);
      setImageUrl(res.data.url);
    } catch (err) {
      toast.error(err.response?.data?.message || t('inventory.products.imageUploadError'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setImageUrl(null);
  };

  const onSubmit = async (data) => {
    const payload = {
      categoryId: data.categoryId || null,
      name: data.name,
      barcode: data.barcode || null,
      unit: data.unit,
      costPrice: Number(data.costPrice),
      salePrice: Number(data.salePrice),
      minStockLevel: data.minStockLevel === '' ? null : Number(data.minStockLevel),
      imageUrl: imageUrl || null,
    };
    try {
      if (product) {
        await productService.update(product.id, payload);
        toast.success(t('inventory.products.updateSuccess'));
      } else {
        await productService.create(payload);
        toast.success(t('inventory.products.createSuccess'));
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || t(product ? 'inventory.products.updateError' : 'inventory.products.createError'));
    }
  };

  const resolvedImageUrl = resolveFileUrl(imageUrl);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content !max-w-3xl overflow-hidden rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sarlavha */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Package size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                {product ? t('inventory.products.editProduct') : t('inventory.products.newProduct')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Mahsulot ma'lumotlari, narxlari va qoldiq parametrlarini kiriting
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Forma tanasi */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 bg-slate-50/50 dark:bg-slate-900/50 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* CHAP USTUN: Rasm yuklash & Mini preview (4 ustun) */}
            <div className="md:col-span-4 flex flex-col gap-4">
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-xs flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Mahsulot rasmi
                </span>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept={ALLOWED_IMAGE_TYPES.join(',')}
                  className="hidden"
                  onChange={handleImageSelect}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group w-full aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all overflow-hidden"
                >
                  {resolvedImageUrl ? (
                    <>
                      <img
                        src={resolvedImageUrl}
                        alt={nameWatch || 'Product'}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <span className="text-xs text-white font-medium bg-black/50 px-2 py-1 rounded-lg backdrop-blur-xs">
                          Almashtirish
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                        <ImagePlus size={24} />
                      </div>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {t('inventory.products.uploadImageHint')}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        PNG, JPG, WEBP (max 5MB)
                      </p>
                    </div>
                  )}

                  {uploadingImage && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex items-center justify-center">
                      <Loader2 size={24} className="animate-spin text-indigo-600" />
                    </div>
                  )}
                </div>

                {resolvedImageUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>{t('inventory.products.removeImage')}</span>
                  </button>
                )}
              </div>

              {/* Tizimdagi ko'rinish namunasi */}
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-3.5 shadow-xs flex items-center gap-3">
                <ProductThumb product={{ name: nameWatch || '?', imageUrl }} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {nameWatch || 'Mahsulot nomi'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {saleWatch ? `${Number(saleWatch).toLocaleString('uz-UZ')} so'm` : '0 so\'m'}
                  </p>
                </div>
              </div>
            </div>

            {/* O'NG USTUN: Asosiy parametrlar va narxlar (8 ustun) */}
            <div className="md:col-span-8 flex flex-col gap-5">
              {/* 1-Bo'lim: Asosiy ma'lumotlar */}
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex flex-col gap-4">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('inventory.products.generalInfo')}
                </span>

                {/* Mahsulot nomi */}
                <div>
                  <label className="field-label">
                    {t('inventory.products.name')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field !text-sm !py-2.5"
                    placeholder={t('inventory.products.namePlaceholder')}
                    autoFocus
                    {...register('name', { required: true })}
                  />
                  {errors.name && <p className="field-error">{t('common.required')}</p>}
                </div>

                {/* Kategoriya */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="field-label !mb-0">{t('inventory.products.category')}</label>
                    <button
                      type="button"
                      onClick={() => setInlineCategoryOpen(!inlineCategoryOpen)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>{t('inventory.products.addCategoryInline')}</span>
                    </button>
                  </div>

                  {inlineCategoryOpen ? (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40">
                      <input
                        type="text"
                        className="input-field !py-1.5 !text-xs flex-1"
                        placeholder="Yangi kategoriya nomi"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateInlineCategory();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleCreateInlineCategory}
                        disabled={savingCategory || !newCategoryName.trim()}
                        className="btn btn-primary !py-1.5 !px-3 !text-xs"
                      >
                        {savingCategory ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setInlineCategoryOpen(false)}
                        className="btn btn-outline !py-1.5 !px-2 !text-xs"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <select className="input-field !text-sm !py-2.5" {...register('categoryId')}>
                      <option value="">{t('inventory.products.noCategory')}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Birlik va Shtrix-kod */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">
                      {t('inventory.products.unit')} <span className="text-rose-500">*</span>
                    </label>
                    <select className="input-field !text-sm !py-2.5" {...register('unit', { required: true })}>
                      {units
                        .filter((u) => u.isActive || u.code === product?.unit)
                        .map((u) => (
                          <option key={u.id} value={u.code}>
                            {u.name}{!u.isActive ? ` (${t('settings.units.inactiveSuffix')})` : ''}
                          </option>
                        ))}
                    </select>
                    {errors.unit && <p className="field-error">{t('common.required')}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="field-label !mb-0">{t('inventory.products.barcode')}</label>
                      <button
                        type="button"
                        onClick={handleGenerateBarcode}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                        title={t('inventory.products.generateBarcodeHint')}
                      >
                        <Sparkles size={11} />
                        <span>{t('inventory.products.generateBarcode')}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        className="input-field !text-sm !py-2.5 !pr-9 font-mono"
                        placeholder={t('inventory.products.barcodePlaceholder')}
                        {...register('barcode')}
                      />
                      <Barcode size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-Bo'lim: Narxlar va Kutilayotgan foyda */}
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex flex-col gap-4">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('inventory.products.pricingStock')}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">
                      {t('inventory.products.costPrice')} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input-field !text-sm !py-2.5 !pr-12 font-medium"
                        placeholder="0"
                        {...register('costPrice', { required: true, min: 0 })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                        so'm
                      </span>
                    </div>
                    {errors.costPrice && <p className="field-error">{t('common.required')}</p>}
                  </div>

                  <div>
                    <label className="field-label">
                      {t('inventory.products.salePrice')} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input-field !text-sm !py-2.5 !pr-12 font-medium"
                        placeholder="0"
                        {...register('salePrice', { required: true, min: 0 })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                        so'm
                      </span>
                    </div>
                    {errors.salePrice && <p className="field-error">{t('common.required')}</p>}
                  </div>
                </div>

                {/* Jonli Foyda va Rentabellik ko'rsatkichi */}
                {profitInfo.valid && (
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                      profitInfo.isPositive
                        ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                        : profitInfo.isNegative
                        ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
                        : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {profitInfo.isPositive ? (
                        <TrendingUp size={16} className="text-emerald-600 shrink-0" />
                      ) : profitInfo.isNegative ? (
                        <TrendingDown size={16} className="text-rose-600 shrink-0" />
                      ) : (
                        <AlertCircle size={16} className="text-slate-400 shrink-0" />
                      )}
                      <div>
                        <span className="font-semibold">{t('inventory.products.expectedProfit')}: </span>
                        <span className="font-bold">
                          {profitInfo.profit > 0 ? `+${profitInfo.profit.toLocaleString('uz-UZ')}` : profitInfo.profit.toLocaleString('uz-UZ')} so'm
                        </span>
                      </div>
                    </div>
                    <div className="font-bold px-2 py-0.5 rounded-md bg-white/60 dark:bg-black/20 shrink-0">
                      {t('inventory.products.marginLabel')}: {profitInfo.isPositive ? `+${profitInfo.margin}%` : `${profitInfo.margin}%`}
                    </div>
                  </div>
                )}

                {/* Minimal qoldiq */}
                <div>
                  <label className="field-label">{t('inventory.products.minStockLevel')}</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="input-field !text-sm !py-2.5 max-w-xs"
                    placeholder={t('inventory.products.minStockLevelPlaceholder')}
                    {...register('minStockLevel')}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {t('inventory.products.minStockHint')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Modal pastki tugmalari */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={onClose} className="btn btn-outline">
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || uploadingImage}
              className="btn btn-primary !px-5 flex items-center gap-2"
            >
              {(isSubmitting || uploadingImage) && <Loader2 size={16} className="animate-spin" />}
              <span>{product ? t('common.save') : t('common.create')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { t } = useTranslation();
  const { user, isManager } = useTenantAuthContext();
  const { units, unitLabel, loading: unitsLoading } = useUnits();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(VIEW_STORAGE_KEY) || 'table';
    } catch {
      return 'table';
    }
  });

  const [productsCount, setProductsCount] = useState(null);
  const [suppliersCount, setSuppliersCount] = useState(null);
  const [lowStockCount, setLowStockCount] = useState(null);

  // Ko'rinish tanlovini (jadval/grid) localStorage'da saqlaymiz — keyingi tashrifda eslab qoladi.
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // localStorage mavjud bo'lmasa (masalan xususiy rejim) — jimgina o'tkazib yuboramiz.
    }
  }, [view]);

  // Kategoriyalarni faqat bir marta, sahifa ochilganda yuklaymiz.
  useEffect(() => {
    let cancelled = false;
    categoryService
      .list()
      .then((res) => {
        if (!cancelled) setCategories(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Statistika sarlavhasi uchun: joriy filtrlardan mustaqil, umumiy faol mahsulotlar
  // va ta'minotchilar soni — bir marta yuklanadi.
  useEffect(() => {
    let cancelled = false;
    Promise.all([productService.list({}), supplierService.list()])
      .then(([productsRes, suppliersRes]) => {
        if (cancelled) return;
        setProductsCount(productsRes.data.filter((p) => p.isActive).length);
        setSuppliersCount(suppliersRes.data.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Kam qolgan mahsulotlar soni — bu sahifada filial tanlagich yo'q, shuning uchun
  // faqat filiali aniq bo'lgan foydalanuvchilar (MANAGER/CASHIER) uchun hisoblanadi;
  // OWNER uchun statistika kartochkasida "—" ko'rsatiladi (StockPage.jsx'da esa OWNER
  // filial tanlaganidan keyin bu qiymat to'liq ishlaydi).
  useEffect(() => {
    if (!user?.branchId) return undefined;
    let cancelled = false;
    stockService
      .low(user.branchId)
      .then((res) => {
        if (!cancelled) setLowStockCount(res.data.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.branchId]);

  // Qidiruv matnini debounce qilish.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Mahsulotlarni birinchi yuklashda va filtr/qidiruv o'zgarganda qayta yuklaymiz.
  useEffect(() => {
    let cancelled = false;
    productService
      .list({ categoryId: categoryFilter || undefined, search: debouncedSearch || undefined })
      .then((res) => {
        if (!cancelled) setProducts(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('inventory.products.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryFilter, debouncedSearch, t]);

  const reload = useCallback(async () => {
    try {
      const res = await productService.list({ categoryId: categoryFilter || undefined, search: debouncedSearch || undefined });
      setProducts(res.data);
    } catch {
      toast.error(t('inventory.products.loadError'));
    }
  }, [categoryFilter, debouncedSearch, t]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSaved = () => {
    closeModal();
    reload();
  };

  const handleCategoryCreated = (category) => {
    setCategories((prev) => [...prev, category]);
  };

  const handleDelete = async (product) => {
    if (!window.confirm(t('inventory.products.deleteConfirm'))) return;
    try {
      await productService.remove(product.id);
      toast.success(t('inventory.products.deleteSuccess'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || t('inventory.products.deleteError'));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <InventoryTabs />

      <InventoryStatsHeader productsCount={productsCount} suppliersCount={suppliersCount} lowStockCount={lowStockCount} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('inventory.products.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('inventory.products.subtitle')}</p>
        </div>
        {isManager && (
          <button
            type="button"
            onClick={openCreate}
            disabled={unitsLoading || units.filter((u) => u.isActive).length === 0}
            title={
              unitsLoading
                ? t('common.loading')
                : units.filter((u) => u.isActive).length === 0
                  ? t('inventory.products.noActiveUnitsHint')
                  : undefined
            }
            className="btn btn-primary"
          >
            <Plus size={16} />
            {t('inventory.products.newProduct')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            className="input-field !pl-9"
            placeholder={t('inventory.products.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select className="input-field max-w-xs" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">{t('inventory.products.allCategories')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setView('table')}
            className={`btn-icon ${view === 'table' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100' : ''}`}
            title={t('inventory.products.tableView')}
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onClick={() => setView('grid')}
            className={`btn-icon ${view === 'grid' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100' : ''}`}
            title={t('inventory.products.gridView')}
          >
            <LayoutGrid size={15} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 dark:text-slate-400 text-sm">{t('common.loading')}</div>
      ) : products.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Package size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('inventory.products.empty')}</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((p) => (
            <div key={p.id} className="inv-product-card">
              {isManager && (
                <div className="inv-product-card-actions">
                  <button type="button" onClick={() => openEdit(p)} className="btn-icon" title={t('common.edit')}>
                    <Pencil size={14} />
                  </button>
                  <button type="button" onClick={() => handleDelete(p)} className="btn-icon danger" title={t('common.delete')}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
              <ProductThumb product={p} size="lg" />
              <div className="min-w-0">
                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">{p.name}</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{p.categoryName || '—'}</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs font-mono truncate">{p.barcode || '—'}</p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{Number(p.costPrice).toLocaleString('uz-UZ')}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{Number(p.salePrice).toLocaleString('uz-UZ')}</span>
              </div>
              <span className={`w-fit ${p.isActive ? 'badge badge-green' : 'badge badge-slate'}`}>
                {p.isActive ? t('inventory.products.active') : t('inventory.products.inactive')}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th />
                <th>{t('inventory.products.name')}</th>
                <th>{t('inventory.products.category')}</th>
                <th>{t('inventory.products.barcode')}</th>
                <th>{t('inventory.products.unit')}</th>
                <th>{t('inventory.products.costPrice')}</th>
                <th>{t('inventory.products.salePrice')}</th>
                <th>{t('common.status')}</th>
                {isManager && <th>{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <ProductThumb product={p} size="sm" />
                  </td>
                  <td className="font-medium text-slate-900 dark:text-slate-100">{p.name}</td>
                  <td className="text-slate-600 dark:text-slate-300">{p.categoryName || '—'}</td>
                  <td className="text-slate-600 dark:text-slate-300 font-mono text-xs">{p.barcode || '—'}</td>
                  <td className="text-slate-600 dark:text-slate-300">{unitLabel(p.unit)}</td>
                  <td className="text-slate-600 dark:text-slate-300">{Number(p.costPrice).toLocaleString('uz-UZ')}</td>
                  <td className="text-slate-600 dark:text-slate-300">{Number(p.salePrice).toLocaleString('uz-UZ')}</td>
                  <td>
                    <span className={p.isActive ? 'badge badge-green' : 'badge badge-slate'}>
                      {p.isActive ? t('inventory.products.active') : t('inventory.products.inactive')}
                    </span>
                  </td>
                  {isManager && (
                    <td>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(p)} className="btn-icon" title={t('common.edit')}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => handleDelete(p)} className="btn-icon danger" title={t('common.delete')}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <ProductModal
          product={editing}
          categories={categories}
          units={units}
          onClose={closeModal}
          onSaved={handleSaved}
          onCategoryCreated={handleCategoryCreated}
        />
      )}
    </div>
  );
}
