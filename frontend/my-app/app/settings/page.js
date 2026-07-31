'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Key, Copy, Check, RefreshCw, Trash2, AlertTriangle, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { createApiKey, revokeApiKey, isAuthenticated } from '../../lib/api';
import { useLanguage } from '../../lib/LanguageContext';

export default function SettingsPage() {
    const router = useRouter();
    const { t, isRTL } = useLanguage();
    const [apiKey, setApiKey] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'error'
    const [message, setMessage] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.replace('/login');
        }
    }, [router]);

    const showStatus = (type, msg) => {
        setStatus(type);
        setMessage(msg);
        setTimeout(() => setStatus(null), 3000);
    };

    const handleGenerate = async () => {
        setLoading(true);
        setStatus(null);
        try {
            const data = await createApiKey();
            setApiKey(data.api_key);
            showStatus('success', t('apiKeyGenerated'));
        } catch (err) {
            console.error(err);
            showStatus('error', err.message || t('error'));
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async () => {
        if (!window.confirm(t('revokeConfirm'))) return;
        setLoading(true);
        setStatus(null);
        try {
            await revokeApiKey();
            setApiKey(null);
            setCopied(false);
            showStatus('success', t('apiKeyRevoked'));
        } catch (err) {
            console.error(err);
            showStatus('error', err.message || t('error'));
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!apiKey) return;
        try {
            await navigator.clipboard.writeText(apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed', err);
        }
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-10 notebook-header">
                <div className="max-w-6xl mx-auto px-6 sm:px-8 flex items-center justify-between" style={{ height: '52px' }}>
                    <Link href="/" className="btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 text-xs">
                        <ArrowLeft className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                        {t('back') || (isRTL ? 'رجوع' : 'Back')}
                    </Link>
                    <h1 className="font-heading text-sm" style={{ color: 'var(--text-primary)' }}>
                        {t('settings')}
                    </h1>
                    <div className="w-16" />
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-6 sm:px-8 py-8 space-y-6">
                {/* API Keys Section */}
                <section className="panel p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                            <Key className="w-3.5 h-3.5" />
                        </div>
                        <div>
                            <h2 className="font-heading text-base" style={{ color: 'var(--text-primary)' }}>
                                {t('apiKeys')}
                            </h2>
                            <p className="text-[10px] mt-0.5 font-data uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                {isRTL ? 'مفتاح للوصول البرمجي إلى /sms' : 'Programmatic access to /sms'}
                            </p>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'var(--surface-inset)' }}>
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--warning)' }} />
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {t('apiKeyOnlyShownOnce')}
                        </p>
                    </div>

                    {/* Key display */}
                    {apiKey && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-data uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                {t('apiKeyLabel') || (isRTL ? 'المفتاح' : 'API Key')}
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={apiKey}
                                    className="input-field flex-1 px-3 py-2 text-xs font-data rounded-lg"
                                    style={{ background: 'var(--surface-inset)' }}
                                    onFocus={(e) => e.target.select()}
                                />
                                <button
                                    onClick={handleCopy}
                                    className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? t('copied') : t('copyApiKey')}
                                </button>
                            </div>

                            {/* Usage hint */}
                            <div className="p-3 rounded-lg mt-2" style={{ background: 'var(--surface-inset)' }}>
                                <p className="text-[10px] font-data uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                                    {isRTL ? 'مثال الاستخدام' : 'Usage example'}
                                </p>
                                <code className="text-[11px] font-data block break-all" style={{ color: 'var(--text-secondary)' }}>
                                    curl -X POST {`{{API_URL}`}/sms \<br />
                                    &nbsp;&nbsp;-H "X-API-KEY: {apiKey}" \<br />
                                    &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                                    &nbsp;&nbsp;-d {`'{"message": "..."}'`}
                                </code>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            {apiKey ? t('regenerateApiKey') : t('generateApiKey')}
                        </button>
                        {apiKey && (
                            <button
                                onClick={handleRevoke}
                                disabled={loading}
                                className="btn-secondary flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg"
                                style={{ color: 'var(--danger)' }}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                {t('revokeApiKey')}
                            </button>
                        )}
                    </div>

                    {/* Status */}
                    {status && (
                        <div className="flex items-center gap-1.5 text-xs animate-fade-up">
                            {status === 'success' ? (
                                <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--accent)' }}>
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    {message}
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--danger)' }}>
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    {message}
                                </span>
                            )}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
