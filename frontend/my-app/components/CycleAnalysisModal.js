'use client';
import { useState, useEffect } from 'react';
import { getCycleAnalysis } from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import { X, TrendingUp, ShoppingBag, PieChart, Wallet, Receipt, Store } from 'lucide-react';

const translations = {
    en: {
        title: "Cycle Analysis",
        totalSpent: "Total Spent",
        budget: "Total Budget",
        remaining: "Remaining",
        transactions: "Transactions",
        avgTransaction: "Avg Transaction",
        budgetUsed: "Budget Used",
        categoryBreakdown: "Category Breakdown",
        topMerchants: "Top Merchants",
        ofLimit: "of limit",
        ofTotal: "of total",
        noData: "No data available",
        loading: "Loading analysis...",
        active: "Active",
        closed: "Closed",
    },
    ar: {
        title: "تحليل الدورة",
        totalSpent: "إجمالي المصروفات",
        budget: "إجمالي الميزانية",
        remaining: "المتبقي",
        transactions: "المعاملات",
        avgTransaction: "متوسط المعاملة",
        budgetUsed: "الميزانية المستخدمة",
        categoryBreakdown: "توزيع الفئات",
        topMerchants: "أكثر التجار",
        ofLimit: "من الحد",
        ofTotal: "من الإجمالي",
        noData: "لا توجد بيانات",
        loading: "جاري تحميل التحليل...",
        active: "نشطة",
        closed: "مغلقة",
    },
};

