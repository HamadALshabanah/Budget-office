'use client';
import { useState, useEffect } from 'react';
import { fetchCategories, fetchCategoryRemaining } from '../lib/api';
import { PieChart, Wallet, TrendingUp, Activity } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

function BudgetCard({ category, data, loading }) {
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
        <div className="bg-gradient-to-br from-[#1a1a25] to-[#12121a] rounded-lg p-5 border border-[#2a2a3a] hover:border-cyan-500/30 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-2">
                <div>
                     <h3 className="text-gray-500 text-xs font-bold uppercase tracking-[0.15em]">{category}</h3>
                     <div className="mt-1 flex items-baseline gap-1">
                        <span className={`text-2xl font-bold ${isOverBudget ? 'text-red-400' : 'text-emerald-400'}`} style={{ textShadow: isOverBudget ? '0 0 10px rgba(255,0,100,0.5)' : '0 0 10px rgba(0,255,136,0.5)' }}>
                            SAR {data.remaining_limit?.toLocaleString() ?? 0}
                        </span>
                        <span className="text-sm text-gray-500">{t('left')}</span>
                     </div>
                </div>
                <div className={`p-2 rounded border ${isOverBudget ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'}`}>
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
            </div>
        </div>
    )
}

export default function BudgetOverview({ refreshTrigger }) {
    const { t } = useLanguage();
    const [categories, setCategories] = useState([]);
    const [budgetData, setBudgetData] = useState({});
    const [loading, setLoading] = useState(true);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {loading ? (
                <>
                    <BudgetCard loading={true} />
                    <BudgetCard loading={true} />
                    <BudgetCard loading={true} />
                </>
            ) : (
                categories.map(cat => (
                    <BudgetCard key={cat} category={cat} data={budgetData[cat]} loading={false} />
                ))
            )}
        </div>
    );
}
