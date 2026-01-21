'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save, ArrowRight, Pencil, X } from 'lucide-react';
import { fetchRules, addRule, deleteRule, updateRule } from '../../lib/api';
import { useLanguage } from '../../lib/LanguageContext';

export default function RulesPage() {
    const { t, isRTL } = useLanguage();
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // New Rule State
    const [merchant, setMerchant] = useState('');
    const [classification, setClassification] = useState('');
    const [mainCategory, setMainCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [limit, setLimit] = useState('');
    
    // Edit Rule State
    const [editingRule, setEditingRule] = useState(null);

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        setLoading(true);
        try {
            const data = await fetchRules();
            setRules(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRule = async (e) => {
        e.preventDefault();
        if (!merchant || !mainCategory) return;
        
        try {
            await addRule({
                merchant_keyword: merchant,
                classification: classification || 'Expense',
                main_category: mainCategory,
                sub_category: subCategory,
                category_limit: limit ? parseFloat(limit) : null
            });
            // Reset form
            setMerchant('');
            setClassification('');
            setMainCategory('');
            setSubCategory('');
            setLimit('');
            // Reload
            loadRules();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if(!confirm(t('confirmDelete'))) return;
        try {
            await deleteRule(id);
            loadRules();
        } catch (err) {
            console.error(err);
        }
    }

    const handleEdit = (rule) => {
        setEditingRule({
            ...rule,
            category_limit: rule.category_limit || ''
        });
    };

    const handleUpdateRule = async (e) => {
        e.preventDefault();
        if (!editingRule) return;
        try {
            await updateRule(editingRule.id, {
                merchant_keyword: editingRule.merchant_keyword,
                classification: editingRule.classification || 'Expense',
                main_category: editingRule.main_category,
                sub_category: editingRule.sub_category || '',
                category_limit: editingRule.category_limit ? parseFloat(editingRule.category_limit) : null
            });
            setEditingRule(null);
            loadRules();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50/50 font-sans text-zinc-900 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                        {isRTL ? <ArrowRight className="w-5 h-5 text-zinc-600" /> : <ArrowLeft className="w-5 h-5 text-zinc-600" />}
                    </Link>
                    <h1 className="text-2xl font-bold">{t('rulesTitle')}</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Add Rule Form */}
                    <div className="md:col-span-1">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 sticky top-8">
                            <h2 className="font-semibold mb-4 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-indigo-600" />
                                {t('addRule')}
                            </h2>
                            <form onSubmit={handleAddRule} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">{t('merchantLabel')}</label>
                                    <input 
                                        value={merchant}
                                        onChange={e => setMerchant(e.target.value)}
                                        className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                        placeholder={t('merchantPlaceholder')}
                                        required
                                    />
                                    <p className="text-[10px] text-zinc-400 mt-1">{t('merchantHint')}</p>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">{t('categoryLabel')}</label>
                                    <input 
                                        value={mainCategory}
                                        onChange={e => setMainCategory(e.target.value)}
                                        className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                        placeholder={t('categoryPlaceholder')}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">{t('limitLabel')}</label>
                                    <input 
                                        type="number"
                                        value={limit}
                                        onChange={e => setLimit(e.target.value)}
                                        className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                        placeholder={t('limitPlaceholder')}
                                    />
                                </div>

                                <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" />
                                    {t('saveRule')}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Rules List */}
                    <div className="md:col-span-2">
                        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
                            <div className="p-4 border-b border-zinc-50 bg-zinc-50/50">
                                <div className="grid grid-cols-12 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                    <div className="col-span-4">{t('colPattern')}</div>
                                    <div className="col-span-4">{t('colCategory')}</div>
                                    <div className="col-span-3">{t('colLimit')}</div>
                                    <div className="col-span-1"></div>
                                </div>
                            </div>
                            <div className="divide-y divide-zinc-50">
                                {loading ? (
                                    <div className="p-8 text-center text-zinc-400 text-sm">{t('loading')}</div>
                                ) : rules.length === 0 ? (
                                    <div className="p-8 text-center text-zinc-400 text-sm">{t('noRules')}</div>
                                ) : (
                                    rules.map(rule => (
                                        <div key={rule.id} className="grid grid-cols-12 p-4 items-center hover:bg-zinc-50 transition-colors group">
                                            <div className="col-span-4 font-medium text-zinc-900 truncate pr-2">
                                                {rule.merchant_keyword}
                                            </div>
                                            <div className="col-span-4 text-sm text-zinc-600">
                                                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs">
                                                    {rule.main_category}
                                                </span>
                                            </div>
                                            <div className="col-span-3 text-sm text-zinc-500">
                                                {rule.category_limit ? `SAR ${rule.category_limit.toLocaleString()}` : '-'}
                                            </div>
                                            <div className="col-span-1 text-end flex gap-1 justify-end">
                                                <button 
                                                    onClick={() => handleEdit(rule)}
                                                    className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(rule.id)}
                                                    className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Rule Modal */}
                {editingRule && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-semibold text-lg flex items-center gap-2">
                                    <Pencil className="w-5 h-5 text-indigo-600" />
                                    {t('editRule')}
                                </h2>
                                <button onClick={() => setEditingRule(null)} className="p-1 hover:bg-zinc-100 rounded">
                                    <X className="w-5 h-5 text-zinc-500" />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateRule} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">{t('merchantLabel')}</label>
                                    <input 
                                        value={editingRule.merchant_keyword}
                                        onChange={e => setEditingRule({...editingRule, merchant_keyword: e.target.value})}
                                        className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">{t('categoryLabel')}</label>
                                    <input 
                                        value={editingRule.main_category}
                                        onChange={e => setEditingRule({...editingRule, main_category: e.target.value})}
                                        className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">{t('limitLabel')}</label>
                                    <input 
                                        type="number"
                                        value={editingRule.category_limit}
                                        onChange={e => setEditingRule({...editingRule, category_limit: e.target.value})}
                                        className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                        placeholder={t('limitPlaceholder')}
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setEditingRule(null)} className="flex-1 py-2 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">
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
        </div>
    );
}