export default function CycleAnalysisModal({ cycleId, onClose }) {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const { language } = useLanguage();
    const t = translations[language];
    const isRTL = language === 'ar';

    useEffect(() => {
        if (cycleId) {
            setLoading(true);
            getCycleAnalysis(cycleId)
                .then(data => setAnalysis(data))
                .finally(() => setLoading(false));
        }
    }, [cycleId]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-SA', {
            style: 'currency',
            currency: 'SAR',
            maximumFractionDigits: 0,
        }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    if (!cycleId) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div 
                className={`bg-gradient-to-br from-[#1a1a25] to-[#12121a] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-cyan-500/30 shadow-[0_0_30px_rgba(0,255,255,0.2)] ${isRTL ? 'rtl' : 'ltr'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-[#1a1a25] to-[#12121a] p-4 border-b border-[#2a2a3a] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/10 rounded border border-cyan-500/30">
                            <PieChart className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-cyan-400">{t.title}</h3>
                            {analysis && (
                                <p className="text-xs text-gray-500">
                                    {formatDate(analysis.start_date)} → {analysis.end_date ? formatDate(analysis.end_date) : t.active}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[#2a2a3a] rounded transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500 hover:text-red-400" />
                    </button>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-400">{t.loading}</p>
                    </div>
                ) : analysis ? (
                    <div className="p-4 space-y-4">
                        {/* Status Badge */}
                        <div className="flex justify-center">
                            <span className={`px-4 py-1 rounded-full text-sm font-bold ${
                                analysis.is_active 
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                                {analysis.is_active ? t.active : t.closed}
                            </span>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="bg-[#12121a] rounded-lg p-4 border border-[#2a2a3a]">
                                <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider mb-2">
                                    <Wallet className="w-4 h-4" />
                                    {t.totalSpent}
                                </div>
                                <p className="text-2xl font-bold text-amber-400 font-mono">
                                    {formatCurrency(analysis.total_spent)}
                                </p>
                            </div>

                            <div className="bg-[#12121a] rounded-lg p-4 border border-[#2a2a3a]">
                                <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider mb-2">
                                    <TrendingUp className="w-4 h-4" />
                                    {t.budget}
                                </div>
                                <p className="text-2xl font-bold text-cyan-400 font-mono">
                                    {formatCurrency(analysis.total_budget)}
                                </p>
                            </div>

                            <div className="bg-[#12121a] rounded-lg p-4 border border-[#2a2a3a]">
                                <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider mb-2">
                                    <Wallet className="w-4 h-4" />
                                    {t.remaining}
                                </div>
                                <p className={`text-2xl font-bold font-mono ${
                                    analysis.remaining_budget >= 0 ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                    {formatCurrency(analysis.remaining_budget)}
                                </p>
                            </div>

                            <div className="bg-[#12121a] rounded-lg p-4 border border-[#2a2a3a]">
                                <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider mb-2">
                                    <Receipt className="w-4 h-4" />
                                    {t.transactions}
                                </div>
                                <p className="text-2xl font-bold text-white font-mono">
                                    {analysis.transaction_count}
                                </p>
                            </div>

                            <div className="bg-[#12121a] rounded-lg p-4 border border-[#2a2a3a]">
                                <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider mb-2">
                                    <ShoppingBag className="w-4 h-4" />
                                    {t.avgTransaction}
                                </div>
                                <p className="text-2xl font-bold text-fuchsia-400 font-mono">
                                    {formatCurrency(analysis.average_transaction)}
                                </p>
                            </div>

                            <div className="bg-[#12121a] rounded-lg p-4 border border-[#2a2a3a]">
                                <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider mb-2">
                                    <PieChart className="w-4 h-4" />
                                    {t.budgetUsed}
                                </div>
                                <p className={`text-2xl font-bold font-mono ${
                                    analysis.budget_percentage_used <= 80 ? 'text-emerald-400' :
                                    analysis.budget_percentage_used <= 100 ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                    {analysis.budget_percentage_used}%
                                </p>
                            </div>
                        </div>

                        {/* Budget Progress Bar */}
                        <div className="bg-[#12121a] rounded-lg p-4 border border-[#2a2a3a]">
                            <div className="h-4 bg-[#0a0a0f] rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${
                                        analysis.budget_percentage_used <= 80 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' :
                                        analysis.budget_percentage_used <= 100 ? 'bg-gradient-to-r from-amber-600 to-amber-400' :
                                        'bg-gradient-to-r from-red-600 to-red-400'
                                    }`}
                                    style={{ width: `${Math.min(analysis.budget_percentage_used, 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-gray-500">
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        {/* Category Breakdown */}
                        {analysis.category_breakdown?.length > 0 && (
                            <div className="bg-[#12121a] rounded-lg p-4 border border-[#2a2a3a]">
                                <h4 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                                    <PieChart className="w-4 h-4 text-cyan-400" />
                                    {t.categoryBreakdown}
                                </h4>
                                <div className="space-y-3">
                                    {analysis.category_breakdown.map((cat, idx) => (
                                        <div key={idx} className="group">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-gray-300 text-sm">{cat.category || 'Uncategorized'}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-amber-400 font-mono text-sm">
                                                        {formatCurrency(cat.spent)}
                                                    </span>
                                                    <span className="text-gray-500 text-xs">
                                                        {cat.percentage_of_total}% {t.ofTotal}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-[#0a0a0f] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all"
                                                    style={{ width: `${cat.percentage_of_total}%` }}
                                                ></div>
                                            </div>
                                            {cat.limit && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {cat.percentage_of_limit}% {t.ofLimit} ({formatCurrency(cat.limit)})
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Top Merchants */}
                        {analysis.top_merchants?.length > 0 && (
                            <div className="bg-[#12121a] rounded-lg p-4 border border-[#2a2a3a]">
                                <h4 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                                    <Store className="w-4 h-4 text-fuchsia-400" />
                                    {t.topMerchants}
                                </h4>
                                <div className="space-y-2">
                                    {analysis.top_merchants.map((merchant, idx) => (
                                        <div 
                                            key={idx} 
                                            className="flex justify-between items-center p-3 bg-[#0a0a0f] rounded-lg border border-[#1a1a2a]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 flex items-center justify-center bg-fuchsia-500/20 text-fuchsia-400 rounded text-xs font-bold">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-gray-300 text-sm">{merchant.merchant}</span>
                                            </div>
                                            <span className="text-amber-400 font-mono text-sm font-bold">
                                                {formatCurrency(merchant.spent)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {analysis.transaction_count === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                {t.noData}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        {t.noData}
                    </div>
                )}
            </div>
        </div>
    );
}
