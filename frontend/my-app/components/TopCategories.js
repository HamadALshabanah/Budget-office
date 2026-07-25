'use client';
import { useState, useEffect } from 'react';
import { getCurrentCycle, getTopCategories } from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MAX_ROWS = 8;

export default function TopCategories({ refreshTrigger, selectedCycleId }) {
    const { language } = useLanguage();
    const isRTL = language === 'ar';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [drillCategory, setDrillCategory] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setDrillCategory(null);
            try {
                let cycleId = selectedCycleId;
                if (!cycleId) {
                    const cycle = await getCurrentCycle();
                    if (cycle.status === 'no_active_cycle') { setData(null); return; }
                    cycleId = cycle.id;
                }
                const result = await getTopCategories(cycleId);
                if (!result || result.detail) { setData(null); return; }
                setData(result);
            } catch (err) {
                console.error(err);
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [refreshTrigger, selectedCycleId]);

    if (loading) {
        return (
            <div className="panel p-4 animate-pulse">
                <div className="h-28 rounded" style={{ background: 'var(--base-subtle)' }}></div>
            </div>
        );
    }

    if (!data || !data.categories || data.categories.length === 0) return null;

    const formatCurrency = (amount) =>
        new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-SA', { maximumFractionDigits: 0 }).format(amount || 0);

    const BackIcon = isRTL ? ChevronRight : ChevronLeft;

    // Drill-down view for one main category's sub-categories
    if (drillCategory) {
        const cat = data.categories.find(c => c.category === drillCategory);
        if (!cat) { setDrillCategory(null); return null; }
        const subs = cat.sub_categories || [];
        const maxSub = Math.max(...subs.map(s => s.spent), 1);

        return (
            <div className="panel overflow-hidden">
                <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                    <button
                        onClick={() => setDrillCategory(null)}
                        className="flex items-center gap-1 text-[10px] font-medium"
                        style={{ color: 'var(--accent)' }}
                    >
                        <BackIcon className="w-3 h-3" />
                        {isRTL ? 'رجوع' : 'Back'}
                    </button>
                    <h3 className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        {drillCategory}
                    </h3>
                </div>
                <div className="px-5 pb-4 space-y-2.5">
                    {subs.map((sub, i) => (
                        <div key={sub.name}>
                            <div className="flex items-baseline justify-between mb-0.5">
                                <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{sub.name}</span>
                                <span className="text-xs font-data" style={{ color: 'var(--amount)' }}>
                                    SAR {formatCurrency(sub.spent)}
                                    <span className="text-[9px] ml-1.5" style={{ color: 'var(--text-muted)' }}>
                                        {sub.count} {isRTL ? 'عملية' : 'tx'}
                                    </span>
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--base-subtle)' }}>
                                <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                        width: `${Math.max((sub.spent / maxSub) * 100, 2)}%`,
                                        background: i === 0 ? 'var(--warning)' : 'var(--accent)',
                                        opacity: i === 0 ? 1 : 0.55,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Ranked main categories view
    const rows = data.categories.slice(0, MAX_ROWS);
    const maxSpent = Math.max(...rows.map(c => c.spent), 1);

    return (
        <div className="panel overflow-hidden">
            <div className="px-5 pt-4 pb-2 flex items-baseline justify-between">
                <h3 className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'أين ننفق أكثر' : 'Top Spending Categories'}
                </h3>
                <span className="text-[9px] font-data" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'الإجمالي' : 'Total'}: SAR {formatCurrency(data.total_spent)}
                </span>
            </div>
            <div className="px-5 pb-4 space-y-2.5">
                {rows.map((cat, i) => (
                    <button
                        key={cat.category}
                        onClick={() => setDrillCategory(cat.category)}
                        className="w-full text-left group"
                    >
                        <div className="flex items-baseline justify-between mb-0.5">
                            <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                <span
                                    className="text-[9px] font-data w-4 text-center rounded"
                                    style={{
                                        background: i === 0 ? 'var(--warning)' : 'var(--base-subtle)',
                                        color: i === 0 ? '#fff' : 'var(--text-tertiary)',
                                    }}
                                >
                                    {i + 1}
                                </span>
                                {cat.category}
                            </span>
                            <span className="text-xs font-data" style={{ color: 'var(--amount)' }}>
                                SAR {formatCurrency(cat.spent)}
                                <span className="text-[9px] ml-1.5" style={{ color: 'var(--text-muted)' }}>
                                    {cat.percentage_of_total}%
                                </span>
                            </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--base-subtle)' }}>
                            <div
                                className="h-full rounded-full transition-all duration-300 group-hover:opacity-100"
                                style={{
                                    width: `${Math.max((cat.spent / maxSpent) * 100, 2)}%`,
                                    background: i === 0 ? 'var(--warning)' : 'var(--accent)',
                                    opacity: i === 0 ? 1 : 0.55,
                                }}
                            />
                        </div>
                    </button>
                ))}
            </div>
            <div className="px-5 py-2 text-[9px]" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                {isRTL ? 'اضغط على فئة لعرض التفاصيل' : 'Click a category for sub-category breakdown'}
            </div>
        </div>
    );
}
