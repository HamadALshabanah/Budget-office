'use client';
import { useState, useEffect } from 'react';
import { fetchCategories, fetchCategoryRemaining, fetchCategoryAnalysis } from '../lib/api';
import { PieChart, Wallet, TrendingUp, Activity, X, BarChart3, Receipt, Calculator } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

// Category Analysis Modal Component
function CategoryAnalysisModal({ category, onClose }) {
    const { t, isRTL } = useLanguage();
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAnalysis = async () => {
            setLoading(true);
            try {
                const data = await fetchCategoryAnalysis(category);
                setAnalysis(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadAnalysis();
    }, [category]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-gradient-to-br from-[#1a1a25] to-[#12121a] rounded-xl w-full max-w-lg border border-cyan-500/30 shadow-[0_0_40px_rgba(0,255,255,0.2)] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 p-5 border-b border-[#2a2a3a]">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-cyan-400 text-glow-cyan">{category}</h2>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Category Analysis</p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-[#2a2a3a] rounded-lg border border-transparent hover:border-red-500/30 transition-all"
                        >
                            <X className="w-5 h-5 text-gray-500 hover:text-red-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5">
                    {loading ? (
                        <div className="space-y-4">
                            <div className="animate-pulse h-20 bg-[#2a2a3a] rounded-lg"></div>
                            <div className="animate-pulse h-20 bg-[#2a2a3a] rounded-lg"></div>
                            <div className="animate-pulse h-20 bg-[#2a2a3a] rounded-lg"></div>
                        </div>
                    ) : analysis ? (
                        <div className="space-y-4">
                            {/* Total Spent Card */}
                            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-lg p-4 border border-emerald-500/30">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                                        <Wallet className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">Total Spent</p>
                                        <p className="text-2xl font-bold text-emerald-400" style={{ textShadow: '0 0 15px rgba(0,255,136,0.5)' }}>
                                            SAR {analysis.total_spent?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Invoice Count */}
                                <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 rounded-lg p-4 border border-cyan-500/30">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Receipt className="w-4 h-4 text-cyan-400" />
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">Transactions</p>
                                    </div>
                                    <p className="text-xl font-bold text-cyan-400" style={{ textShadow: '0 0 10px rgba(0,255,255,0.5)' }}>
                                        {analysis.invoice_count}
                                    </p>
                                </div>

                                {/* Average Spent */}
                                <div className="bg-gradient-to-br from-fuchsia-500/10 to-fuchsia-500/5 rounded-lg p-4 border border-fuchsia-500/30">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calculator className="w-4 h-4 text-fuchsia-400" />
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">Average</p>
                                    </div>
                                    <p className="text-xl font-bold text-fuchsia-400" style={{ textShadow: '0 0 10px rgba(255,0,255,0.5)' }}>
                                        SAR {analysis.average_spent?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            {/* Visual Bar */}
                            <div className="bg-[#12121a] rounded-lg p-4 border border-[#2a2a3a]">
                                <div className="flex items-center gap-2 mb-3">
                                    <BarChart3 className="w-4 h-4 text-amber-400" />
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Spending Summary</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Total from {analysis.invoice_count} transactions</span>
                                        <span className="text-amber-400 font-mono">SAR {analysis.total_spent?.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full bg-[#2a2a3a] rounded-full h-3 overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-cyan-500 via-emerald-500 to-fuchsia-500 rounded-full"
                                            style={{ 
                                                width: '100%',
                                                boxShadow: '0 0 15px rgba(0,255,255,0.4)'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-8">No data available</div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#2a2a3a] bg-[#12121a]">
                    <button 
                        onClick={onClose}
                        className="w-full py-2.5 bg-gradient-to-r from-[#2a2a3a] to-[#1a1a25] text-gray-300 rounded-lg font-medium hover:from-cyan-600/20 hover:to-fuchsia-600/20 hover:text-cyan-400 transition-all border border-[#3a3a4a] hover:border-cyan-500/30"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function BudgetCard({ category, data, loading, onClick }) {
    const { t } = useLanguage();
    if (loading) {
        return (
            <div className="bg-[#1a1a25] rounded-lg p-4 animate-pulse border border-[#2a2a3a]">
                <div className="h-4 bg-[#2a2a3a] rounded w-1/3 mb-4"></div>
                <div className="h-8 bg-[#2a2a3a] rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-[#2a2a3a] rounded w-full"></div>
            </div>
        )
    }

    if (!data) return null;

    const percent = Math.min(100, Math.max(0, (data.total_spent / data.category_limit) * 100));
    const isOverBudget = data.total_spent > data.category_limit;
    
    return (
        <div 
            onClick={onClick}
            className="bg-gradient-to-br from-[#1a1a25] to-[#12121a] rounded-lg p-5 border border-[#2a2a3a] hover:border-cyan-500/30 transition-all duration-300 group cursor-pointer hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,255,255,0.15)]"
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                     <h3 className="text-gray-500 text-xs font-bold uppercase tracking-[0.15em] group-hover:text-cyan-400 transition-colors">{category}</h3>
                     <div className="mt-1 flex items-baseline gap-1">
                        <span className={`text-2xl font-bold ${isOverBudget ? 'text-red-400' : 'text-emerald-400'}`} style={{ textShadow: isOverBudget ? '0 0 10px rgba(255,0,100,0.5)' : '0 0 10px rgba(0,255,136,0.5)' }}>
                            SAR {data.remaining_limit?.toLocaleString() ?? 0}
                        </span>
                        <span className="text-sm text-gray-500">{t('left')}</span>
                     </div>
                </div>
                <div className={`p-2 rounded border ${isOverBudget ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'} group-hover:scale-110 transition-transform`}>
                    <Activity className="w-5 h-5" />
                </div>
            </div>
            
            <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-mono">
                    <span>{t('spent')}: <span className="text-amber-400">SAR {data.total_spent?.toLocaleString() ?? 0}</span></span>
                    <span>{t('limit')}: <span className="text-cyan-400">SAR {data.category_limit?.toLocaleString() ?? 0}</span></span>
                </div>
                <div className="w-full bg-[#12121a] rounded-full h-2.5 overflow-hidden border border-[#2a2a3a]">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-gradient-to-r from-red-600 to-fuchsia-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-400'}`}
                        style={{ 
                          width: `${percent}%`,
                          boxShadow: isOverBudget ? '0 0 15px rgba(255,0,100,0.5)' : '0 0 15px rgba(0,255,136,0.5)'
                        }}
                    />
                </div>
                <p className="text-[10px] text-gray-600 mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">Click for detailed analysis</p>
            </div>
        </div>
    )
}

export default function BudgetOverview({ refreshTrigger }) {
    const { t } = useLanguage();
    const [categories, setCategories] = useState([]);
    const [budgetData, setBudgetData] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const cats = await fetchCategories();
                setCategories(cats);
                
                const data = {};
                await Promise.all(cats.map(async (cat) => {
                    const info = await fetchCategoryRemaining(cat);
                    data[cat] = info;
                }));
                setBudgetData(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [refreshTrigger]);

    if (!loading && categories.length === 0) {
        return (
             <div className="bg-gradient-to-br from-[#1a1a25] to-[#12121a] rounded-lg p-6 border border-fuchsia-500/30 shadow-[0_0_20px_rgba(255,0,255,0.15)]">
                 <div className="flex items-center gap-4">
                     <div className="bg-fuchsia-500/10 p-3 rounded border border-fuchsia-500/30">
                         <TrendingUp className="w-6 h-6 text-fuchsia-400" />
                     </div>
                     <div>
                         <h3 className="font-bold text-fuchsia-400">{t('setupBudget')}</h3>
                         <p className="text-gray-400 text-sm">{t('setupBudgetDesc')}</p>
                     </div>
                 </div>
             </div>
        )
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {loading ? (
                    <>
                        <BudgetCard loading={true} />
                        <BudgetCard loading={true} />
                        <BudgetCard loading={true} />
                    </>
                ) : (
                    categories.map(cat => (
                        <BudgetCard 
                            key={cat} 
                            category={cat} 
                            data={budgetData[cat]} 
                            loading={false}
                            onClick={() => setSelectedCategory(cat)}
                        />
                    ))
                )}
            </div>
            
            {/* Category Analysis Modal */}
            {selectedCategory && (
                <CategoryAnalysisModal 
                    category={selectedCategory} 
                    onClose={() => setSelectedCategory(null)} 
                />
            )}
        </>
    );
}
