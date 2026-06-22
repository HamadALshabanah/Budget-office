'use client';
import { useState, useEffect } from 'react';
import { getCurrentCycle, startNewCycle, getCycleHistory, endCurrentCycle, deleteCycle } from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import { Calendar, RefreshCw, History, X, ChevronDown, ChevronUp, BarChart3, Plus, Trash2 } from 'lucide-react';
import CycleAnalysisModal from './CycleAnalysisModal';

const translations = {
    en: {
        title: "Budget Cycle",
        noCycle: "No active budget cycle",
        noCycleDesc: "Start a new cycle to track spending",
        startCycle: "Start New Cycle",
        daysRemaining: "days left",
        daysElapsed: "elapsed",
        startedOn: "Started",
        history: "History",
        spent: "spent",
        startNow: "Start Now",
        customDate: "Or choose a custom start date",
        selectDate: "Select start date",
        cancel: "Cancel",
        start: "Start with this date",
        newCycle: "New Budget Cycle",
        active: "ACTIVE",
        viewAnalysis: "View Analysis",
        cycleProgress: "Cycle Progress",
        of30Days: "of 30 days",
        endCycle: "End Cycle",
    },
    ar: {
        title: "دورة الميزانية",
        noCycle: "لا توجد دورة ميزانية نشطة",
        noCycleDesc: "ابدأ دورة جديدة لتتبع المصروفات",
        startCycle: "بدء دورة جديدة",
        daysRemaining: "يوم متبقي",
        daysElapsed: "منقضي",
        startedOn: "بدأت",
        history: "السجل",
        spent: "المصروف",
        startNow: "ابدأ الآن",
        customDate: "أو اختر تاريخ بدء مخصص",
        selectDate: "اختر تاريخ البدء",
        cancel: "إلغاء",
        start: "ابدأ بهذا التاريخ",
        newCycle: "دورة ميزانية جديدة",
        active: "نشطة",
        viewAnalysis: "عرض التحليل",
        cycleProgress: "تقدم الدورة",
        of30Days: "من 30 يوم",
        endCycle: "إنهاء الدورة",
    },
};

function CycleProgressRing({ daysElapsed, daysRemaining, size = 80, strokeWidth = 3 }) {
    const totalDays = 30;
    const elapsed = typeof daysElapsed === 'number' && !isNaN(daysElapsed) ? daysElapsed : 0;
    const remaining = typeof daysRemaining === 'number' && !isNaN(daysRemaining) ? daysRemaining : 30;
    const progress = Math.max(0, Math.min((elapsed / totalDays) * 100, 100));
    const radius = !isNaN(size - strokeWidth) && size - strokeWidth > 0 ? (size - strokeWidth) / 2 : 38.5;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = !isNaN(progress) ? circumference - (progress / 100) * circumference : circumference;

    const getColor = () => {
        if (progress < 50) return 'var(--accent)';
        if (progress < 75) return 'var(--amount)';
        if (progress < 90) return 'var(--warning)';
        return 'var(--danger)';
    };

    const color = getColor();

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--border-strong)"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.3s ease' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-semibold font-data" style={{ color }}>
                    {remaining}
                </span>
                <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>days</span>
            </div>
        </div>
    );
}

