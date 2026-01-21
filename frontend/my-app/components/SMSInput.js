'use client';
import { useState } from 'react';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { postSMS } from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';

export default function SMSInput({ onInvoiceAdded }) {
  const { t } = useLanguage();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setStatus(null);
    try {
      const res = await postSMS(message);
      if (res.status === 'SMS processed') {
        setStatus('success');
        setMessage('');
        if (onInvoiceAdded) onInvoiceAdded();
        
        // Clear success message after 3 seconds
        setTimeout(() => setStatus(null), 3000);
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
      <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
        <Send className="w-5 h-5 text-indigo-600" />
        {t('newExpense')}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('pasteSMS')}
            className="w-full min-h-[100px] p-4 text-zinc-700 bg-zinc-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all resize-none placeholder:text-zinc-400"
            disabled={loading}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
             {status === 'success' && (
              <span className="text-emerald-600 flex items-center gap-1.5 font-medium animate-in fade-in slide-in-from-left-2">
                <CheckCircle className="w-4 h-4" />
                {t('success')}
              </span>
            )}
            {status === 'error' && (
              <span className="text-red-600 flex items-center gap-1.5 font-medium animate-in fade-in slide-in-from-left-2">
                <AlertCircle className="w-4 h-4" />
                {t('error')}
              </span>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('processSMS')}
          </button>
        </div>
      </form>
    </div>
  );
}
