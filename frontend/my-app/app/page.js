'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import SMSInput from '../components/SMSInput';
import InvoiceList from '../components/InvoiceList';
import BudgetCycle from '../components/BudgetCycle';
import CycleSummary from '../components/CycleSummary';
import CategoriesPanel from '../components/CategoriesPanel';
import BudgetOverview from '../components/BudgetOverview';
import { Settings, Globe, Activity, Moon, Sun, Plus, X } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { getCycleHistory, isAuthenticated, logout } from '../lib/api';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const { t, language, setLanguage, theme, toggleTheme } = useLanguage();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddTx, setShowAddTx] = useState(false);
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null); // null = current cycle

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    getCycleHistory(12).then(setCycles).catch(console.error);
  }, [refreshKey]);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setShowAddTx(false);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const isRTL = language === 'ar';

  return (
    <div className="min-h-screen">

      {/* Header — notebook cover style */}
      <header className="sticky top-0 z-10 notebook-header">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 h-13 flex items-center justify-between" style={{ height: '52px' }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>Budget Office</h1>
              <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded font-data" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                {isRTL ? 'كشف حساب' : 'STATEMENT'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="btn-secondary flex items-center justify-center w-8 h-8 p-0"
            >
              {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={toggleLanguage}
              className="btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
            >
              <Globe className="w-3.5 h-3.5" />
              {language === 'en' ? 'AR' : 'EN'}
            </button>
            <Link href="/rules" className="btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 text-xs">
              <Settings className="w-3.5 h-3.5" />
              {t('manageRules')}
            </Link>
            <button
              onClick={handleLogout}
              className="btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
              style={{ color: 'var(--danger)' }}
            >
              {isRTL ? 'خروج' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 sm:px-8 py-6 space-y-8">

        {/* Section 1 — Summary + Period controls */}
        <section aria-label={isRTL ? 'ملخص الفترة' : 'Period summary'}>
          <div className="flex items-end justify-between mb-3 px-0.5">
            <div>
              <h2 className="font-heading text-base" style={{ color: 'var(--text-primary)' }}>
                {isRTL ? 'نظرة عامة' : 'Overview'}
              </h2>
              <p className="text-[10px] mt-0.5 font-data uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {isRTL ? 'ملخص الدورة المحددة' : 'Selected cycle at a glance'}
              </p>
            </div>
          </div>
          {/* Grouped: cycle info + overview stats in one panel */}
          <div className="panel p-5 space-y-5">
            {/* Row 1: progress bar + 3 stat cards */}
            <CycleSummary refreshTrigger={refreshKey} selectedCycleId={selectedCycleId} />

            {/* Row 2: cycle strip + cycle info side by side, separated by divider */}
            <div
              className="grid gap-5 items-start xl:grid-cols-[1fr_auto]"
              style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}
            >
              <div className="space-y-3 min-w-0">
                {/* Cycle filter strip */}
                {cycles.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto py-1" style={{ scrollbarWidth: 'none' }}>
                    <span className="text-[9px] uppercase tracking-wider shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {isRTL ? 'الدورة' : 'Cycle'}
                    </span>
            <button
              onClick={() => setSelectedCycleId(null)}
              className="shrink-0 px-3 py-1 rounded-full text-[10px] font-medium transition-all border"
              style={{
                background: selectedCycleId === null ? 'var(--accent)' : 'var(--surface-inset)',
                color: selectedCycleId === null ? '#fff' : 'var(--text-primary)',
                borderColor: selectedCycleId === null ? 'var(--accent)' : 'var(--border)',
              }}
            >
              {isRTL ? 'الحالية' : 'Current'}
            </button>
            {cycles.filter(c => !c.is_active).map(cycle => {
              const start = new Date(cycle.start_date);
              const end = cycle.end_date ? new Date(cycle.end_date) : null;
              const label = start.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })
                + (end ? ' → ' + end.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' }) : '');
              const isSelected = selectedCycleId === cycle.id;
              return (
                <button
                  key={cycle.id}
                  onClick={() => setSelectedCycleId(cycle.id)}
                  className="shrink-0 px-3 py-1 rounded-full text-[10px] font-medium transition-all border"
                  style={{
                    background: isSelected ? 'var(--accent)' : 'var(--surface-inset)',
                    color: isSelected ? '#fff' : 'var(--text-primary)',
                    borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  {label}
                </button>
              );
            })}
                </div>
              )}
              </div>
            <BudgetCycle onCycleChange={handleRefresh} />
            </div>
          </div>
        </section>

        {/* Section 2 — Spending insights */}
        <section aria-label={isRTL ? 'تحليلات الإنفاق' : 'Spending insights'}>
          <div className="flex items-end justify-between mb-3 px-0.5">
            <div>
              <h2 className="font-heading text-base" style={{ color: 'var(--text-primary)' }}>
                {isRTL ? 'تحليلات الإنفاق' : 'Spending Insights'}
              </h2>
              <p className="text-[10px] mt-0.5 font-data uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {isRTL ? 'أعلى الفئات وميزانياتها' : 'Top categories and budgets'}
              </p>
            </div>
          </div>
          <div className="space-y-5">
            <CategoriesPanel refreshTrigger={refreshKey} selectedCycleId={selectedCycleId} />
            <BudgetOverview refreshTrigger={refreshKey} selectedCycleId={selectedCycleId} />
          </div>
        </section>

        {/* Section 3 — Transaction ledger */}
        <section aria-label={isRTL ? 'المدفوعات' : 'Transactions'}>
          {/* Section header */}
          <div className="flex items-end justify-between mb-3 px-0.5">
            <div>
              <h2 className="font-heading text-base" style={{ color: 'var(--text-primary)' }}>
                {isRTL ? 'المدفوعات' : 'Transactions'}
              </h2>
              <p className="text-[10px] mt-0.5 font-data uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {isRTL ? 'كشف الدورة الحالية' : 'Current period statement'}
              </p>
            </div>
            <button
              onClick={() => setShowAddTx(!showAddTx)}
              className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md"
            >
              {showAddTx ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showAddTx
                ? (isRTL ? 'إلغاء' : 'Cancel')
                : (isRTL ? 'إضافة مدفوعات' : 'New Transaction')}
            </button>
          </div>

          {/* Collapsible SMS input */}
          {showAddTx && (
            <div className="mb-3 animate-fade-up">
              <SMSInput onInvoiceAdded={handleRefresh} />
            </div>
          )}

          <InvoiceList refreshTrigger={refreshKey} onUpdate={handleRefresh} selectedCycleId={selectedCycleId} />
        </section>

      </main>

      {/* Footer */}
      <footer className="mt-10 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-8 text-center">
          <p className="text-[10px] font-data tracking-widest" style={{ color: 'var(--text-muted)' }}>
            BUDGET OFFICE
          </p>
        </div>
      </footer>
    </div>
  );
}
