'use client';
import { useState, useEffect } from 'react';
import { fetchCategories, fetchCategoryAnalysis, getCycleAnalysis, getCurrentCycle } from '../lib/api';
import { TrendingUp, X, Wallet, Receipt, Calculator, BarChart3 } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

function CategoryAnalysisModal({ category, onClose, cycleData }) {
    const { t } = useLanguage();
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(!cycleData);

    useEffect(() => {
        if (cycleData) {
            // Use pre-fetched cycle data — no network call needed
            setAnalysis({
                total_spent: cycleData.spent,
                category_limit: cycleData.limit,
                remaining: cycleData.limit != null ? cycleData.limit - cycleData.spent : null,
                percentage_of_limit: cycleData.percentage_of_limit,
            });
            setLoading(false);
            return;
        }
        const loadAnalysis = async () => {
            setLoading(true);
            try {
                const data = await fetchCategoryAnalysis(category);
                setAnalysis(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadAnalysis();
    }, [category, cycleData]);

    return (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="panel w-full max-w-lg animate-fade-up overflow-hidden"
                style={{ background: 'var(--surface-raised)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="font-heading text-sm" style={{ color: 'var(--text-primary)' }}>{category}</h2>
                            <p className="text-[9px] mt-0.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Category Analysis</p>
                        </div>
                        <button onClick={onClose} className="icon-btn">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4">
                    {loading ? (
                        <div className="space-y-3">
                            <div className="animate-pulse h-16 rounded" style={{ background: 'var(--base-subtle)' }}></div>
                            <div className="animate-pulse h-16 rounded" style={{ background: 'var(--base-subtle)' }}></div>
                        </div>
                    ) : analysis ? (
                        <div className="space-y-3">
                            {/* Total Spent */}
                            <div className="p-3 rounded" style={{ background: 'var(--accent-dim)', border: '1px solid var(--border)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: 'var(--accent)', color: '#0B0F1A' }}>
                                        <Wallet className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Spent</p>
                                        <p className="text-xl font-semibold font-data" style={{ color: 'var(--accent)' }}>
                                            SAR {analysis.total_spent?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid — only shown for all-time analysis */}
                            {!cycleData && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded" style={{ background: 'var(--base-subtle)', border: '1px solid var(--border)' }}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Receipt className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                                        <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Transactions</p>
                                    </div>
                                    <p className="text-lg font-semibold font-data" style={{ color: 'var(--text-primary)' }}>
                                        {analysis.invoice_count}
                                    </p>
                                </div>

                                <div className="p-3 rounded" style={{ background: 'var(--base-subtle)', border: '1px solid var(--border)' }}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Calculator className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                                        <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Average</p>
                                    </div>
                                    <p className="text-lg font-semibold font-data" style={{ color: 'var(--amount)' }}>
                                        SAR {analysis.average_spent?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                            )}

                            {/* Summary Bar */}
                            <div className="p-3 rounded" style={{ background: 'var(--base-subtle)', border: '1px solid var(--border)' }}>
                                <div className="flex items-center gap-1.5 mb-2.5">
                                    <BarChart3 className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                                    <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Spending Summary</p>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                            {cycleData
                                                ? `${analysis.percentage_of_limit != null ? analysis.percentage_of_limit + '% of limit' : 'of budget'}`
                                                : `Total from ${analysis.invoice_count} transactions`}
                                        </span>
                                        <span className="font-semibold font-data" style={{ color: 'var(--amount)' }}>SAR {analysis.total_spent?.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-strong)' }}>
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: cycleData && analysis.percentage_of_limit != null
                                                    ? `${Math.min(100, analysis.percentage_of_limit)}%`
                                                    : '100%',
                                                background: 'var(--accent)'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-xs" style={{ color: 'var(--text-muted)' }}>No data available</div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
                    <button onClick={onClose} className="btn-secondary w-full py-2 text-xs">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function GaugeCard({ category, data, loading, onClick }) {
    const { t } = useLanguage();

    if (loading) {
        return (
            <div className="gauge p-4 animate-pulse">
                <div className="h-3 rounded w-1/3 mb-3" style={{ background: 'var(--base-subtle)' }}></div>
                <div className="h-6 rounded w-1/2 mb-2" style={{ background: 'var(--base-subtle)' }}></div>
                <div className="h-1.5 rounded w-full" style={{ background: 'var(--base-subtle)' }}></div>
            </div>
        );
    }

    if (!data) return null;

    const percent = Math.min(100, Math.max(0, (data.total_spent / data.category_limit) * 100));
    const isOverBudget = data.total_spent > data.category_limit;
    const isCaution = percent > 75 && !isOverBudget;

    const fillColor = isOverBudget
        ? 'var(--fill-danger)'
        : isCaution
            ? 'var(--fill-caution)'
            : 'var(--fill-healthy)';

    const accentColor = isOverBudget
        ? 'var(--danger)'
        : isCaution
            ? 'var(--warning)'
            : 'var(--accent)';

    return (
        <div
            onClick={onClick}
            className="gauge p-4 cursor-pointer group"
        >
            {/* Gauge fill — horizontal from left */}
            <div
                className="gauge-fill"
                style={{
                    width: `${percent}%`,
                    background: fillColor,
                }}
            />

            {/* Content sits above fill */}
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                        {category}
                    </h3>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-data font-medium" style={{ color: accentColor }}>
                            {Math.round(percent)}%
                        </span>
                        <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: accentColor }}
                        />
                    </div>
                </div>

                <div className="mb-3">
                    <span className="text-lg font-semibold font-data" style={{ color: 'var(--amount)' }}>
                        SAR {data.remaining_limit?.toLocaleString() ?? 0}
                    </span>
                    <span className="text-[10px] ml-1" style={{ color: 'var(--text-muted)' }}>{t('left')}</span>
                </div>

                {/* Mini gauge bar */}
                <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: 'var(--border-strong)' }}>
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, background: accentColor }}
                    />
                </div>

                <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <span>{t('spent')}: <span className="font-data font-medium" style={{ color: 'var(--amount)' }}>SAR {data.total_spent?.toLocaleString() ?? 0}</span></span>
                    <span>{t('limit')}: <span className="font-data font-medium" style={{ color: 'var(--text-secondary)' }}>SAR {data.category_limit?.toLocaleString() ?? 0}</span></span>
                </div>
            </div>
        </div>
    );
}

export default function BudgetOverview({ refreshTrigger, selectedCycleId }) {
    const { t } = useLanguage();
    const [categories, setCategories] = useState([]);
    const [budgetData, setBudgetData] = useState({});
    const [cycleCategoryData, setCycleCategoryData] = useState({}); // keyed by category name
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                if (selectedCycleId) {
                    // Use cycle analysis breakdown — no per-category fetch needed
                    const analysis = await getCycleAnalysis(selectedCycleId);
                    const breakdown = analysis.category_breakdown || [];
                    const cats = breakdown.map(b => b.category);
                    setCategories(cats);
                    // Map breakdown to gauge card format: { total_spent, category_limit, remaining_limit }
                    const data = {};
                    const cycleData = {};
                    breakdown.forEach(b => {
                        data[b.category] = {
                            total_spent: b.spent,
                            category_limit: b.limit,
                            remaining_limit: b.limit != null ? b.limit - b.spent : null,
                        };
                        cycleData[b.category] = b; // keep raw breakdown for modal
                    });
                    setBudgetData(data);
                    setCycleCategoryData(cycleData);
                } else {
                    // Current cycle — use getCycleAnalysis so numbers match the cycle, not all-time
                    const cycle = await getCurrentCycle();
                    if (cycle.status === 'no_active_cycle') {
                        // Fallback: show all categories with all-time limits but 0 spent
                        const cats = await fetchCategories();
                        setCategories(cats);
                        setBudgetData({});
                        setCycleCategoryData({});
                        return;
                    }
                    const analysis = await getCycleAnalysis(cycle.id);
                    const breakdown = analysis.category_breakdown || [];
                    const cats = breakdown.map(b => b.category);
                    setCategories(cats);
                    const data = {};
                    const cycleData = {};
                    breakdown.forEach(b => {
                        data[b.category] = {
                            total_spent: b.spent,
                            category_limit: b.limit,
                            remaining_limit: b.limit != null ? b.limit - b.spent : null,
                        };
                        cycleData[b.category] = b;
                    });
                    setBudgetData(data);
                    setCycleCategoryData(cycleData);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [refreshTrigger, selectedCycleId]);

    if (!loading && categories.length === 0) {
        return (
            <div className="panel p-5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: 'var(--amount-dim)', color: 'var(--amount)' }}>
                        <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('setupBudget')}</h3>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('setupBudgetDesc')}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {loading ? (
                    <>
                        <GaugeCard loading={true} />
                        <GaugeCard loading={true} />
                        <GaugeCard loading={true} />
                    </>
                ) : (
                    categories.map(cat => (
                        <GaugeCard
                            key={cat}
                            category={cat}
                            data={budgetData[cat]}
                            loading={false}
                            onClick={() => setSelectedCategory(cat)}
                        />
                    ))
                )}
            </div>

            {selectedCategory && (
                <CategoryAnalysisModal
                    category={selectedCategory}
                    onClose={() => setSelectedCategory(null)}
                    cycleData={cycleCategoryData[selectedCategory] || null}
                />
            )}
        </>
    );
}
