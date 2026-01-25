'use client';
import { useState, useEffect } from 'react';
import { getCurrentCycle, startNewCycle, getCycleHistory } from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import { Calendar, RefreshCw, History, X, ChevronDown, ChevronUp } from 'lucide-react';

const translations = {
    en: {
        title: "Budget Cycle",
        noCycle: "No active budget cycle",
        startCycle: "Start New Cycle",
        daysRemaining: "Days Left",
        daysElapsed: "Days In",
        startedOn: "Started",
        history: "History",
        spent: "spent",
        startNow: "Start Now",
        customDate: "Or choose a custom start date",
        selectDate: "Select start date",
        cancel: "Cancel",
        start: "Start with this date",
        newCycle: "New Budget Cycle",
        active: "Active",
    },
    ar: {
        title: "دورة الميزانية",
        noCycle: "لا توجد دورة ميزانية نشطة",
        startCycle: "بدء دورة جديدة",
        daysRemaining: "يوم متبقي",
        daysElapsed: "يوم منقضي",
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
    },
};

export default function BudgetCycle({ onCycleChange }) {
    const [cycle, setCycle] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [customDate, setCustomDate] = useState('');
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
        await startNewCycle(customDate);
        setShowModal(false);
        setCustomDate('');
        fetchData();
        if (onCycleChange) onCycleChange();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
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
            <div className="bg-gradient-to-br from-[#1a1a25] to-[#12121a] rounded-lg p-4 border border-[#2a2a3a] animate-pulse">
                <div className="h-12 bg-[#2a2a3a] rounded"></div>
            </div>
        );
    }

    return (
        <div className={`${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="bg-gradient-to-br from-[#1a1a25] to-[#12121a] rounded-lg p-4 border border-[#2a2a3a]">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    {/* Left: Cycle Info */}
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-cyan-500/10 rounded border border-cyan-500/30">
                            <Calendar className="w-5 h-5 text-cyan-400" />
                        </div>
                        {cycle ? (
                            <div className="flex items-center gap-6">
                                <div>
                                    <span className="text-gray-500 text-xs uppercase tracking-wider">{t.startedOn}</span>
                                    <p className="text-white font-medium">{formatDate(cycle.start_date)}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-center px-3 py-1 bg-cyan-500/10 rounded border border-cyan-500/20">
                                        <div className="text-xl font-bold text-cyan-400">{cycle.days_remaining}</div>
                                        <div className="text-[10px] text-gray-500 uppercase">{t.daysRemaining}</div>
                                    </div>
                                    <div className="text-center px-3 py-1 bg-fuchsia-500/10 rounded border border-fuchsia-500/20">
                                        <div className="text-xl font-bold text-fuchsia-400">{cycle.days_elapsed}</div>
                                        <div className="text-[10px] text-gray-500 uppercase">{t.daysElapsed}</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <span className="text-gray-400">{t.noCycle}</span>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex gap-2">
                        {history.length > 0 && (
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="p-2 bg-[#2a2a3a] hover:bg-[#3a3a4a] rounded border border-[#3a3a4a] hover:border-gray-500 transition-all"
                                title={t.history}
                            >
                                {showHistory ? (
                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                    <History className="w-4 h-4 text-gray-400" />
                                )}
                            </button>
                        )}
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-black rounded font-bold text-sm transition-all border border-cyan-400/50 shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                        >
                            <RefreshCw className="w-4 h-4" />
                            {t.startCycle}
                        </button>
                    </div>
                </div>

                {/* History Dropdown */}
                {showHistory && history.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#2a2a3a] space-y-2">
                        {history.map((h) => (
                            <div
                                key={h.id}
                                className={`flex justify-between items-center p-3 rounded-lg ${
                                    h.is_active 
                                        ? 'bg-cyan-500/10 border border-cyan-500/30' 
                                        : 'bg-[#12121a] border border-[#2a2a3a]'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    {h.is_active && (
                                        <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] uppercase rounded font-bold">
                                            {t.active}
                                        </span>
                                    )}
                                    <span className="text-white text-sm">
                                        {formatDate(h.start_date)}
                                        {h.end_date && ` → ${formatDate(h.end_date)}`}
                                    </span>
                                </div>
                                <span className="text-amber-400 font-mono text-sm">
                                    {formatCurrency(h.total_spent)} {t.spent}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Start Cycle Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-[#1a1a25] to-[#12121a] rounded-lg p-6 w-full max-w-sm border border-cyan-500/30 shadow-[0_0_30px_rgba(0,255,255,0.2)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-cyan-400">{t.newCycle}</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 hover:bg-[#2a2a3a] rounded"
                            >
                                <X className="w-5 h-5 text-gray-500 hover:text-red-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Start Now Button */}
                            <button
                                onClick={handleStartNow}
                                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black rounded-lg font-bold transition-all border border-emerald-400/50 shadow-[0_0_15px_rgba(0,255,136,0.3)]"
                            >
                                {t.startNow}
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-[#2a2a3a]"></div>
                                <span className="text-gray-500 text-xs">{t.customDate}</span>
                                <div className="flex-1 h-px bg-[#2a2a3a]"></div>
                            </div>

                            {/* Custom Date Input */}
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">{t.selectDate}</label>
                                <input
                                    type="date"
                                    value={customDate}
                                    onChange={(e) => setCustomDate(e.target.value)}
                                    max={today}
                                    className="w-full p-3 rounded-lg bg-[#0a0a0f] border border-[#2a2a3a] text-cyan-300 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] outline-none font-mono"
                                />
                            </div>

                            <button
                                onClick={handleStartCustom}
                                disabled={!customDate}
                                className="w-full py-3 bg-[#2a2a3a] hover:bg-[#3a3a4a] disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 rounded-lg font-medium transition-all border border-[#3a3a4a]"
                            >
                                {t.start}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
