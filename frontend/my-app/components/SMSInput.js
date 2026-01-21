'use client';
import { useState } from 'react';
import { Send, CheckCircle, AlertCircle, Loader2, Zap } from 'lucide-react';
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
    <div className="bg-gradient-to-br from-[#1a1a25] to-[#12121a] rounded-lg border border-[#2a2a3a] p-5">
      <h2 className="text-base font-bold text-cyan-400 mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-amber-400" />
        {t('newExpense')}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('pasteSMS')}
            className="w-full min-h-[100px] p-4 text-cyan-300 bg-[#0a0a0f] rounded-lg border border-[#2a2a3a] focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(0,255,255,0.2)] focus:outline-none transition-all resize-none placeholder:text-gray-600 font-mono text-sm"
            disabled={loading}
          />
          <div className="absolute bottom-2 right-2 text-[10px] text-gray-600 font-mono">
            {message.length > 0 && `${message.length} chars`}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
             {status === 'success' && (
              <span className="text-emerald-400 flex items-center gap-1.5 font-bold animate-in fade-in slide-in-from-left-2" style={{ textShadow: '0 0 10px rgba(0,255,136,0.5)' }}>
                <CheckCircle className="w-4 h-4" />
                {t('success')}
              </span>
            )}
            {status === 'error' && (
              <span className="text-red-400 flex items-center gap-1.5 font-bold animate-in fade-in slide-in-from-left-2" style={{ textShadow: '0 0 10px rgba(255,0,100,0.5)' }}>
                <AlertCircle className="w-4 h-4" />
                {t('error')}
              </span>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-black px-5 py-2 rounded font-bold transition-all flex items-center gap-2 border border-cyan-400/50 shadow-[0_0_15px_rgba(0,255,255,0.3)] hover:shadow-[0_0_25px_rgba(0,255,255,0.5)]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> {t('processSMS')}</>}
          </button>
        </div>
      </form>
    </div>
  );
}
