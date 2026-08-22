'use client';
import { useState, useEffect } from 'react';
import { getCurrentCycle, fetchAnalytics } from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MODES = [
    { key: 'bucket', en: 'Categories', ar: 'الفئات' },
    { key: 'day', en: 'Days', ar: 'الأيام' },
    { key: 'merchant', en: 'Merchants', ar: 'التجّار' },
];

export default function DrillDown({ refreshTrigger, selectedCycleId }) {
    const { language } = useLanguage();
    const isRTL = language === 'ar';
    const [rows, setRows] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState('bucket');
    const [path, setPath] = useState([]); // [{id, name}] — empty = whole budget

    // switching cycles invalidates the drill path
    useEffect(() => { setPath(prev => prev.length ? [] : prev); }, [selectedCycleId]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                let cycleId = selectedCycleId;
                if (!cycleId) {
                    const cycle = await getCurrentCycle();
                    if (cycle.status === 'no_active_cycle') { setRows(null); return; }
                    cycleId = cycle.id;
                }
                const scope = path.length ? path[path.length - 1].id : undefined;
                const data = await fetchAnalytics(cycleId, mode, scope);
                setRows(Array.isArray(data) ? data : null);
            } catch (err) {
                console.error(err);
                setRows(null);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [refreshTrigger, selectedCycleId, mode, path]);

    if (loading && rows === null) {
        return (
            <div className="panel p-4 animate-pulse">
                <div className="h-28 rounded" style={{ background: 'var(--base-subtle)' }}></div>
            </div>
        );
    }

    if (!rows) return null;

    if (rows.length === 0) {
        return (
            <div className="panel px-5 py-6 text-center">
                <p className="text-[10px] font-data uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'لا إنفاق هنا' : 'No spending here'}
                </p>
            </div>
        );
    }

    const total = rows.reduce((s, r) => s + r.total, 0);
    const maxSpent = Math.max(...rows.map(r => r.total), 1);
    const BackIcon = isRTL ? ChevronRight : ChevronLeft;
    const FwdIcon = isRTL ? ChevronLeft : ChevronRight;

    const formatCurrency = (amount) =>
        new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-SA', { maximumFractionDigits: 0 }).format(amount || 0);

    const drillIn = (r) => {
        if (mode === 'bucket' && r.bucket_id) {
            setPath([...path, { id: r.bucket_id, name: r.bucket }]);
        }
    };

    return (
        <div className="panel overflow-hidden">
            {/* Header: title + total */}
            <div className="px-5 pt-4 pb-2 flex items-baseline justify-between">
                <h3 className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'أين تذهب أموالك' : 'Where the money goes'}
                </h3>
                <span className="text-[9px] font-data" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'الإجمالي' : 'Total'}: SAR {formatCurrency(total)}
                </span>
            </div>

            {/* Mode switch */}
            <div className="px-5 pb-2 flex items-center gap-2">
                {MODES.map(m => (
                    <button
                        key={m.key}
                        onClick={() => setMode(m.key)}
                        className="px-3 py-1 rounded-full text-[10px] font-medium transition-all border"
                        style={{
                            background: mode === m.key ? 'var(--accent)' : 'var(--surface-inset)',
                            color: mode === m.key ? '#fff' : 'var(--text-primary)',
                            borderColor: mode === m.key ? 'var(--accent)' : 'var(--border)',
                        }}
                    >
                        {isRTL ? m.ar : m.en}
                    </button>
                ))}
            </div>

            {/* Breadcrumb */}
            {path.length > 0 && (
                <div className="px-5 pb-2 flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <button
                        onClick={() => setPath([])}
                        className="font-medium"
                        style={{ color: 'var(--accent)' }}
                    >
                        {isRTL ? 'الكل' : 'All'}
                    </button>
                    {path.map((p, i) => (
                        <span key={p.id} className="flex items-center gap-1">
                            <FwdIcon className="w-3 h-3" />
                            {i === path.length - 1 ? (
                                <span style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                            ) : (
                                <button onClick={() => setPath(path.slice(0, i + 1))} style={{ color: 'var(--accent)' }}>
                                    {p.name}
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            )}

            {/* Ranked bars */}
            <div className="px-5 pb-4 space-y-2.5">
                {rows.map((r, i) => {
                    const clickable = mode === 'bucket' && r.bucket_id;
                    return (
                        <button
                            key={r.bucket}
                            onClick={() => drillIn(r)}
                            disabled={!clickable}
                            className="w-full text-left group"
                            style={{ cursor: clickable ? 'pointer' : 'default' }}
                        >
                            <div className="flex items-baseline justify-between mb-0.5">
                                <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                    {clickable && (
                                        <FwdIcon className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                                    )}
                                    {r.bucket}
                                </span>
                                <span className="text-xs font-data" style={{ color: 'var(--amount)' }}>
                                    SAR {formatCurrency(r.total)}
                                    <span className="text-[9px] ml-1.5" style={{ color: 'var(--text-muted)' }}>
                                        {r.count} {isRTL ? 'عملية' : 'tx'} · {total > 0 ? Math.round((r.total / total) * 100) : 0}%
                                    </span>
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--base-subtle)' }}>
                                <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                        width: `${Math.max((r.total / maxSpent) * 100, 2)}%`,
                                        background: i === 0 && r.total > 0 ? 'var(--warning)' : 'var(--accent)',
                                        opacity: i === 0 && r.total > 0 ? 1 : 0.55,
                                    }}
                                />
                            </div>
                        </button>
                    );
                })}
            </div>

            {mode === 'bucket' && (
                <div className="px-5 py-2 text-[9px]" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    {path.length > 0
                        ? (isRTL ? 'اضغط اسمًا في المسار للعودة' : 'Click a breadcrumb to go back up')
                        : (isRTL ? 'اضغط على فئة للتعمق أكثر' : 'Click a category to drill deeper')}
                </div>
            )}
        </div>
    );
}
