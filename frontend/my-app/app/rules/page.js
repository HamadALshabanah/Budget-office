'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save, ArrowRight, Pencil, X, Tag, RefreshCw, Check, Moon, Sun } from 'lucide-react';
import { fetchRules, addRule, deleteRule, updateRule, categorizeInvoices, isAuthenticated, fetchCategories } from '../../lib/api';
import { buildPathMap } from '../../lib/categories';
import CategorySelect from '../../components/CategorySelect';
import KeywordsInput from '../../components/KeywordsInput';
import { useLanguage } from '../../lib/LanguageContext';

export default function RulesPage() {
    const router = useRouter();
    const { t, isRTL, theme, toggleTheme } = useLanguage();
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);

    const [merchantKeywords, setMerchantKeywords] = useState([]);
    const [categoryId, setCategoryId] = useState(null);
    const [limit, setLimit] = useState('');
    const [tree, setTree] = useState([]);
    const [pathMap, setPathMap] = useState({});

    const [editingRule, setEditingRule] = useState(null);
    const [editKeywords, setEditKeywords] = useState([]);

    const [recategorizing, setRecategorizing] = useState(false);
    const [recategorizeResult, setRecategorizeResult] = useState(null);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.replace('/login');
            return;
        }
        loadRules();
        loadTree();
    }, []);

    const loadRules = async () => {
        setLoading(true);
        try {
            const data = await fetchRules();
            setRules(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            setRules([]);
        } finally {
            setLoading(false);
        }
    };

    const loadTree = async () => {
        try {
            const nodes = await fetchCategories();
            setTree(Array.isArray(nodes) ? nodes : []);
            setPathMap(buildPathMap(nodes));
        } catch (error) {
            console.error(error);
        }
    };

    const parseKeywords = (keywordsStr) => {
        if (!keywordsStr) return [];
        return keywordsStr.split(',').map(k => k.trim()).filter(k => k);
    };

    const handleAddRule = async (e) => {
        e.preventDefault();
        if (merchantKeywords.length === 0 || !categoryId) return;

        try {
            await addRule({
                merchant_keywords: merchantKeywords.join(','),
                category_id: categoryId,
                category_limit: limit ? parseFloat(limit) : null
            });
            setMerchantKeywords([]);
            setCategoryId(null);
            setLimit('');
            loadRules();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('confirmDelete'))) return;
        try {
            await deleteRule(id);
            loadRules();
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (rule) => {
        const keywords = parseKeywords(rule.merchant_keywords);
        setEditKeywords(keywords);
        setEditingRule({
            ...rule,
            category_limit: rule.category_limit || ''
        });
    };

    const handleUpdateRule = async (e) => {
        e.preventDefault();
        if (!editingRule || editKeywords.length === 0 || !editingRule.category_id) return;
        try {
            await updateRule(editingRule.id, {
                merchant_keywords: editKeywords.join(','),
                classification: editingRule.classification || 'Expense',
                category_id: editingRule.category_id,
                category_limit: editingRule.category_limit ? parseFloat(editingRule.category_limit) : null
            });
            setEditingRule(null);
            setEditKeywords([]);
            loadRules();
        } catch (err) {
            console.error(err);
        }
    };

    const handleRecategorize = async () => {
        setRecategorizing(true);
        setRecategorizeResult(null);
        try {
            const result = await categorizeInvoices();
            setRecategorizeResult(result);
            setTimeout(() => setRecategorizeResult(null), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setRecategorizing(false);
        }
    };

    return (
        <div className="min-h-screen">
            {/* Header — notebook cover style, consistent with main page */}
            <header className="sticky top-0 z-10 notebook-header">
                <div className="max-w-6xl mx-auto px-6 sm:px-8 flex items-center justify-between" style={{ height: '52px' }}>
                    <div className="flex items-center gap-3">
                        <Link href="/" className="btn-secondary p-1.5 rounded">
                            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                        </Link>
                        <h1 className="font-heading text-sm" style={{ color: 'var(--text-primary)' }}>{t('rulesTitle')}</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="btn-secondary flex items-center justify-center w-8 h-8 p-0"
                            title={theme === 'light' ? 'Dark mode' : 'Light mode'}
                        >
                            {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                        </button>
                        {recategorizeResult && (
                            <span className="badge badge-green text-[9px] animate-fade-up">
                                <Check className="w-3 h-3" />
                                {t('appliedSuccess')} {recategorizeResult.updated_invoices} {t('invoices')}
                            </span>
                        )}
                        <button
                            onClick={handleRecategorize}
                            disabled={recategorizing}
                            className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-30"
                            title={t('applyRulesDesc')}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${recategorizing ? 'animate-spin' : ''}`} />
                            {recategorizing ? t('applying') : t('applyRules')}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 sm:px-8 py-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Add Rule Form */}
                    <div className="md:col-span-1">
                        <div className="panel p-4 sticky top-6">
                            <h2 className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                <Plus className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                {t('addRule')}
                            </h2>
                            <form onSubmit={handleAddRule} className="space-y-3">
                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('merchantLabel')}</label>
                                    <KeywordsInput
                                        keywords={merchantKeywords}
                                        setKeywords={setMerchantKeywords}
                                        placeholder={t('merchantPlaceholder')}
                                        hint={t('merchantHint')}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('categoryLabel')}</label>
                                    <CategorySelect
                                        tree={tree}
                                        value={categoryId}
                                        onChange={setCategoryId}
                                        onTreeRefresh={loadTree}
                                        required
                                        placeholder={t('selectCategory')}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('limitLabel')}</label>
                                    <input
                                        type="number"
                                        value={limit}
                                        onChange={e => setLimit(e.target.value)}
                                        className="input-field w-full p-2 text-sm font-data"
                                        placeholder={t('limitPlaceholder')}
                                    />
                                </div>

                                <button type="submit" className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5">
                                    <Save className="w-3.5 h-3.5" />
                                    {t('saveRule')}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Rules List */}
                    <div className="md:col-span-2">
                        <div className="panel overflow-hidden">
                            <div className="p-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--base-subtle)' }}>
                                <div className="grid grid-cols-12 text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                    <div className="col-span-4">{t('colPattern')}</div>
                                    <div className="col-span-4">{t('colCategory')}</div>
                                    <div className="col-span-3">{t('colLimit')}</div>
                                    <div className="col-span-1"></div>
                                </div>
                            </div>
                            <div>
                                {loading ? (
                                    <div className="p-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                                        {t('loading')}
                                    </div>
                                ) : !Array.isArray(rules) || rules.length === 0 ? (
                                    <div className="p-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>{t('noRules')}</div>
                                ) : (
                                    rules.map((rule, index) => (
                                        <div
                                            key={rule.id}
                                            className="p-3 group data-row"
                                            style={{ borderBottom: index < rules.length - 1 ? '1px solid var(--border)' : 'none' }}
                                        >
                                            <div className="grid grid-cols-12 items-center">
                                                <div className="col-span-4 text-xs font-medium truncate pr-2" style={{ color: 'var(--text-primary)' }}>
                                                    {parseKeywords(rule.merchant_keywords)[0] || '-'}
                                                </div>
                                                <div className="col-span-4 text-xs">
                                                    <span className="badge badge-green" title={pathMap[rule.category_id]?.path || ''}>
                                                        {pathMap[rule.category_id]?.path || rule.category_id || '—'}
                                                    </span>
                                                </div>
                                                <div className="col-span-3 text-xs font-data" style={{ color: 'var(--amount)' }}>
                                                    {rule.category_limit ? `SAR ${rule.category_limit.toLocaleString()}` : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                                                </div>
                                                <div className="col-span-1 text-end flex gap-0.5 justify-end data-actions">
                                                    <button
                                                        onClick={() => handleEdit(rule)}
                                                        className="icon-btn"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(rule.id)}
                                                        className="icon-btn icon-btn-danger"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                            {parseKeywords(rule.merchant_keywords).length > 1 && (
                                                <div className="mt-1.5 flex flex-wrap gap-1">
                                                    {parseKeywords(rule.merchant_keywords).map((kw, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="badge badge-green text-[9px]"
                                                        >
                                                            <Tag className="w-2 h-2" />
                                                            {kw}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Rule Modal */}
                {editingRule && (
                    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
                        <div className="panel p-5 w-full max-w-md animate-fade-up" style={{ background: 'var(--surface-raised)' }}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-heading text-sm" style={{ color: 'var(--text-primary)' }}>
                                    {t('editRule')}
                                </h2>
                                <button onClick={() => { setEditingRule(null); setEditKeywords([]); }} className="icon-btn">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateRule} className="space-y-3">
                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('merchantLabel')}</label>
                                    <KeywordsInput
                                        keywords={editKeywords}
                                        setKeywords={setEditKeywords}
                                        placeholder={t('merchantPlaceholder')}
                                        hint={t('merchantHint')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('categoryLabel')}</label>
                                    <CategorySelect
                                        tree={tree}
                                        value={editingRule.category_id}
                                        onChange={v => setEditingRule({ ...editingRule, category_id: v })}
                                        onTreeRefresh={loadTree}
                                        required
                                        placeholder={t('selectCategory')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('limitLabel')}</label>
                                    <input
                                        type="number"
                                        value={editingRule.category_limit}
                                        onChange={e => setEditingRule({...editingRule, category_limit: e.target.value})}
                                        className="input-field w-full p-2 text-sm font-data"
                                        placeholder={t('limitPlaceholder')}
                                    />
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <button type="button" onClick={() => { setEditingRule(null); setEditKeywords([]); }} className="btn-secondary flex-1 py-2 text-xs">
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
            </main>
        </div>
    );
}
