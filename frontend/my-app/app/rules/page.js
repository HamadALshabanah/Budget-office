'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save, ArrowRight, Pencil, X, Database } from 'lucide-react';
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
        <div className="min-h-screen bg-[#0a0a0f] font-mono text-gray-200 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-[#1a1a25] rounded border border-[#2a2a3a] hover:border-cyan-500/30 transition-all hover:shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                        {isRTL ? <ArrowRight className="w-5 h-5 text-cyan-400" /> : <ArrowLeft className="w-5 h-5 text-cyan-400" />}
                    </Link>
                    <div>
                      <h1 className="text-2xl font-bold text-cyan-400 text-glow-cyan">{t('rulesTitle')}</h1>
                      <p className="text-xs text-gray-500 uppercase tracking-widest">Category Configuration Module</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Add Rule Form */}
                    <div className="md:col-span-1">
                        <div className="bg-gradient-to-br from-[#1a1a25] to-[#12121a] p-5 rounded-lg border border-[#2a2a3a] sticky top-8">
                            <h2 className="font-bold text-cyan-400 mb-4 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-emerald-400" />
                                {t('addRule')}
                            </h2>
                            <form onSubmit={handleAddRule} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('merchantLabel')}</label>
                                    <input 
                                        value={merchant}
                                        onChange={e => setMerchant(e.target.value)}
                                        className="w-full p-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded text-sm text-cyan-300 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] outline-none font-mono"
                                        placeholder={t('merchantPlaceholder')}
                                        required
                                    />
                                    <p className="text-[10px] text-gray-600 mt-1 font-mono">{t('merchantHint')}</p>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('categoryLabel')}</label>
                                    <input 
                                        value={mainCategory}
                                        onChange={e => setMainCategory(e.target.value)}
                                        className="w-full p-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded text-sm text-cyan-300 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] outline-none font-mono"
                                        placeholder={t('categoryPlaceholder')}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('subCategoryLabel')}</label>
                                    <input 
                                        value={subCategory}
                                        onChange={e => setSubCategory(e.target.value)}
                                        className="w-full p-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded text-sm text-cyan-300 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] outline-none font-mono"
                                        placeholder={t('subCategoryPlaceholder')}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('classificationLabel')}</label>
                                    <input 
                                        value={classification}
                                        onChange={e => setClassification(e.target.value)}
                                        className="w-full p-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded text-sm text-cyan-300 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] outline-none font-mono"
                                        placeholder={t('classificationPlaceholder')}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('limitLabel')}</label>
                                    <input 
                                        type="number"
                                        value={limit}
                                        onChange={e => setLimit(e.target.value)}
                                        className="w-full p-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded text-sm text-amber-400 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] outline-none font-mono"
                                        placeholder={t('limitPlaceholder')}
                                    />
                                </div>

                                <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-black py-2 rounded text-sm font-bold hover:from-emerald-500 hover:to-emerald-400 transition-all flex items-center justify-center gap-2 border border-emerald-400/50 shadow-[0_0_15px_rgba(0,255,136,0.3)]">
                                    <Save className="w-4 h-4" />
                                    {t('saveRule')}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Rules List */}
                    <div className="md:col-span-2">
                        <div className="bg-gradient-to-br from-[#1a1a25] to-[#12121a] rounded-lg border border-[#2a2a3a] overflow-hidden">
                            <div className="p-4 border-b border-[#2a2a3a] bg-[#12121a]">
                                <div className="grid grid-cols-12 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <div className="col-span-4">{t('colPattern')}</div>
                                    <div className="col-span-4">{t('colCategory')}</div>
                                    <div className="col-span-3">{t('colLimit')}</div>
                                    <div className="col-span-1"></div>
                                </div>
                            </div>
                            <div className="divide-y divide-[#2a2a3a]">
                                {loading ? (
                                    <div className="p-8 text-center text-gray-500 text-sm font-mono">
                                      <Database className="w-8 h-8 mx-auto mb-2 text-cyan-600 animate-pulse" />
                                      {t('loading')}
                                    </div>
                                ) : rules.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 text-sm font-mono">{t('noRules')}</div>
                                ) : (
                                    rules.map(rule => (
                                        <div key={rule.id} className="grid grid-cols-12 p-4 items-center hover:bg-[#1f1f2a] transition-colors group">
                                            <div className="col-span-4 font-bold text-gray-200 truncate pr-2 font-mono">
                                                {rule.merchant_keyword}
                                            </div>
                                            <div className="col-span-4 text-sm">
                                                <span className="bg-fuchsia-500/10 text-fuchsia-400 px-2 py-0.5 rounded text-xs font-mono border border-fuchsia-500/30">
                                                    {rule.main_category}
                                                    {rule.sub_category && ` / ${rule.sub_category}`}
                                                </span>
                                            </div>
                                            <div className="col-span-3 text-sm text-amber-400 font-mono">
                                                {rule.category_limit ? `SAR ${rule.category_limit.toLocaleString()}` : <span className="text-gray-600">-</span>}
                                            </div>
                                            <div className="col-span-1 text-end flex gap-1 justify-end">
                                                <button 
                                                    onClick={() => handleEdit(rule)}
                                                    className="p-1.5 text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/10 rounded border border-transparent hover:border-cyan-500/30 transition-all"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(rule.id)}
                                                    className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/30 transition-all"
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
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-gradient-to-br from-[#1a1a25] to-[#12121a] rounded-lg p-6 w-full max-w-md border border-cyan-500/30 shadow-[0_0_30px_rgba(0,255,255,0.2)]">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold text-cyan-400 flex items-center gap-2">
                                    <Pencil className="w-5 h-5" />
                                    {t('editRule')}
                                </h2>
                                <button onClick={() => setEditingRule(null)} className="p-1 hover:bg-[#2a2a3a] rounded border border-transparent hover:border-red-500/30">
                                    <X className="w-5 h-5 text-gray-500 hover:text-red-400" />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateRule} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('merchantLabel')}</label>
                                    <input 
                                        value={editingRule.merchant_keyword}
                                        onChange={e => setEditingRule({...editingRule, merchant_keyword: e.target.value})}
                                        className="w-full p-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded text-sm text-cyan-300 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] outline-none font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('categoryLabel')}</label>
                                    <input 
                                        value={editingRule.main_category}
                                        onChange={e => setEditingRule({...editingRule, main_category: e.target.value})}
                                        className="w-full p-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded text-sm text-cyan-300 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] outline-none font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('subCategoryLabel')}</label>
                                    <input 
                                        value={editingRule.sub_category || ''}
                                        onChange={e => setEditingRule({...editingRule, sub_category: e.target.value})}
                                        className="w-full p-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded text-sm text-cyan-300 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] outline-none font-mono"
                                        placeholder={t('subCategoryPlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('classificationLabel')}</label>
                                    <input 
                                        value={editingRule.classification || ''}
                                        onChange={e => setEditingRule({...editingRule, classification: e.target.value})}
                                        className="w-full p-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded text-sm text-cyan-300 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] outline-none font-mono"
                                        placeholder={t('classificationPlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('limitLabel')}</label>
                                    <input 
                                        type="number"
                                        value={editingRule.category_limit}
                                        onChange={e => setEditingRule({...editingRule, category_limit: e.target.value})}
                                        className="w-full p-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded text-sm text-amber-400 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] outline-none font-mono"
                                        placeholder={t('limitPlaceholder')}
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setEditingRule(null)} className="flex-1 py-2 border border-[#2a2a3a] rounded text-sm font-bold text-gray-400 hover:bg-[#2a2a3a] hover:border-red-500/30 hover:text-red-400 transition-all">
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
        </div>
    );
}
