import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  Package, Plus, X, Pencil, Trash2, Search, LayoutGrid, List, ImagePlus, Loader2,
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
  const {
    register,
    handleSubmit,
    setValue,
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

  const handleAddCategory = async () => {
    const name = window.prompt(t('inventory.products.newCategoryPrompt'));
    if (!name || !name.trim()) return;
    try {
      const res = await categoryService.create({ name: name.trim() });
      onCategoryCreated(res.data);
      setValue('categoryId', String(res.data.id));
    } catch (err) {
      toast.error(err.response?.data?.message || t('inventory.categories.createError'));
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">
            {product ? t('inventory.products.editProduct') : t('inventory.products.newProduct')}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept={ALLOWED_IMAGE_TYPES.join(',')}
              className="hidden"
              onChange={handleImageSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inv-upload-box"
              disabled={uploadingImage}
              title={t('inventory.products.uploadImageHint')}
            >
              {resolvedImageUrl ? (
                <img src={resolvedImageUrl} alt={t('inventory.products.name')} />
              ) : (
                <>
                  <ImagePlus size={22} />
                  <span className="inv-upload-box-hint">{t('inventory.products.uploadImageHint')}</span>
                </>
              )}
              {uploadingImage && (
                <div className="inv-upload-overlay">
                  <Loader2 size={22} className="animate-spin" />
                </div>
              )}
            </button>
          </div>

          <div>
            <label className="field-label">{t('inventory.products.name')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('inventory.products.namePlaceholder')}
              autoFocus
              {...register('name', { required: true })}
            />
            {errors.name && <p className="field-error">{t('common.required')}</p>}
          </div>

          <div>
            <label className="field-label">{t('inventory.products.category')}</label>
            <div className="flex items-center gap-2">
              <select className="input-field" {...register('categoryId')}>
                <option value="">{t('inventory.products.noCategory')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handleAddCategory} className="btn btn-outline whitespace-nowrap">
                {t('inventory.products.addCategoryInline')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">{t('inventory.products.unit')}</label>
              <select className="input-field" {...register('unit', { required: true })}>
                {units
                  .filter((u) => u.isActive || u.code === product?.unit)
                  .map((u) => (
                    <option key={u.id} value={u.code}>
                      {u.name}{!u.isActive ? ` (${t('settings.units.inactiveSuffix')})` : ''}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="field-label">{t('inventory.products.barcode')}</label>
              <input
                type="text"
                className="input-field"
                placeholder={t('inventory.products.barcodePlaceholder')}
                {...register('barcode')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">{t('inventory.products.costPrice')}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field"
                {...register('costPrice', { required: true, min: 0 })}
              />
              {errors.costPrice && <p className="field-error">{t('common.required')}</p>}
            </div>
            <div>
              <label className="field-label">{t('inventory.products.salePrice')}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field"
                {...register('salePrice', { required: true, min: 0 })}
              />
              {errors.salePrice && <p className="field-error">{t('common.required')}</p>}
            </div>
          </div>

          <div>
            <label className="field-label">{t('inventory.products.minStockLevel')}</label>
            <input
              type="number"
              step="1"
              min="0"
              className="input-field"
              placeholder={t('inventory.products.minStockLevelPlaceholder')}
              {...register('minStockLevel')}
            />
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="btn btn-outline">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting || uploadingImage} className="btn btn-primary">
              {product ? t('common.save') : t('common.create')}
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
  const { units, unitLabel } = useUnits();
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
          <button type="button" onClick={openCreate} className="btn btn-primary">
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
