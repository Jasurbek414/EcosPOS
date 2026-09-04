import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  Lock, Unlock, ShoppingCart, Trash2, Printer, CircleDollarSign, CreditCard, Barcode, X,
} from 'lucide-react';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';
import { branchService, cashShiftService, posProductService, saleService } from '../../services/api';

const ROUND_STEPS = [10000, 50000];

function NoShiftPanel({ user, isOwner, onOpened }) {
  const { t } = useTranslation();
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(isOwner ? '' : (user?.branchId ?? ''));
  const [openingCash, setOpeningCash] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  // Faqat OWNER uchun: filiallar ro'yxatini yuklab, birinchisini standart qilib tanlaymiz.
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
    <div className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={handleOpen} className="card p-8 w-full max-w-md flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Lock size={24} className="text-slate-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">{t('pos.noShift.title')}</h2>
          <p className="text-slate-500 text-sm">{t('pos.noShift.subtitle')}</p>
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
            className="input-field"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
          />
        </div>

        <button type="submit" disabled={submitting || !branchId} className="btn btn-primary w-full">
          <Unlock size={16} />
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
              className="input-field"
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
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="card p-8 w-full max-w-md flex flex-col gap-5">
        <h2 className="text-lg font-bold text-slate-900">{t('pos.closeResult.title')}</h2>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">{t('pos.closeResult.opening')}</span>
            <span className="font-medium text-slate-900">{Number(result.openingCash).toLocaleString('uz-UZ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{t('pos.closeResult.expected')}</span>
            <span className="font-medium text-slate-900">{Number(result.expectedCash).toLocaleString('uz-UZ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{t('pos.closeResult.actual')}</span>
            <span className="font-medium text-slate-900">{Number(result.closingCash).toLocaleString('uz-UZ')}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-200">
            <span className="text-slate-500">{t('pos.closeResult.diff')}</span>
            <span className={`font-bold ${diffClass}`}>
              {diff > 0 ? '+' : ''}
              {diff.toLocaleString('uz-UZ')} ({diffLabel})
            </span>
          </div>
        </div>
        <button type="button" onClick={onDone} className="btn btn-primary w-full">
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}

function ReceiptView({ receipt, onNewSale }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="card p-8 w-full max-w-md flex flex-col gap-4">
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-900">{t('pos.receipt.title')}</h2>
          <p className="text-slate-500 text-xs mt-1">
            #{receipt.id} · {new Date(receipt.createdAt).toLocaleString('uz-UZ')}
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm border-t border-b border-slate-200 py-3">
          {receipt.items.map((item) => (
            <div key={item.productId} className="flex justify-between gap-2">
              <span className="text-slate-700">
                {item.productName}{' '}
                <span className="text-slate-400">
                  x{item.quantity} {t(`inventory.units.${item.unit}`)}
                </span>
              </span>
              <span className="font-medium text-slate-900 whitespace-nowrap">{Number(item.subtotal).toLocaleString('uz-UZ')}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">{t('pos.receipt.total')}</span>
            <span className="font-bold text-slate-900 text-base">{Number(receipt.totalAmount).toLocaleString('uz-UZ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{t('pos.receipt.paymentMethod')}</span>
            <span className="text-slate-900">{t(`pos.terminal.${receipt.paymentMethod === 'CARD' ? 'card' : 'cash'}`)}</span>
          </div>
          {receipt.paymentMethod === 'CASH' && (
            <>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('pos.receipt.amountPaid')}</span>
                <span className="text-slate-900">{Number(receipt.amountPaid).toLocaleString('uz-UZ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('pos.receipt.change')}</span>
                <span className="text-slate-900">{Number(receipt.changeAmount).toLocaleString('uz-UZ')}</span>
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

  useEffect(() => {
    inputRef.current?.focus();
  }, [receipt]);

  const total = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0) * item.salePrice, 0);
  const amountPaidDisplay = amountPaidInput === null ? String(total || 0) : amountPaidInput;
  const amountPaidNumeric = Number(amountPaidDisplay) || 0;
  const change = amountPaidNumeric - total;
  const roundOptions = ROUND_STEPS.map((step) => Math.ceil((total || 1) / step) * step).filter((v) => v > total);

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
      <div className="flex items-center justify-between card px-5 py-3 print:hidden">
        <div className="flex items-center gap-2 text-sm">
          <Unlock size={16} className="text-emerald-600" />
          <span className="font-medium text-slate-900">{t('pos.shiftBar.open')}</span>
          <span className="text-slate-500">
            — {t('pos.shiftBar.opening')}: {Number(shift.openingCash).toLocaleString('uz-UZ')} {t('pos.shiftBar.currency')}
          </span>
        </div>
        <button type="button" onClick={onRequestCloseShift} className="btn btn-outline">
          <Lock size={16} />
          {t('pos.shiftBar.closeBtn')}
        </button>
      </div>

      {receipt ? (
        <ReceiptView receipt={receipt} onNewSale={handleNewSale} />
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          <div className="flex-1 w-full flex flex-col gap-4">
            <div className="relative">
              <Barcode size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                autoFocus
                disabled={searching}
                className="input-field !pl-10 !py-3 !text-base"
                placeholder={t('pos.terminal.searchPlaceholder')}
                value={query}
                onChange={handleQueryChange}
                onKeyDown={handleSearchKeyDown}
              />
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

            {cart.length === 0 ? (
              <div className="card py-20 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                  <ShoppingCart size={24} className="text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm">{t('pos.terminal.cartEmpty')}</p>
              </div>
            ) : (
              <div className="card table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('pos.terminal.product')}</th>
                      <th>{t('pos.terminal.unit')}</th>
                      <th>{t('pos.terminal.quantity')}</th>
                      <th>{t('pos.terminal.price')}</th>
                      <th>{t('pos.terminal.subtotal')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => (
                      <tr key={item.productId}>
                        <td className="font-medium text-slate-900">{item.name}</td>
                        <td className="text-slate-600">{t(`inventory.units.${item.unit}`)}</td>
                        <td className="min-w-[100px]">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            className="input-field"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.productId, e.target.value)}
                          />
                        </td>
                        <td className="text-slate-600 whitespace-nowrap">{item.salePrice.toLocaleString('uz-UZ')}</td>
                        <td className="text-slate-900 font-semibold whitespace-nowrap">
                          {((Number(item.quantity) || 0) * item.salePrice).toLocaleString('uz-UZ')}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId)}
                            className="btn-icon danger"
                            title={t('common.delete')}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card p-6 flex flex-col gap-4 w-full lg:w-80 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-sm font-semibold">{t('pos.terminal.total')}</span>
              <span className="text-2xl font-bold text-slate-900">{total.toLocaleString('uz-UZ')}</span>
            </div>

            <div>
              <label className="field-label">{t('pos.terminal.paymentMethod')}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`btn ${paymentMethod === 'CASH' ? 'btn-primary' : 'btn-outline'}`}
                >
                  <CircleDollarSign size={16} />
                  {t('pos.terminal.cash')}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`btn ${paymentMethod === 'CARD' ? 'btn-primary' : 'btn-outline'}`}
                >
                  <CreditCard size={16} />
                  {t('pos.terminal.card')}
                </button>
              </div>
            </div>

            {paymentMethod === 'CASH' && (
              <div className="flex flex-col gap-2">
                <label className="field-label">{t('pos.terminal.amountPaid')}</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="input-field"
                  value={amountPaidDisplay}
                  onChange={(e) => setAmountPaidInput(e.target.value)}
                />
                {roundOptions.length > 0 && (
                  <div className="flex gap-2">
                    {roundOptions.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmountPaidInput(String(val))}
                        className="btn btn-outline !px-2 !py-1.5 text-xs"
                      >
                        {val.toLocaleString('uz-UZ')}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-500 text-sm">{t('pos.terminal.change')}</span>
                  <span className={`text-lg font-bold ${change < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {change.toLocaleString('uz-UZ')}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0 || submitting || (paymentMethod === 'CASH' && change < 0)}
              className="btn btn-primary w-full mt-2"
            >
              <ShoppingCart size={16} />
              {t('pos.terminal.checkoutBtn')}
            </button>
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

  // Sahifa ochilganda joriy (ochiq) smenani tekshiramiz.
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
