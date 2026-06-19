'use client';
import { useState, useEffect } from 'react';
import { getCurrentCycle, getCycleAnalysis } from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import { ArrowDownLeft, TrendingDown, Clock, Gauge } from 'lucide-react';

export default function CycleSummary({ refreshTrigger, selectedCycleId }) {
    const { language } = useLanguage();
    const isRTL = language === 'ar';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                if (selectedCycleId) {
                    const analysis = await getCycleAnalysis(selectedCycleId);
                    const start = new Date(analysis.start_date);
                    const end = analysis.end_date ? new Date(analysis.end_date) : new Date();
                    const days_elapsed = Math.floor((end - start) / (1000 * 60 * 60 * 24));
                    setData({ ...analysis, days_elapsed, days_remaining: 0 });
                } else {
                    const cycle = await getCurrentCycle();
                    if (cycle.status === 'no_active_cycle') { setData(null); return; }
                    const analysis = await getCycleAnalysis(cycle.id);
                    setData({ ...analysis, days_elapsed: cycle.days_elapsed, days_remaining: cycle.days_remaining });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [refreshTrigger, selectedCycleId]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-SA', {
            maximumFractionDigits: 0,
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="stat-card animate-pulse">
                        <div className="h-2.5 rounded w-16 mb-4" style={{ background: 'var(--base-subtle)' }} />
                        <div className="h-8 rounded w-28 mb-2" style={{ background: 'var(--base-subtle)' }} />
                        <div className="h-2 rounded w-20" style={{ background: 'var(--base-subtle)' }} />
                    </div>
                ))}
            </div>
        );
    }

    if (!data) return null;

    const dailyAvg = data.days_elapsed > 0 ? data.total_spent / data.days_elapsed : 0;
    const percentUsed = data.total_budget > 0 ? Math.min((data.total_spent / data.total_budget) * 100, 100) : 0;

    const statusColor = percentUsed > 90 ? 'var(--danger)' : percentUsed > 75 ? 'var(--warning)' : 'var(--accent)';

    return (
        <div className="space-y-3">
            {/* Budget progress bar */}
            <div className="flex items-center gap-3 px-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wider shrink-0 font-data" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'المستخدم من الميزانية' : 'Budget utilized'}
                </span>
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-strong)' }}>
                    <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${percentUsed}%`, background: statusColor }}
                    />
                </div>
                <span className="text-[10px] font-semibold font-data shrink-0" style={{ color: statusColor }}>
                    {Math.round(percentUsed)}%
                </span>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {/* Total Debited — hero card */}
                <div className="stat-card-primary">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'إجمالي المصروف' : 'Total Debited'}
                        </p>
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--danger-dim)', color: 'var(--danger)' }}>
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <p className="text-2xl font-semibold font-data leading-none" style={{ color: 'var(--amount)' }}>
                        {formatCurrency(data.total_spent)}
                    </p>
                    <p className="text-[10px] mt-2 font-data" style={{ color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>SAR</span>
                        {' '}&mdash;{' '}
                        {data.invoice_count || 0} {isRTL ? 'معاملة' : 'transactions'}
                    </p>
                </div>

                {/* Remaining */}
                <div className="stat-card">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'المتبقي' : 'Remaining'}
                        </p>
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                            <Gauge className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <p className="text-2xl font-semibold font-data leading-none" style={{ color: data.remaining_budget >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                        {formatCurrency(data.remaining_budget)}
                    </p>
                    <p className="text-[10px] mt-2 font-data" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'من' : 'of'}{' '}
                        <span className="font-data" style={{ color: 'var(--text-secondary)' }}>SAR {formatCurrency(data.total_budget)}</span>
                    </p>
                </div>

                {/* Daily Average */}
                <div className="stat-card">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'المعدل اليومي' : 'Daily Average'}
                        </p>
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--amount-dim)', color: 'var(--amount)' }}>
                            <TrendingDown className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <p className="text-2xl font-semibold font-data leading-none" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(dailyAvg)}
                    </p>
                    <p className="text-[10px] mt-2 font-data" style={{ color: 'var(--text-muted)' }}>
                        SAR {isRTL ? 'لكل يوم' : 'per day'}
                    </p>
                </div>

                {/* Days Left */}
                <div className="stat-card">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'الأيام المتبقية' : 'Days Left'}
                        </p>
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--warning-dim)', color: 'var(--warning)' }}>
                            <Clock className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <p className="text-2xl font-semibold font-data leading-none" style={{ color: statusColor }}>
                        {data.days_remaining}
                    </p>
                    <p className="text-[10px] mt-2 font-data" style={{ color: 'var(--text-muted)' }}>
                        {data.days_elapsed} {isRTL ? 'يوم منقضي' : 'days elapsed'}
                    </p>
                </div>
            </div>
        </div>
    );
}
