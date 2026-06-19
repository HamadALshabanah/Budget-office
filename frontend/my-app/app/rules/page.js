'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save, ArrowRight, Pencil, X, Tag, RefreshCw, Check, Moon, Sun } from 'lucide-react';
import { fetchRules, addRule, deleteRule, updateRule, categorizeInvoices } from '../../lib/api';
import { useLanguage } from '../../lib/LanguageContext';

function KeywordsInput({ keywords, setKeywords, placeholder, hint }) {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef(null);

    const addKeyword = (keyword) => {
        const trimmed = keyword.trim();
        if (trimmed && !keywords.includes(trimmed)) {
            setKeywords([...keywords, trimmed]);
        }
        setInputValue('');
    };

    const removeKeyword = (indexToRemove) => {
        setKeywords(keywords.filter((_, index) => index !== indexToRemove));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addKeyword(inputValue);
        } else if (e.key === 'Backspace' && inputValue === '' && keywords.length > 0) {
            removeKeyword(keywords.length - 1);
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        const newKeywords = pastedText.split(/[,،\n]+/).map(k => k.trim()).filter(k => k);
        const uniqueNew = newKeywords.filter(k => !keywords.includes(k));
        if (uniqueNew.length > 0) {
            setKeywords([...keywords, ...uniqueNew]);
        }
    };

    return (
        <div>
            <div
                className="min-h-16 p-2 input-field cursor-text"
                onClick={() => inputRef.current?.focus()}
            >
                <div className="flex flex-wrap gap-1">
                    {keywords.map((keyword, index) => (
                        <span
                            key={index}
                            className="badge badge-green group inline-flex items-center gap-1"
                        >
                            <Tag className="w-2.5 h-2.5" />
                            {keyword}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeKeyword(index);
                                }}
                                className="ml-0.5 p-0.5 rounded transition-colors hover:bg-[rgba(255,255,255,0.1)]"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </span>
                    ))}
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        onBlur={() => inputValue && addKeyword(inputValue)}
                        className="flex-1 min-w-24 p-1 bg-transparent text-sm outline-none"
                        style={{ color: 'var(--text-primary)' }}
                        placeholder={keywords.length === 0 ? placeholder : ''}
                    />
                </div>
            </div>
            <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>
        </div>
    );
}

export default function RulesPage() {
    const { t, isRTL, theme, toggleTheme } = useLanguage();
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);

    const [merchantKeywords, setMerchantKeywords] = useState([]);
    const [classification, setClassification] = useState('');
    const [mainCategory, setMainCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [limit, setLimit] = useState('');

    const [editingRule, setEditingRule] = useState(null);
    const [editKeywords, setEditKeywords] = useState([]);

    const [recategorizing, setRecategorizing] = useState(false);
    const [recategorizeResult, setRecategorizeResult] = useState(null);

    useEffect(() => {
        loadRules();
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

    const parseKeywords = (keywordsStr) => {
        if (!keywordsStr) return [];
        return keywordsStr.split(',').map(k => k.trim()).filter(k => k);
    };

    const handleAddRule = async (e) => {
        e.preventDefault();
        if (merchantKeywords.length === 0 || !mainCategory) return;

        try {
            await addRule({
                merchant_keywords: merchantKeywords.join(','),
                classification: classification || 'Expense',
                main_category: mainCategory,
                sub_category: subCategory,
                category_limit: limit ? parseFloat(limit) : null
            });
            setMerchantKeywords([]);
            setClassification('');
            setMainCategory('');
            setSubCategory('');
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
        if (!editingRule || editKeywords.length === 0) return;
        try {
            await updateRule(editingRule.id, {
                merchant_keywords: editKeywords.join(','),
                classification: editingRule.classification || 'Expense',
                main_category: editingRule.main_category,
                sub_category: editingRule.sub_category || '',
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
                                    <input
                                        value={mainCategory}
                                        onChange={e => setMainCategory(e.target.value)}
                                        className="input-field w-full p-2 text-sm"
                                        placeholder={t('categoryPlaceholder')}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('subCategoryLabel')}</label>
                                    <input
                                        value={subCategory}
                                        onChange={e => setSubCategory(e.target.value)}
                                        className="input-field w-full p-2 text-sm"
                                        placeholder={t('subCategoryPlaceholder')}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('classificationLabel')}</label>
                                    <input
                                        value={classification}
                                        onChange={e => setClassification(e.target.value)}
                                        className="input-field w-full p-2 text-sm"
                                        placeholder={t('classificationPlaceholder')}
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
                                                    <span className="badge badge-green">
                                                        {rule.main_category}
                                                        {rule.sub_category && ` / ${rule.sub_category}`}
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
                                    <input
                                        value={editingRule.main_category}
                                        onChange={e => setEditingRule({...editingRule, main_category: e.target.value})}
                                        className="input-field w-full p-2 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('subCategoryLabel')}</label>
                                    <input
                                        value={editingRule.sub_category || ''}
                                        onChange={e => setEditingRule({...editingRule, sub_category: e.target.value})}
                                        className="input-field w-full p-2 text-sm"
                                        placeholder={t('subCategoryPlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('classificationLabel')}</label>
                                    <input
                                        value={editingRule.classification || ''}
                                        onChange={e => setEditingRule({...editingRule, classification: e.target.value})}
                                        className="input-field w-full p-2 text-sm"
                                        placeholder={t('classificationPlaceholder')}
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
