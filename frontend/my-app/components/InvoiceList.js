'use client';
import { useState } from 'react';
import { BadgeCheck, BadgeAlert, ShoppingBag, Calendar, Pencil, X, Save } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { updateInvoice, fetchCategories } from '../lib/api';

export default function InvoiceList({ invoices, onUpdate }) {
  const { t } = useLanguage();
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [categories, setCategories] = useState([]);

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
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };
  if (!invoices || invoices.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 text-center">
        <div className="mx-auto w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mb-3">
            <ShoppingBag className="w-6 h-6 text-zinc-300" />
        </div>
        <h3 className="text-zinc-900 font-medium">{t('noExpenses')}</h3>
        <p className="text-zinc-500 text-sm mt-1">{t('startPrompt')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
      <div className="p-6 border-b border-zinc-50">
        <h2 className="text-lg font-semibold text-zinc-900">{t('recentActivity')}</h2>
      </div>
      <div className="divide-y divide-zinc-50">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="p-4 hover:bg-zinc-50/50 transition-colors flex items-center justify-between group">
            <div className="flex items-start gap-3">
              <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                invoice.extraction_status === 'success' 
                  ? 'bg-emerald-50 text-emerald-600' 
                  : 'bg-red-50 text-red-600'
              }`}>
                {invoice.extraction_status === 'success' ? (
                  <BadgeCheck className="w-5 h-5" />
                ) : (
                  <BadgeAlert className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-zinc-900">
                  {invoice.merchant || t('unknownMerchant')}
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-zinc-500">
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                         {new Date(invoice.created_at).toLocaleDateString(t('locale'))}
                    </span>
                   {invoice.main_category && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-800">
                      {invoice.main_category}
                    </span>
                   )}
                </div>
              </div>
            </div>
            
            <div className="text-end flex items-center gap-2">
              <div className="font-semibold text-zinc-900">
                {invoice.amount ? `SAR ${invoice.amount.toLocaleString()}` : '--'}
              </div>
              <button 
                onClick={() => handleEdit(invoice)}
                className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors opacity-0 group-hover:opacity-100"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-600" />
                {t('editInvoice')}
              </h2>
              <button onClick={() => setEditingInvoice(null)} className="p-1 hover:bg-zinc-100 rounded">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <div className="mb-4 p-3 bg-zinc-50 rounded-lg">
              <p className="text-sm text-zinc-600">{editingInvoice.merchant || t('unknownMerchant')}</p>
              <p className="text-lg font-semibold text-zinc-900">SAR {editingInvoice.amount?.toLocaleString() || '--'}</p>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">{t('categoryLabel')}</label>
                <select
                  value={editingInvoice.main_category}
                  onChange={e => setEditingInvoice({...editingInvoice, main_category: e.target.value})}
                  className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
                >
                  <option value="">{t('selectCategory')}</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingInvoice(null)} className="flex-1 py-2 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">
                  {t('cancel')}
                </button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
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
