'use client';
import { useState, useEffect } from 'react';
import { getCurrentCycle, getSpendingTimeline } from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';

export default function SpendingChart({ refreshTrigger, selectedCycleId }) {
    const { language } = useLanguage();
    const isRTL = language === 'ar';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hoveredIndex, setHoveredIndex] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                let cycleId = selectedCycleId;
                if (!cycleId) {
                    const cycle = await getCurrentCycle();
                    if (cycle.status === 'no_active_cycle') { setData(null); return; }
                    cycleId = cycle.id;
                }
                const timeline = await getSpendingTimeline(cycleId);
                setData(timeline.data);
            } catch (err) {
                console.error(err);
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

    if (!data || data.length === 0) return null;

    const maxSpent = Math.max(...data.map(d => d.spent), 1);
    const avgSpent = data.reduce((sum, d) => sum + d.spent, 0) / data.length;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-SA', {
            maximumFractionDigits: 0,
        }).format(amount || 0);
    };

    const getBarColor = (spent) => {
        if (spent === 0) return 'var(--border-strong)';
        if (spent > avgSpent * 1.5) return 'var(--danger)';
        if (spent > avgSpent) return 'var(--warning)';
        return 'var(--accent)';
    };

    const formatDay = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { day: 'numeric' });
    };

    const formatFullDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="panel overflow-hidden">
            <div className="px-5 pt-4 pb-1.5 flex items-baseline justify-between">
                <h3 className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'الإنفاق اليومي' : 'Daily Spending'}
                </h3>
                {hoveredIndex !== null && data[hoveredIndex] ? (
                    <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold font-data" style={{ color: 'var(--amount)' }}>
                            SAR {formatCurrency(data[hoveredIndex].spent)}
                        </span>
                        <span className="text-[9px] font-data" style={{ color: 'var(--text-muted)' }}>
                            {formatFullDate(data[hoveredIndex].date)}
                        </span>
                    </div>
                ) : (
                    <span className="text-[9px] font-data" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'المتوسط' : 'AVG'}: SAR {formatCurrency(avgSpent)}
                    </span>
                )}
            </div>

            {/* Chart area */}
            <div className="px-5 pb-1.5 pt-1">
                <div className="relative" style={{ height: 100 }}>
                    {/* Average dashed line */}
                    <div
                        className="absolute left-0 right-0 border-t border-dashed"
                        style={{
                            bottom: `${(avgSpent / maxSpent) * 100}%`,
                            borderColor: 'var(--text-muted)',
                            opacity: 0.25,
                        }}
                    />

                    {/* Bars */}
                    <div className="flex items-end gap-0.5 h-full">
                        {data.map((day, i) => {
                            const height = day.spent > 0 ? Math.max((day.spent / maxSpent) * 100, 3) : 3;
                            const isHovered = hoveredIndex === i;

                            return (
                                <div
                                    key={day.date}
                                    className="flex-1 flex items-end justify-center cursor-pointer"
                                    style={{ height: '100%' }}
                                    onMouseEnter={() => setHoveredIndex(i)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                >
                                    <div
                                        className="w-full rounded-t-sm transition-all duration-150"
                                        style={{
                                            height: `${height}%`,
                                            background: getBarColor(day.spent),
                                            opacity: isHovered ? 1 : 0.6,
                                            minWidth: 3,
                                            maxWidth: 20,
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Date labels */}
                <div className="flex mt-1" style={{ color: 'var(--text-muted)' }}>
                    {data.map((day, i) => {
                        const showLabel = i === 0 || i === data.length - 1 || i % 5 === 0;
                        return (
                            <div key={day.date} className="flex-1 text-center">
                                {showLabel && (
                                    <span className="text-[8px] font-data">{formatDay(day.date)}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend footer */}
            <div className="px-5 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 text-[9px]" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }}></span>
                        {isRTL ? 'عادي' : 'Normal'}
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--warning)' }}></span>
                        {isRTL ? 'فوق المتوسط' : 'Above avg'}
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--danger)' }}></span>
                        {isRTL ? 'مرتفع' : 'High'}
                    </span>
                </div>
            </div>
        </div>
    );
}
