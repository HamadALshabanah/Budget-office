'use client';
import { useState, useEffect } from 'react';
import { getCurrentCycle, getCycleAnalysis } from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';

const PACE_META = {
    ahead:    { color: 'var(--danger)',  en: 'Ahead of pace',   ar: 'متجاوز للوتيرة' },
    on_track: { color: 'var(--warning)', en: 'On pace',         ar: 'ضمن الوتيرة' },
    behind:   { color: 'var(--accent)',  en: 'Under pace',      ar: 'أقل من الوتيرة' },
};

export default function CategoriesPanel({ refreshTrigger, selectedCycleId }) {
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
                    if (!cycle || !cycle.id) { setData(null); return; } // none active or endpoint error
                    cycleId = cycle.id;
                }
                const analysis = await getCycleAnalysis(cycleId);
                if (!analysis || analysis.detail) { setData(null); return; }
                setData(analysis);
            } catch (err) {
                console.error(err);
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [refreshTrigger, selectedCycleId]);

    const formatCurrency = (amount) =>
        new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(amount || 0);

    if (loading) {
        return (
            <div className="panel p-4 animate-pulse space-y-3">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-8 rounded" style={{ background: 'var(--base-subtle)' }} />
                ))}
            </div>
        );
    }

    if (!data || !data.category_breakdown || data.category_breakdown.length === 0) {
        return (
            <div className="panel p-5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: 'var(--amount-dim)', color: 'var(--amount)' }}>
                        <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {isRTL ? 'أعدّ ميزانيتك' : 'Set up your budget'}
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'أضف قواعد تصنيف مع حدود لتتبع إنفاقك' : 'Add category rules with limits to track your spending'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const timePct = data.time_elapsed_pct ?? 0;
    const maxSpent = Math.max(...data.category_breakdown.map(c => c.spent), 1);
    const BackIcon = isRTL ? ChevronRight : ChevronLeft;

    // ── Drill-down: sub-category view ──────────────────────────────────────
    if (drillCategory) {
        const cat = data.category_breakdown.find(c => c.category === drillCategory);
        if (!cat) { setDrillCategory(null); return null; }
        // Sub data comes from top-categories endpoint shape if present; fallback: no subs
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
                    {subs.length === 0 && (
                        <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'لا توجد فئات فرعية' : 'No sub-category data'}
                        </p>
                    )}
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
                                        background: 'var(--accent)',
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

    // ── Merged ranked list: share of spend + budget consumed + pace ───────
    return (
        <div className="panel overflow-hidden">
            {/* Header with overall pace */}
            <div className="px-5 pt-4 pb-2 flex items-baseline justify-between">
                <h3 className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'البنود' : 'Categories'}
                </h3>
                {data.overall_pace && (
                    <span
                        className="text-[9px] font-data px-1.5 py-0.5 rounded"
                        style={{
                            background: `${PACE_META[data.overall_pace].color}22`,
                            color: PACE_META[data.overall_pace].color,
                        }}
                    >
                        {isRTL ? PACE_META[data.overall_pace].ar : PACE_META[data.overall_pace].en}
                        {' · '}{Math.round(timePct)}% {isRTL ? 'من الوقت' : 'of cycle'}
                    </span>
                )}
            </div>

            {/* Column headers — one visual token = one meaning */}
            <div className="px-5 pb-1 flex items-baseline text-[8px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                <span className="flex-1">{isRTL ? 'الفئة' : 'Category'}</span>
                <span className="w-16 text-right">{isRTL ? 'من الإنفاق' : 'of spend'}</span>
                <span className="w-20 text-right">{isRTL ? 'من الميزانية' : 'of budget'}</span>
            </div>

            <div className="px-5 pb-4 space-y-2.5">
                {data.category_breakdown.map((cat) => {
                    const pace = cat.pace ? PACE_META[cat.pace] : null;
                    const spentWidth = Math.max((cat.spent / maxSpent) * 100, cat.spent > 0 ? 2 : 0);
                    const limitWidth = cat.limit ? Math.min(cat.percentage_of_limit ?? 0, 100) : null;

                    return (
                        <button
                            key={cat.category}
                            onClick={() => cat.sub_categories?.length ? setDrillCategory(cat.category) : null}
                            className="w-full text-left group"
                        >
                            <div className="flex items-baseline mb-0.5">
                                <span className="flex-1 text-xs flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                    {cat.category}
                                    {pace && (
                                        <span
                                            className="w-1.5 h-1.5 rounded-full shrink-0"
                                            title={isRTL ? pace.ar : pace.en}
                                            style={{ background: pace.color }}
                                        />
                                    )}
                                </span>
                                <span className="w-16 text-right text-[10px] font-data" style={{ color: 'var(--text-muted)' }}>
                                    {cat.percentage_of_total}%
                                </span>
                                <span className="w-20 text-right text-[10px] font-data" style={{ color: cat.limit ? 'var(--amount)' : 'var(--text-muted)' }}>
                                    {cat.limit ? `${cat.percentage_of_limit}%` : '—'}
                                </span>
                            </div>

                            {/* Dual-meaning bars: accent = share of spend, track marker = budget consumed */}
                            <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--base-subtle)' }}>
                                <div
                                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 group-hover:opacity-100"
                                    style={{
                                        width: `${spentWidth}%`,
                                        background: pace ? pace.color : 'var(--accent)',
                                        opacity: 0.55,
                                    }}
                                />
                                {limitWidth != null && (
                                    <div
                                        className="absolute inset-y-0"
                                        style={{
                                            left: `calc(${Math.min(limitWidth, 100)}% - 2px)`,
                                            width: 2,
                                            background: 'var(--text-primary)',
                                        }}
                                    />
                                )}
                            </div>

                            <div className="flex justify-between mt-0.5 text-[9px] font-data" style={{ color: 'var(--text-muted)' }}>
                                <span>SAR {formatCurrency(cat.spent)}</span>
                                {cat.limit != null && (
                                    <span>{isRTL ? 'الحد' : 'limit'} SAR {formatCurrency(cat.limit)}</span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="px-5 py-2 flex items-center justify-between text-[9px]" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <span>{isRTL ? 'الشريط = حصة الإنفاق · العلامة = استهلاك الميزانية' : 'Bar = share of spend · tick = budget consumed'}</span>
                <span className="font-data">SAR {formatCurrency(data.total_spent)}</span>
            </div>
        </div>
    );
}
