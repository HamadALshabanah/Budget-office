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
        active: "ACTIVE",
        closed: "CLOSED",
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

    const getBudgetColor = (pct) => {
        if (pct <= 80) return 'var(--accent)';
        if (pct <= 100) return 'var(--warning)';
        return 'var(--danger)';
    };

    return (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
            <div
                className={`panel w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-up ${isRTL ? 'rtl' : 'ltr'}`}
                style={{ background: 'var(--surface-raised)' }}
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                {/* Header */}
                <div className="sticky top-0 p-4 flex justify-between items-center" style={{ background: 'var(--surface-raised)', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                            <PieChart className="w-3.5 h-3.5" />
                        </div>
                        <div>
                            <h3 className="font-heading text-sm" style={{ color: 'var(--text-primary)' }}>{t.title}</h3>
                            {analysis && (
                                <p className="text-[9px] font-data" style={{ color: 'var(--text-muted)' }}>
                                    {formatDate(analysis.start_date)} → {analysis.end_date ? formatDate(analysis.end_date) : t.active}
                                </p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="icon-btn">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin w-6 h-6 border-2 rounded-full mx-auto mb-3" style={{ borderColor: 'var(--border-strong)', borderTopColor: 'var(--accent)' }}></div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.loading}</p>
                    </div>
                ) : analysis ? (
                    <div className="p-4 space-y-3">
                        {/* Status Badge */}
                        <div className="flex justify-center">
                            <span className={`badge text-[9px] uppercase tracking-wider font-semibold ${analysis.is_active ? 'badge-green' : ''}`} style={!analysis.is_active ? { background: 'var(--base-subtle)', color: 'var(--text-muted)' } : {}}>
                                {analysis.is_active ? t.active : t.closed}
                            </span>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {[
                                { icon: Wallet, label: t.totalSpent, value: formatCurrency(analysis.total_spent), color: 'var(--amount)' },
                                { icon: TrendingUp, label: t.budget, value: formatCurrency(analysis.total_budget), color: 'var(--accent)' },
                                { icon: Wallet, label: t.remaining, value: formatCurrency(analysis.remaining_budget), color: analysis.remaining_budget >= 0 ? 'var(--accent)' : 'var(--danger)' },
                                { icon: Receipt, label: t.transactions, value: analysis.transaction_count, color: 'var(--text-primary)' },
                                { icon: ShoppingBag, label: t.avgTransaction, value: formatCurrency(analysis.average_transaction), color: 'var(--amount)' },
                                { icon: PieChart, label: t.budgetUsed, value: `${analysis.budget_percentage_used}%`, color: getBudgetColor(analysis.budget_percentage_used) },
                            ].map((stat, idx) => (
                                <div key={idx} className="p-3 rounded" style={{ background: 'var(--base-subtle)', border: '1px solid var(--border)' }}>
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <stat.icon className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                                        <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                                    </div>
                                    <p className="text-lg font-semibold font-data" style={{ color: stat.color }}>
                                        {stat.value}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Budget Progress Bar */}
                        <div className="p-3 rounded" style={{ background: 'var(--base-subtle)', border: '1px solid var(--border)' }}>
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-strong)' }}>
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${Math.min(analysis.budget_percentage_used, 100)}%`,
                                        background: getBudgetColor(analysis.budget_percentage_used),
                                    }}
                                ></div>
                            </div>
                            <div className="flex justify-between mt-1.5 text-[9px] font-data" style={{ color: 'var(--text-muted)' }}>
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        {/* Category Breakdown */}
                        {analysis.category_breakdown?.length > 0 && (
                            <div className="p-3 rounded" style={{ background: 'var(--base-subtle)', border: '1px solid var(--border)' }}>
                                <h4 className="text-[9px] font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                                    <PieChart className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                                    {t.categoryBreakdown}
                                </h4>
                                <div className="space-y-2.5">
                                    {analysis.category_breakdown.map((cat, idx) => (
                                        <div key={idx}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{cat.category || 'Uncategorized'}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold font-data" style={{ color: 'var(--amount)' }}>
                                                        {formatCurrency(cat.spent)}
                                                    </span>
                                                    <span className="text-[9px] font-data" style={{ color: 'var(--text-muted)' }}>
                                                        {cat.percentage_of_total}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-strong)' }}>
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{ width: `${cat.percentage_of_total}%`, background: 'var(--accent)' }}
                                                ></div>
                                            </div>
                                            {cat.limit && (
                                                <p className="text-[9px] font-data mt-0.5" style={{ color: 'var(--text-muted)' }}>
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
                            <div className="p-3 rounded" style={{ background: 'var(--base-subtle)', border: '1px solid var(--border)' }}>
                                <h4 className="text-[9px] font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                                    <Store className="w-3 h-3" style={{ color: 'var(--amount)' }} />
                                    {t.topMerchants}
                                </h4>
                                <div className="space-y-1.5">
                                    {analysis.top_merchants.map((merchant, idx) => (
                                        <div
                                            key={idx}
                                            className="flex justify-between items-center p-2 rounded"
                                            style={{ background: 'var(--surface)' }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 flex items-center justify-center rounded text-[9px] font-semibold font-data" style={{ background: 'var(--amount-dim)', color: 'var(--amount)' }}>
                                                    {idx + 1}
                                                </span>
                                                <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{merchant.merchant}</span>
                                            </div>
                                            <span className="text-xs font-semibold font-data" style={{ color: 'var(--amount)' }}>
                                                {formatCurrency(merchant.spent)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {analysis.transaction_count === 0 && (
                            <div className="text-center py-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                                {t.noData}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                        {t.noData}
                    </div>
                )}
            </div>
        </div>
    );
}
