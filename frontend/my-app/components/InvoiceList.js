'use client';
import { useState } from 'react';
import { BadgeCheck, BadgeAlert, ShoppingBag, Calendar, Pencil, X, Save, FileText } from 'lucide-react';
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
      <div className="bg-gradient-to-br from-[#1a1a25] to-[#12121a] rounded-lg border border-[#2a2a3a] p-8 text-center">
        <div className="mx-auto w-12 h-12 bg-[#2a2a3a] rounded border border-[#3a3a4a] flex items-center justify-center mb-3">
            <FileText className="w-6 h-6 text-gray-600" />
        </div>
        <h3 className="text-gray-400 font-bold">{t('noExpenses')}</h3>
        <p className="text-gray-600 text-sm mt-1">{t('startPrompt')}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#1a1a25] to-[#12121a] rounded-lg border border-[#2a2a3a] overflow-hidden">
      <div className="p-5 border-b border-[#2a2a3a]">
        <h2 className="text-base font-bold text-cyan-400 flex items-center gap-2">
          <span className="text-cyan-500">◈</span> {t('recentActivity')}
          <span className="ml-auto text-xs font-mono text-gray-500">[{invoices.length} RECORDS]</span>
        </h2>
      </div>
      <div className="divide-y divide-[#2a2a3a]">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="p-4 hover:bg-[#1f1f2a] transition-colors flex items-center justify-between group">
            <div className="flex items-start gap-3">
              <div className={`mt-1 w-10 h-10 rounded border flex items-center justify-center shrink-0 ${
                invoice.extraction_status === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {invoice.extraction_status === 'success' ? (
                  <BadgeCheck className="w-5 h-5" />
                ) : (
                  <BadgeAlert className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-200">
                  {invoice.merchant || t('unknownMerchant')}
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1 font-mono text-xs">
                        <Calendar className="w-3 h-3 text-cyan-600" />
                         {new Date(invoice.created_at).toLocaleDateString(t('locale'))}
                    </span>
                   {invoice.main_category && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30">
                      {invoice.main_category}
                      {invoice.sub_category && ` / ${invoice.sub_category}`}
                    </span>
                   )}
                </div>
              </div>
            </div>
            
            <div className="text-end flex items-center gap-2">
              <div className="font-bold text-amber-400 font-mono" style={{ textShadow: '0 0 10px rgba(255,170,0,0.3)' }}>
                {invoice.amount ? `SAR ${invoice.amount.toLocaleString()}` : '--'}
              </div>
              <button 
                onClick={() => handleEdit(invoice)}
                className="p-1.5 text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/10 rounded border border-transparent hover:border-cyan-500/30 transition-all opacity-0 group-hover:opacity-100"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#1a1a25] to-[#12121a] rounded-lg p-6 w-full max-w-md border border-cyan-500/30 shadow-[0_0_30px_rgba(0,255,255,0.2)]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-cyan-400 flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                {t('editInvoice')}
              </h2>
              <button onClick={() => setEditingInvoice(null)} className="p-1 hover:bg-[#2a2a3a] rounded border border-transparent hover:border-red-500/30">
                <X className="w-5 h-5 text-gray-500 hover:text-red-400" />
              </button>
            </div>
            <div className="mb-4 p-3 bg-[#0a0a0f] rounded border border-[#2a2a3a]">
              <p className="text-sm text-gray-400 font-mono">{editingInvoice.merchant || t('unknownMerchant')}</p>
              <p className="text-lg font-bold text-amber-400 font-mono">SAR {editingInvoice.amount?.toLocaleString() || '--'}</p>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('categoryLabel')}</label>
                <select
                  value={editingInvoice.main_category}
                  onChange={e => setEditingInvoice({...editingInvoice, main_category: e.target.value})}
                  className="w-full p-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded text-sm text-cyan-300 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] outline-none font-mono"
                >
                  <option value="">{t('selectCategory')}</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('subCategoryLabel')}</label>
                <input
                  value={editingInvoice.sub_category || ''}
                  onChange={e => setEditingInvoice({...editingInvoice, sub_category: e.target.value})}
                  className="w-full p-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded text-sm text-cyan-300 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] outline-none font-mono"
                  placeholder={t('subCategoryPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('classificationLabel')}</label>
                <input
                  value={editingInvoice.classification || ''}
                  onChange={e => setEditingInvoice({...editingInvoice, classification: e.target.value})}
                  className="w-full p-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded text-sm text-cyan-300 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] outline-none font-mono"
                  placeholder={t('classificationPlaceholder')}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingInvoice(null)} className="flex-1 py-2 border border-[#2a2a3a] rounded text-sm font-bold text-gray-400 hover:bg-[#2a2a3a] hover:border-red-500/30 hover:text-red-400 transition-all">
                  {t('cancel')}
                </button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-500 text-black py-2 rounded text-sm font-bold hover:from-cyan-500 hover:to-cyan-400 transition-all flex items-center justify-center gap-2 border border-cyan-400/50 shadow-[0_0_15px_rgba(0,255,255,0.3)]">
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
