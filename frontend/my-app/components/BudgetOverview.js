'use client';
import { useState, useEffect } from 'react';
import { fetchCategories, fetchCategoryRemaining } from '../lib/api';
import { PieChart, Wallet, TrendingUp } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

function BudgetCard({ category, data, loading }) {
    const { t } = useLanguage();
    if (loading) {
        return (
            <div className="bg-zinc-50 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-zinc-200 rounded w-1/3 mb-4"></div>
                <div className="h-8 bg-zinc-200 rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-zinc-200 rounded w-full"></div>
            </div>
        )
    }

    if (!data) return null;

    const percent = Math.min(100, Math.max(0, (data.total_spent / data.category_limit) * 100));
    const isOverBudget = data.total_spent > data.category_limit;
    
    return (
        <div className="bg-white rounded-xl p-5 border border-zinc-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div>
                     <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wide">{category}</h3>
                     <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-zinc-900">
                            SAR {data.remaining_limit?.toLocaleString() ?? 0}
                        </span>
                        <span className="text-sm text-zinc-500">{t('left')}</span>
                     </div>
                </div>
                <div className={`p-2 rounded-lg ${isOverBudget ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    <Wallet className="w-5 h-5" />
                </div>
            </div>
            
            <div className="mt-4">
                <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                    <span>{t('spent')}: SAR {data.total_spent?.toLocaleString() ?? 0}</span>
                    <span>{t('limit')}: SAR {data.category_limit?.toLocaleString() ?? 0}</span>
                </div>
                <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : 'bg-indigo-500'}`}
                        style={{ width: `${percent}%` }}
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
             <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg mb-8">
                 <div className="flex items-center gap-4">
                     <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                         <TrendingUp className="w-6 h-6 text-white" />
                     </div>
                     <div>
                         <h3 className="font-semibold text-lg">{t('setupBudget')}</h3>
                         <p className="text-indigo-100 text-sm">{t('setupBudgetDesc')}</p>
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
