'use client';
import { useState } from 'react';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { postSMS } from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';

export default function SMSInput({ onInvoiceAdded }) {
  const { t } = useLanguage();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

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
    <div className="panel p-3">
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="relative flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('pasteSMS') || 'Paste transaction SMS here...'}
            className="input-field w-full min-h-[48px] max-h-[120px] p-3 text-sm resize-y rounded-lg font-sans"
            style={{ lineHeight: 1.5, background: 'var(--surface-inset)' }}
            disabled={loading}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
        </div>

        <div className="flex flex-col justify-end">
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="btn-primary h-[48px] px-5 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> <span className="hidden sm:inline">{t('processSMS') || 'Add'}</span></>}
          </button>
        </div>
      </form>
      
      {/* Status Indicators below input */}
      {(status === 'success' || status === 'error') && (
        <div className="mt-2 ml-1 flex items-center gap-1.5 text-xs animate-fade-up">
          {status === 'success' && (
            <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--accent)' }}>
              <CheckCircle className="w-3.5 h-3.5" />
              {t('success')}
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--danger)' }}>
              <AlertCircle className="w-3.5 h-3.5" />
              {t('error')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