export default function BudgetCycle({ onCycleChange }) {
    const [cycle, setCycle] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [customDate, setCustomDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [selectedCycleId, setSelectedCycleId] = useState(null);
    const { language } = useLanguage();
    const t = translations[language];
    const isRTL = language === 'ar';

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getCurrentCycle();
            setCycle(data.status === 'no_active_cycle' ? null : data);
            const historyData = await getCycleHistory();
            setHistory(historyData);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleStartNow = async () => {
        await startNewCycle();
        setShowModal(false);
        fetchData();
        if (onCycleChange) onCycleChange();
    };

    const handleStartCustom = async () => {
        if (!customDate) return;
        await startNewCycle(customDate, customEndDate || null);
        setShowModal(false);
        setCustomDate('');
        setCustomEndDate('');
        fetchData();
        if (onCycleChange) onCycleChange();
    };

    const handleEndCycle = async () => {
        if (confirm(isRTL ? 'هل أنت متأكد من إنهاء الدورة الحالية؟' : 'Are you sure you want to end the current cycle?')) {
            await endCurrentCycle();
            fetchData();
            if (onCycleChange) onCycleChange();
        }
    };

    const handleDeleteCycle = async (cycleId) => {
        if (confirm(isRTL ? 'هل أنت متأكد من حذف هذه الدورة؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this cycle? This action cannot be undone.')) {
            await deleteCycle(cycleId);
            fetchData();
            if (onCycleChange) onCycleChange();
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-SA', {
            style: 'currency',
            currency: 'SAR',
            maximumFractionDigits: 0,
        }).format(amount || 0);
    };

    const today = new Date().toISOString().split('T')[0];

    if (loading) {
        return (
            <div className="panel p-4 animate-pulse">
                <div className="h-10 rounded" style={{ background: 'var(--base-subtle)' }}></div>
            </div>
        );
    }

    return (
        <div className={`${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="panel p-4">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    {cycle ? (
                        <div className="flex items-center gap-5">
                            <CycleProgressRing
                                daysElapsed={cycle.days_elapsed}
                                daysRemaining={cycle.days_remaining}
                                size={72}
                                strokeWidth={3}
                            />

                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                                    <div>
                                        <span className="text-[9px] font-medium uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>{t.startedOn}</span>
                                        <p className="text-xs font-data" style={{ color: 'var(--text-primary)' }}>{formatDate(cycle.start_date)}</p>
                                    </div>
                                </div>

                                <div className="w-32">
                                    <div className="flex justify-between text-[9px] mb-1 font-data" style={{ color: 'var(--text-muted)' }}>
                                        <span>{typeof cycle.days_elapsed === 'number' && !isNaN(cycle.days_elapsed) ? cycle.days_elapsed : 0} {t.daysElapsed}</span>
                                        <span>{t.of30Days}</span>
                                    </div>
                                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-strong)' }}>
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${Math.max(0, Math.min(((typeof cycle.days_elapsed === 'number' && !isNaN(cycle.days_elapsed) ? cycle.days_elapsed : 0) / 30) * 100, 100))}%`,
                                                background: (typeof cycle.days_elapsed === 'number' && !isNaN(cycle.days_elapsed) ? cycle.days_elapsed : 0) < 15
                                                    ? 'var(--accent)'
                                                    : (typeof cycle.days_elapsed === 'number' && !isNaN(cycle.days_elapsed) ? cycle.days_elapsed : 0) < 23
                                                        ? 'var(--warning)'
                                                        : 'var(--danger)',
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded border border-dashed flex items-center justify-center" style={{ borderColor: 'var(--border-strong)' }}>
                                <Plus className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                            </div>
                            <div>
                                <span className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t.noCycle}</span>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.noCycleDesc}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        {history.length > 0 && (
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="btn-secondary flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs"
                            >
                                {showHistory ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                    <History className="w-3.5 h-3.5" />
                                )}
                                <span className="hidden sm:inline">{t.history}</span>
                            </button>
                        )}
                        {cycle && (
                            <button
                                onClick={handleEndCycle}
                                className="btn-secondary flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs"
                                style={{ color: 'var(--danger)', borderColor: 'var(--danger-dim)' }}
                            >
                                <X className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{t.endCycle}</span>
                            </button>
                        )}
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn-primary flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            {t.startCycle}
                        </button>
                    </div>
                </div>

                {/* History */}
                {showHistory && history.length > 0 && (
                    <div className="mt-4 pt-4 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
                        {history.map((h) => {
                            const startDate = new Date(h.start_date);
                            const endDate = h.end_date ? new Date(h.end_date) : new Date();
                            const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

                            return (
                                <div
                                    key={h.id}
                                    className="group flex items-center gap-3 p-2.5 rounded transition-colors"
                                    style={{
                                        background: h.is_active ? 'var(--accent-dim)' : 'transparent',
                                        border: h.is_active ? '1px solid var(--accent-mid)' : '1px solid transparent',
                                    }}
                                >
                                    <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{
                                        background: h.is_active ? 'var(--accent)' : 'var(--border-strong)',
                                        color: h.is_active ? '#0B0F1A' : 'var(--text-muted)',
                                    }}>
                                        <span className="text-[9px] font-semibold font-data">
                                            {h.is_active ? `${30 - Math.min(duration, 30)}` : '✓'}
                                        </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {h.is_active && (
                                                <span className="badge badge-green text-[9px] uppercase font-semibold">
                                                    {t.active}
                                                </span>
                                            )}
                                            <span className="text-xs font-data" style={{ color: 'var(--text-primary)' }}>
                                                {formatDate(h.start_date)}
                                            </span>
                                            {h.end_date && (
                                                <>
                                                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>→</span>
                                                    <span className="text-xs font-data" style={{ color: 'var(--text-secondary)' }}>{formatDate(h.end_date)}</span>
                                                </>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-data" style={{ color: 'var(--text-muted)' }}>{duration}d</span>
                                    </div>

                                    <div className="text-right">
                                        <span className="text-xs font-semibold font-data" style={{ color: 'var(--amount)' }}>
                                            {formatCurrency(h.total_spent)}
                                        </span>
                                        <span className="text-[9px] block uppercase" style={{ color: 'var(--text-muted)' }}>{t.spent}</span>
                                    </div>

                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setSelectedCycleId(h.id)}
                                            className="btn-secondary p-1.5 rounded"
                                            title={t.viewAnalysis}
                                        >
                                            <BarChart3 className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCycle(h.id)}
                                            className="btn-secondary p-1.5 rounded icon-btn-danger"
                                            title={isRTL ? 'حذف الدورة' : 'Delete cycle'}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Start Cycle Modal */}
            {showModal && (
                <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
                    <div className="panel p-5 w-full max-w-sm animate-fade-up" style={{ background: 'var(--surface-raised)' }}>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="font-heading text-sm" style={{ color: 'var(--text-primary)' }}>{t.newCycle}</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="icon-btn"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleStartNow}
                                className="btn-primary w-full py-2.5 text-sm"
                            >
                                {t.startNow}
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px" style={{ background: 'var(--border)' }}></div>
                                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t.customDate}</span>
                                <div className="flex-1 h-px" style={{ background: 'var(--border)' }}></div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.selectDate}</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={customDate}
                                        onChange={(e) => setCustomDate(e.target.value)}
                                        max={today}
                                        className="input-field w-full p-2.5 text-sm font-data"
                                    />
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        min={customDate || undefined}
                                        disabled={!customDate}
                                        className="input-field w-full p-2.5 text-sm font-data disabled:opacity-30"
                                    />
                                </div>
                            </div>


                            <button
                                onClick={handleStartCustom}
                                disabled={!customDate}
                                className="btn-secondary w-full py-2.5 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {t.start}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cycle Analysis Modal */}
            {selectedCycleId && (
                <CycleAnalysisModal
                    cycleId={selectedCycleId}
                    onClose={() => setSelectedCycleId(null)}
                />
            )}
        </div>
    );
}
