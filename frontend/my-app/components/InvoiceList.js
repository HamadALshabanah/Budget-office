'use client';
import { useState, useEffect, useCallback } from 'react';
import { Pencil, X, Save, FileText, Trash2, Search, SlidersHorizontal, ArrowDownLeft } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { updateInvoice, fetchCategories, deleteInvoice, fetchInvoices, getCurrentCycle, getCycleAnalysis, getCycleInvoices } from '../lib/api';

export default function InvoiceList({ refreshTrigger, onUpdate, selectedCycleId }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cycleBudget, setCycleBudget] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
  }, []);

  // Fetch cycle budget for running balance
  useEffect(() => {
    const fetchBudget = async () => {
      try {
        if (selectedCycleId) {
          const analysis = await getCycleAnalysis(selectedCycleId);
          setCycleBudget(analysis.total_budget || 0);
        } else {
          const cycle = await getCurrentCycle();
          if (cycle.status === 'no_active_cycle') { setCycleBudget(null); return; }
          const analysis = await getCycleAnalysis(cycle.id);
          setCycleBudget(analysis.total_budget || 0);
        }
      } catch { setCycleBudget(null); }
    };
    fetchBudget();
  }, [refreshTrigger, selectedCycleId]);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      if (selectedCycleId) {
        // Fetch all invoices for the selected cycle, then filter client-side
        data = await getCycleInvoices(selectedCycleId);
        if (debouncedSearch) data = data.filter(inv => inv.merchant?.toLowerCase().includes(debouncedSearch.toLowerCase()));
        if (filterCategory) data = data.filter(inv => inv.main_category === filterCategory);
        if (minAmount !== '') data = data.filter(inv => (inv.amount || 0) >= parseFloat(minAmount));
        if (maxAmount !== '') data = data.filter(inv => (inv.amount || 0) <= parseFloat(maxAmount));
      } else {
        data = await fetchInvoices({
          search: debouncedSearch || undefined,
          category: filterCategory || undefined,
          min_amount: minAmount || undefined,
          max_amount: maxAmount || undefined,
        });
      }
      setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterCategory, minAmount, maxAmount, refreshTrigger, selectedCycleId]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const hasActiveFilters = debouncedSearch || filterCategory || minAmount || maxAmount;

  const clearFilters = () => {
    setSearch('');
    setFilterCategory('');
    setMinAmount('');
    setMaxAmount('');
  };

  const handleEdit = async (invoice) => {
    const cats = await fetchCategories();
    setCategories(cats);
    setEditingInvoice({
      ...invoice,
      main_category: invoice.main_category || ''
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingInvoice) return;
    try {
      await updateInvoice(editingInvoice.id, {
        classification: editingInvoice.classification || '',
        main_category: editingInvoice.main_category,
        sub_category: editingInvoice.sub_category || ''
      });
      setEditingInvoice(null);
      loadInvoices();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (invoiceId) => {
    if (!confirm(t('confirmDeleteInvoice'))) return;
    try {
      await deleteInvoice(invoiceId);
      loadInvoices();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return {
      day: d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short' }),
      time: d.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  return (
    <div className="panel overflow-hidden">
      {/* Toolbar */}
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {isRTL ? 'كشف الحساب' : 'Ledger'}
          </span>
          {!loading && (
            <span className="text-[10px] font-data px-1.5 py-0.5 rounded" style={{ background: 'var(--base-subtle)', color: 'var(--text-tertiary)' }}>
              {invoices.length}
            </span>
          )}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors"
              style={{ color: 'var(--danger)', background: 'var(--danger-dim)' }}
            >
              {isRTL ? 'مسح الفلاتر' : 'Clear filters'}
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="icon-btn"
          style={showFilters ? { background: 'var(--base-subtle)', color: 'var(--text-secondary)' } : {}}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="px-5 py-3 space-y-2" style={{ background: 'var(--base-subtle)', borderBottom: '1px solid var(--border)' }}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRTL ? 'ابحث عن تاجر...' : 'Search merchant...'}
              className="input-field w-full pl-8 pr-3 py-1.5 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input-field flex-1 py-1.5 px-2.5 text-xs"
            >
              <option value="">{isRTL ? 'كل الفئات' : 'All categories'}</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder={isRTL ? 'الحد الأدنى' : 'Min SAR'}
              className="input-field w-20 py-1.5 px-2.5 text-xs font-data"
            />
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder={isRTL ? 'الحد الأقصى' : 'Max SAR'}
              className="input-field w-20 py-1.5 px-2.5 text-xs font-data"
            />
          </div>
        </div>
      )}

      {/* Ledger column headers */}
      <div className="ledger-header">
        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {isRTL ? 'التاريخ' : 'Date'}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {isRTL ? 'التاجر' : 'Merchant'}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {isRTL ? 'الفئة' : 'Category'}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-muted)' }}>
          {isRTL ? 'المبلغ' : 'Debit (SAR)'}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-muted)' }}>
          {isRTL ? 'الرصيد' : 'Balance (SAR)'}
        </span>
        <span />
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="ledger-row animate-pulse">
              <div className="space-y-1">
                <div className="h-2.5 rounded w-10" style={{ background: 'var(--base-subtle)' }} />
                <div className="h-2 rounded w-7" style={{ background: 'var(--base-subtle)' }} />
              </div>
              <div className="space-y-1">
                <div className="h-3 rounded w-32" style={{ background: 'var(--base-subtle)' }} />
                <div className="h-2 rounded w-20" style={{ background: 'var(--base-subtle)' }} />
              </div>
              <div className="h-4 rounded w-16" style={{ background: 'var(--base-subtle)' }} />
              <div className="h-5 rounded w-20 ml-auto" style={{ background: 'var(--base-subtle)' }} />
              <div className="h-5 rounded w-20 ml-auto" style={{ background: 'var(--base-subtle)' }} />
              <div />
            </div>
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--base-subtle)', border: '1px solid var(--border)' }}>
            <FileText className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {hasActiveFilters ? (isRTL ? 'لا توجد نتائج' : 'No matching transactions') : t('noExpenses')}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {hasActiveFilters ? (isRTL ? 'جرب تغيير الفلاتر' : 'Try adjusting your filters') : t('startPrompt')}
          </p>
        </div>
      ) : (
        <div>
          {invoices.map((invoice, index) => {
            const { day, time } = formatDate(invoice.created_at);
            const isSuccess = invoice.extraction_status === 'success';
            // Running balance: budget minus cumulative spend up to this row
            const cumulativeSpend = invoices.slice(0, index + 1).reduce((sum, inv) => sum + (inv.amount || 0), 0);
            const runningBalance = cycleBudget != null ? cycleBudget - cumulativeSpend : null;
            const isNegative = runningBalance != null && runningBalance < 0;
            return (
              <div
                key={invoice.id}
                className="ledger-row group"
                style={{
                  borderLeft: `2px solid ${isSuccess ? 'var(--accent-mid)' : 'var(--danger)'}`,
                }}
              >
                {/* Date */}
                <div>
                  <p className="text-xs font-data font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{day}</p>
                  <p className="text-[10px] font-data mt-0.5" style={{ color: 'var(--text-muted)' }}>{time}</p>
                </div>

                {/* Merchant */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded shrink-0 flex items-center justify-center" style={{ background: 'var(--danger-dim)' }}>
                      <ArrowDownLeft className="w-3 h-3" style={{ color: 'var(--danger)' }} />
                    </div>
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {invoice.merchant || t('unknownMerchant')}
                    </p>
                  </div>
                  {invoice.classification && (
                    <p className="text-[10px] mt-0.5 ml-7 truncate" style={{ color: 'var(--text-muted)' }}>
                      {invoice.classification}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div className="flex items-center">
                  {invoice.main_category ? (
                    <span className="badge badge-green text-[9px] whitespace-nowrap">
                      {invoice.main_category}
                      {invoice.sub_category && (
                        <span style={{ color: 'var(--accent-mid)', opacity: 0.8 }}> / {invoice.sub_category}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </div>

                {/* Debit Amount */}
                <div className="text-right">
                  <p className="text-base font-semibold font-data leading-tight" style={{ color: 'var(--amount)' }}>
                    {invoice.amount != null ? invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                  </p>
                  <p className="text-[9px] font-data mt-0.5" style={{ color: 'var(--text-muted)' }}>SAR</p>
                </div>

                {/* Running Balance */}
                <div className="text-right">
                  {runningBalance != null ? (
                    <>
                      <p className="text-base font-semibold font-data leading-tight" style={{ color: isNegative ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {Math.abs(runningBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] font-data mt-0.5" style={{ color: isNegative ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {isNegative ? (isRTL ? 'تجاوز SAR' : 'Over SAR') : 'SAR'}
                      </p>
                    </>
                  ) : (
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </div>

                {/* Actions */}
                <div className="data-actions flex items-center gap-0.5 justify-end">
                  <button onClick={() => handleEdit(invoice)} className="icon-btn" title={t('edit')}>
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(invoice.id)} className="icon-btn icon-btn-danger" title={t('delete')}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Ledger footer — total */}
          <div className="ledger-row" style={{ borderTop: '1px solid var(--border-strong)', borderBottom: 'none', background: 'var(--base-subtle)' }}>
            <div />
            <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {isRTL ? 'المجموع' : 'Period Total'}
            </p>
            <div />
            <div className="text-right">
              <p className="text-base font-semibold font-data" style={{ color: 'var(--amount)' }}>
                {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[9px] font-data" style={{ color: 'var(--text-muted)' }}>SAR</p>
            </div>
            {cycleBudget != null ? (
              <div className="text-right">
                <p className="text-base font-semibold font-data" style={{ color: (cycleBudget - totalAmount) < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {Math.abs(cycleBudget - totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[9px] font-data" style={{ color: (cycleBudget - totalAmount) < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {(cycleBudget - totalAmount) < 0 ? (isRTL ? 'تجاوز SAR' : 'Over SAR') : (isRTL ? 'متبقي SAR' : 'Remaining SAR')}
                </p>
              </div>
            ) : (
              <div />
            )}
            <div />
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="panel p-5 w-full max-w-md animate-fade-up" style={{ background: 'var(--surface-raised)' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-heading text-sm" style={{ color: 'var(--text-primary)' }}>
                {t('editInvoice')}
              </h2>
              <button onClick={() => setEditingInvoice(null)} className="icon-btn">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Invoice preview */}
            <div className="mb-4 p-4 rounded-lg" style={{ background: 'var(--base-subtle)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{editingInvoice.merchant || t('unknownMerchant')}</p>
              <p className="text-2xl font-semibold font-data mt-1 leading-tight" style={{ color: 'var(--amount)' }}>
                {editingInvoice.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '—'}
                <span className="text-sm font-normal ml-1" style={{ color: 'var(--text-muted)' }}>SAR</span>
              </p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('categoryLabel')}</label>
                <select
                  value={editingInvoice.main_category}
                  onChange={e => setEditingInvoice({ ...editingInvoice, main_category: e.target.value })}
                  className="input-field w-full p-2 text-sm"
                >
                  <option value="">{t('selectCategory')}</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('subCategoryLabel')}</label>
                <input
                  value={editingInvoice.sub_category || ''}
                  onChange={e => setEditingInvoice({ ...editingInvoice, sub_category: e.target.value })}
                  className="input-field w-full p-2 text-sm"
                  placeholder={t('subCategoryPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('classificationLabel')}</label>
                <input
                  value={editingInvoice.classification || ''}
                  onChange={e => setEditingInvoice({ ...editingInvoice, classification: e.target.value })}
                  className="input-field w-full p-2 text-sm"
                  placeholder={t('classificationPlaceholder')}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditingInvoice(null)} className="btn-secondary flex-1 py-2 text-xs">
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  {t('update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
