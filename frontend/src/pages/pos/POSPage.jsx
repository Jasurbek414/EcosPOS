import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  Lock, Unlock, ShoppingCart, Trash2, Printer, CircleDollarSign, CreditCard, Barcode, X,
  Plus, Minus, Search, PackageSearch, Clock, ReceiptText, CheckCircle2,
} from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import {
  branchService, cashShiftService, categoryService, posProductService, productService, saleService,
} from '../../services/api';

const ROUND_STEPS = [10000, 50000, 100000];

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

function NoShiftPanel({ user, isOwner, onOpened }) {
  const { t } = useTranslation();
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(isOwner ? '' : (user?.branchId ?? ''));
  const [openingCash, setOpeningCash] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOwner) return undefined;
    let cancelled = false;
    branchService
      .list()
      .then((res) => {
        if (cancelled) return;
        setBranches(res.data);
        setBranchId((prev) => prev || res.data[0]?.id || '');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  const handleOpen = async (e) => {
    e.preventDefault();
    if (!branchId) return;
    setSubmitting(true);
    try {
      const res = await cashShiftService.open({ branchId, openingCash: Number(openingCash || 0) });
      onOpened(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || t('pos.noShift.openError'));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center">
      <form onSubmit={handleOpen} className="pos-panel w-full max-w-md flex flex-col gap-6 p-9">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1e293b,#334155)' }}>
            <Lock size={26} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t('pos.noShift.title')}</h2>
            <p className="text-slate-500 text-sm mt-1.5">{t('pos.noShift.subtitle')}</p>
          </div>
        </div>

        {isOwner && (
          <div>
            <label className="field-label">{t('pos.noShift.branch')}</label>
            <select className="input-field" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="field-label">{t('pos.noShift.openingCash')}</label>
          <input
            type="number"
            step="1"
            min="0"
            className="input-field !text-lg !font-semibold"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
          />
        </div>

        <button type="submit" disabled={submitting || !branchId} className="btn btn-primary w-full !py-3.5 !text-base">
          <Unlock size={18} />
          {t('pos.noShift.openBtn')}
        </button>
      </form>
    </div>
  );
}

function CloseShiftModal({ shift, onClose, onClosed }) {
  const { t } = useTranslation();
  const [closingCash, setClosingCash] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await cashShiftService.close(shift.id, {
        closingCash: Number(closingCash || 0),
        note: note || null,
      });
      onClosed(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || t('pos.closeModal.error'));
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">{t('pos.closeModal.title')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="field-label">{t('pos.closeModal.closingCash')}</label>
            <input
              type="number"
              step="1"
              min="0"
              className="input-field !text-lg !font-semibold"
              autoFocus
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="field-label">{t('pos.closeModal.note')}</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder={t('pos.closeModal.notePlaceholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="btn btn-outline">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {t('pos.closeModal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CloseShiftResult({ result, onDone }) {
  const { t } = useTranslation();
  const diff = Number(result.closingCash) - Number(result.expectedCash);
  const diffLabel = diff === 0 ? t('pos.closeResult.match') : diff > 0 ? t('pos.closeResult.surplus') : t('pos.closeResult.shortage');
  const diffClass = diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="min-h-[75vh] flex items-center justify-center">
      <div className="pos-panel w-full max-w-md flex flex-col gap-6 p-9">
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: diff === 0 ? '#ecfdf5' : diff > 0 ? '#fffbeb' : '#fef2f2' }}
          >
            <CheckCircle2 size={26} className={diffClass} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">{t('pos.closeResult.title')}</h2>
        </div>
        <div className="flex flex-col gap-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">{t('pos.closeResult.opening')}</span>
            <span className="font-medium text-slate-900 tabular-nums">{Number(result.openingCash).toLocaleString('uz-UZ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{t('pos.closeResult.expected')}</span>
            <span className="font-medium text-slate-900 tabular-nums">{Number(result.expectedCash).toLocaleString('uz-UZ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{t('pos.closeResult.actual')}</span>
            <span className="font-medium text-slate-900 tabular-nums">{Number(result.closingCash).toLocaleString('uz-UZ')}</span>
          </div>
          <div className="flex justify-between pt-3 border-t border-slate-200">
            <span className="text-slate-500 font-medium">{t('pos.closeResult.diff')}</span>
            <span className={`font-bold tabular-nums ${diffClass}`}>
              {diff > 0 ? '+' : ''}
              {diff.toLocaleString('uz-UZ')} ({diffLabel})
            </span>
          </div>
        </div>
        <button type="button" onClick={onDone} className="btn btn-primary w-full !py-3">
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}

function ReceiptView({ receipt, onNewSale }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="receipt-slip flex flex-col gap-4">
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center">
            <ReceiptText size={20} className="text-white" />
          </div>
          <h2 className="text-base font-bold text-slate-900 tracking-wide">{t('pos.receipt.title')}</h2>
          <p className="text-slate-400 text-xs">
            #{receipt.id} · {new Date(receipt.createdAt).toLocaleString('uz-UZ')}
          </p>
        </div>
        <div className="receipt-divider" />
        <div className="flex flex-col gap-2 text-sm">
          {receipt.items.map((item) => (
            <div key={item.productId} className="flex justify-between gap-3">
              <span className="text-slate-700">
                {item.productName}
                <span className="text-slate-400">
                  {' '}x{item.quantity} {t(`inventory.units.${item.unit}`)}
                </span>
              </span>
              <span className="font-medium text-slate-900 whitespace-nowrap tabular-nums">{Number(item.subtotal).toLocaleString('uz-UZ')}</span>
            </div>
          ))}
        </div>
        <div className="receipt-divider" />
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">{t('pos.receipt.total')}</span>
            <span className="font-bold text-slate-900 text-lg tabular-nums">{Number(receipt.totalAmount).toLocaleString('uz-UZ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{t('pos.receipt.paymentMethod')}</span>
            <span className="text-slate-900 font-medium">{t(`pos.terminal.${receipt.paymentMethod === 'CARD' ? 'card' : 'cash'}`)}</span>
          </div>
          {receipt.paymentMethod === 'CASH' && (
            <>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('pos.receipt.amountPaid')}</span>
                <span className="text-slate-900 tabular-nums">{Number(receipt.amountPaid).toLocaleString('uz-UZ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('pos.receipt.change')}</span>
                <span className="text-slate-900 tabular-nums">{Number(receipt.changeAmount).toLocaleString('uz-UZ')}</span>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex gap-2 print:hidden">
        <button type="button" onClick={() => window.print()} className="btn btn-outline">
          <Printer size={16} />
          {t('pos.receipt.printBtn')}
        </button>
        <button type="button" onClick={onNewSale} className="btn btn-primary">
          {t('pos.receipt.newSaleBtn')}
        </button>
      </div>
    </div>
  );
}

function ElapsedTime({ since }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const mins = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return <span className="tabular-nums">{h > 0 ? `${h}s ${m}d` : `${m}d`}</span>;
}

function ProductGrid({ products, categories, onAdd }) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('all');

  const visible = useMemo(
    () => products.filter((p) => activeCategory === 'all' || p.categoryId === activeCategory),
    [products, activeCategory]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pos-chip-row">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`pos-chip ${activeCategory === 'all' ? 'pos-chip-active' : ''}`}
        >
          {t('pos.terminal.allCategories')}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveCategory(c.id)}
            className={`pos-chip ${activeCategory === c.id ? 'pos-chip-active' : ''}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card py-16 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <PackageSearch size={22} className="text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">{t('pos.terminal.gridEmpty')}</p>
        </div>
      ) : (
        <div className="pos-product-grid">
          {visible.map((p) => (
            <button key={p.id} type="button" onClick={() => onAdd(p)} className="pos-product-card">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="pos-product-thumb" />
              ) : (
                <div className="pos-product-thumb pos-product-thumb-fallback" style={{ background: colorForName(p.name) }}>
                  {initialsForName(p.name)}
                </div>
              )}
              <span className="pos-product-name">{p.name}</span>
              <span className="pos-product-price">
                {Number(p.salePrice).toLocaleString('uz-UZ')} <span className="text-slate-400 font-normal">{t(`inventory.units.${p.unit}`)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function POSTerminal({ shift, onRequestCloseShift }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaidInput, setAmountPaidInput] = useState(null); // null = follow total automatically
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([productService.list(), categoryService.list()])
      .then(([prodRes, catRes]) => {
        if (cancelled) return;
        setProducts(prodRes.data.filter((p) => p.isActive));
        setCategories(catRes.data.filter((c) => c.isActive));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [receipt]);

  const total = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0) * item.salePrice, 0);
  const itemCount = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const amountPaidDisplay = amountPaidInput === null ? String(total || 0) : amountPaidInput;
  const amountPaidNumeric = Number(amountPaidDisplay) || 0;
  const change = amountPaidNumeric - total;
  const roundOptions = ROUND_STEPS.map((step) => Math.ceil((total || 1) / step) * step).filter((v) => v > total).slice(0, 3);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: String((Number(item.quantity) || 0) + 1) } : item
        );
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, unit: product.unit, salePrice: Number(product.salePrice), quantity: '1' },
      ];
    });
  };

  const bumpQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: String(Math.max(0, (Number(item.quantity) || 0) + delta)) }
            : item
        )
        .filter((item) => Number(item.quantity) > 0)
    );
  };

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    if (searchResults.length > 0) setSearchResults([]);
  };

  const handleSearchKeyDown = async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const value = query.trim();
    if (!value) return;
    setSearching(true);
    try {
      const res = await posProductService.byBarcode(value);
      if (res.status === 200) {
        addToCart(res.data);
        setQuery('');
        setSearchResults([]);
      } else {
        const searchRes = await posProductService.search(value);
        if (searchRes.data.length === 0) {
          toast.error(t('pos.terminal.notFound'));
          setSearchResults([]);
        } else if (searchRes.data.length === 1) {
          addToCart(searchRes.data[0]);
          setQuery('');
          setSearchResults([]);
        } else {
          setSearchResults(searchRes.data);
        }
      }
    } catch {
      toast.error(t('pos.terminal.searchError'));
    } finally {
      setSearching(false);
      inputRef.current?.focus();
    }
  };

  const handlePickResult = (product) => {
    addToCart(product);
    setQuery('');
    setSearchResults([]);
    inputRef.current?.focus();
  };

  const updateQuantity = (productId, value) => {
    setCart((prev) => prev.map((item) => (item.productId === productId ? { ...item, quantity: value } : item)));
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || submitting) return;
    const items = cart
      .map((item) => ({ productId: item.productId, quantity: Number(item.quantity) || 0 }))
      .filter((item) => item.quantity > 0);
    if (items.length === 0) {
      toast.error(t('pos.terminal.itemsRequired'));
      return;
    }
    const paid = paymentMethod === 'CARD' ? total : amountPaidNumeric;
    setSubmitting(true);
    try {
      const res = await saleService.create({ items, paymentMethod, amountPaid: paid });
      setReceipt(res.data);
      setCart([]);
      setAmountPaidInput(null);
    } catch (err) {
      toast.error(err.response?.data?.message || t('pos.terminal.checkoutError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewSale = () => {
    setReceipt(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="pos-shift-bar print:hidden">
        <div className="flex items-center gap-3">
          <span className="pos-shift-dot" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-white text-sm">{t('pos.shiftBar.open')}</span>
            <span className="text-slate-400 text-xs flex items-center gap-1.5">
              <Clock size={11} />
              <ElapsedTime since={shift.openedAt} />
              <span className="mx-1">·</span>
              {t('pos.shiftBar.opening')}: {Number(shift.openingCash).toLocaleString('uz-UZ')} {t('pos.shiftBar.currency')}
            </span>
          </div>
        </div>
        <button type="button" onClick={onRequestCloseShift} className="pos-shift-close-btn">
          <Lock size={15} />
          {t('pos.shiftBar.closeBtn')}
        </button>
      </div>

      {receipt ? (
        <ReceiptView receipt={receipt} onNewSale={handleNewSale} />
      ) : (
        <div className="flex flex-col xl:flex-row gap-4 items-start">
          <div className="flex-1 w-full flex flex-col gap-4 min-w-0">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                autoFocus
                disabled={searching}
                className="pos-search-input"
                placeholder={t('pos.terminal.searchPlaceholder')}
                value={query}
                onChange={handleQueryChange}
                onKeyDown={handleSearchKeyDown}
              />
              <Barcode size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
              {searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full card max-h-72 overflow-y-auto shadow-lg">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePickResult(p)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-b-0 cursor-pointer"
                    >
                      <div className="font-medium text-slate-900">{p.name}</div>
                      <div className="text-slate-500 text-xs">
                        {Number(p.salePrice).toLocaleString('uz-UZ')} · {t(`inventory.units.${p.unit}`)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {catalogLoading ? (
              <div className="text-slate-500 text-sm">{t('common.loading')}</div>
            ) : (
              <ProductGrid products={products} categories={categories} onAdd={addToCart} />
            )}
          </div>

          <div className="pos-cart-panel">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart size={17} />
                {t('pos.terminal.cartTitle')}
              </span>
              {itemCount > 0 && <span className="pos-cart-count">{itemCount}</span>}
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <ShoppingCart size={20} className="text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm max-w-[16rem]">{t('pos.terminal.cartEmpty')}</p>
              </div>
            ) : (
              <div className="pos-cart-list">
                {cart.map((item) => (
                  <div key={item.productId} className="pos-cart-row">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {item.salePrice.toLocaleString('uz-UZ')} × {item.quantity} {t(`inventory.units.${item.unit}`)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => bumpQuantity(item.productId, -1)} className="pos-qty-btn">
                        <Minus size={13} />
                      </button>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        className="pos-qty-input"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, e.target.value)}
                      />
                      <button type="button" onClick={() => bumpQuantity(item.productId, 1)} className="pos-qty-btn">
                        <Plus size={13} />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 tabular-nums w-20 text-right shrink-0">
                      {((Number(item.quantity) || 0) * item.salePrice).toLocaleString('uz-UZ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId)}
                      className="btn-icon danger shrink-0"
                      title={t('common.delete')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pos-cart-footer">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-sm font-semibold">{t('pos.terminal.total')}</span>
                <span className="text-2xl font-extrabold text-slate-900 tabular-nums">{total.toLocaleString('uz-UZ')}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`pos-pay-option ${paymentMethod === 'CASH' ? 'pos-pay-option-active' : ''}`}
                >
                  <CircleDollarSign size={18} />
                  {t('pos.terminal.cash')}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`pos-pay-option ${paymentMethod === 'CARD' ? 'pos-pay-option-active' : ''}`}
                >
                  <CreditCard size={18} />
                  {t('pos.terminal.card')}
                </button>
              </div>

              {paymentMethod === 'CASH' && (
                <div className="flex flex-col gap-2">
                  <label className="field-label !mb-0">{t('pos.terminal.amountPaid')}</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="input-field !text-lg !font-bold tabular-nums"
                    value={amountPaidDisplay}
                    onChange={(e) => setAmountPaidInput(e.target.value)}
                  />
                  {roundOptions.length > 0 && (
                    <div className="flex gap-1.5">
                      {roundOptions.map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAmountPaidInput(String(val))}
                          className="pos-round-btn"
                        >
                          {val.toLocaleString('uz-UZ')}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
                    <span className="text-slate-500 text-sm font-medium">{t('pos.terminal.change')}</span>
                    <span className={`text-xl font-bold tabular-nums ${change < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {change.toLocaleString('uz-UZ')}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0 || submitting || (paymentMethod === 'CASH' && change < 0)}
                className="pos-checkout-btn"
              >
                <ShoppingCart size={18} />
                {t('pos.terminal.checkoutBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function POSPage() {
  const { t } = useTranslation();
  const { user, isOwner } = useTenantAuthContext();
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState(null);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeResult, setCloseResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    cashShiftService
      .current()
      .then((res) => {
        if (cancelled) return;
        setShift(res.status === 204 ? null : res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('pos.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleShiftOpened = (newShift) => {
    setShift(newShift);
  };

  const handleShiftClosed = (result) => {
    setCloseModalOpen(false);
    setCloseResult(result);
  };

  const handleCloseResultDone = () => {
    setCloseResult(null);
    setShift(null);
  };

  if (loading) {
    return <div className="text-slate-500 text-sm">{t('common.loading')}</div>;
  }

  if (closeResult) {
    return <CloseShiftResult result={closeResult} onDone={handleCloseResultDone} />;
  }

  if (!shift) {
    return <NoShiftPanel user={user} isOwner={isOwner} onOpened={handleShiftOpened} />;
  }

  return (
    <>
      <POSTerminal shift={shift} onRequestCloseShift={() => setCloseModalOpen(true)} />
      {closeModalOpen && (
        <CloseShiftModal shift={shift} onClose={() => setCloseModalOpen(false)} onClosed={handleShiftClosed} />
      )}
    </>
  );
}
