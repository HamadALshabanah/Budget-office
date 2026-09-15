'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import SMSInput from '../components/SMSInput';
import InvoiceList from '../components/InvoiceList';
import HeroAnswer from '../components/HeroAnswer';
import CategoriesSection from '../components/CategoriesSection';
import DrillDown from '../components/DrillDown';
import { Settings, Globe, Activity, Moon, Sun, Plus, X, Key, FolderTree, History, Calendar } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { getCurrentCycle, getCycleHistory, startNewCycle, endCurrentCycle, deleteCycle, isAuthenticated, logout } from '../lib/api';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const { t, language, setLanguage, theme, toggleTheme } = useLanguage();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddTx, setShowAddTx] = useState(false);
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [cycleFilterOpen, setCycleFilterOpen] = useState(false);
  const [currentCycleMeta, setCurrentCycleMeta] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  // cycle admin
  const [showNewCycle, setShowNewCycle] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    getCycleHistory(12).then(d=> setCycles(Array.isArray(d)?d:[])).catch(()=>{});
    getCurrentCycle().then(c=> setCurrentCycleMeta(c?.id?c:null)).catch(()=>{});
  }, [refreshKey]);

  function handleLogout() { logout(); router.replace('/login'); }
  const handleRefresh = () => { setRefreshKey(prev=>prev+1); setShowAddTx(false); setCycleFilterOpen(false); setShowNewCycle(false); setCurrentCycleMeta(null); getCurrentCycle().then(c=> setCurrentCycleMeta(c?.id?c:null)).catch(()=>{}); getCycleHistory(12).then(d=> setCycles(Array.isArray(d)?d:[])).catch(()=>{}); };
  const toggleLanguage = () => setLanguage(language==='en'?'ar':'en');
  const isRTL = language==='ar';

  const cycleLabel = (c) => {
    if (!c) return isRTL?'—':'—';
    const s = new Date(c.start_date);
    const e = c.end_date ? new Date(c.end_date) : null;
    const fmt = (d)=> d.toLocaleDateString(isRTL?'ar-SA':'en-US',{month:'short', day:'numeric', year:'numeric'});
    return e ? `${fmt(s)} → ${fmt(e)}` : fmt(s);
  };
  const selectedLabel = selectedCycleId
    ? (cycles.find(c=>c.id===selectedCycleId) ? cycleLabel(cycles.find(c=>c.id===selectedCycleId)) : (isRTL?'دورة':'Cycle')+` #${selectedCycleId}`)
    : (currentCycleMeta ? cycleLabel(currentCycleMeta) : (isRTL?'الحالية':'Current'));

  return (
    <div className="min-h-screen">

      {/* Header — notebook cover style */}
      <header className="sticky top-0 z-10 notebook-header">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-13 flex items-center justify-between" style={{ height: '52px' }}>
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
            <Link href="/categories" className="btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 text-xs">
              <FolderTree className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t('manageCategories')}</span>
            </Link>
            <Link href="/rules" className="btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 text-xs">
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t('manageRules')}</span>
            </Link>
            <Link href="/settings" className="btn-secondary flex items-center justify-center w-8 h-8 p-0" title={t('settings')}>
              <Key className="w-3.5 h-3.5" />
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

      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-6 space-y-6">

        {/* One-Line Answer — status at a glance */}
        <HeroAnswer refreshTrigger={refreshKey} selectedCycleId={selectedCycleId} />

        {/* Categories + Drill-down — the point of the app, always visible */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-7 min-w-0">
            <CategoriesSection refreshTrigger={refreshKey} selectedCycleId={selectedCycleId} onFilterCategory={c=> setFilterCategory(c)} />
          </div>
          <div className="lg:col-span-5 min-w-0">
            <DrillDown refreshTrigger={refreshKey} selectedCycleId={selectedCycleId} />
          </div>
        </div>

        {/* Ledger — the statement */}
        <section aria-label={isRTL ? 'كشف الحساب' : 'Statement'}>
          <div className="flex items-end justify-between mb-3 px-0.5">
            <div>
              <h2 className="font-heading text-base" style={{color:'var(--text-primary)'}}>{isRTL?'كشف الحساب':'Statement'}</h2>
              <p className="text-[10px] mt-0.5 font-data uppercase tracking-wider" style={{color:'var(--text-muted)'}}>{selectedLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Cycle = filter, not a widget */}
              <div className="relative">
                <button onClick={()=> setCycleFilterOpen(!cycleFilterOpen)} className="btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5"/>{selectedLabel}
                </button>
                {cycleFilterOpen && (
                  <div className="absolute right-0 mt-2 w-72 panel p-2 z-20 max-h-80 overflow-auto" style={{background:'var(--surface-raised)'}}>
                    <button onClick={()=>{setSelectedCycleId(null); setCycleFilterOpen(false);}} className={`w-full text-left px-3 py-2 rounded text-xs ${selectedCycleId===null?'font-semibold':''}`} style={{background:selectedCycleId===null?'var(--accent-dim)':''}}>{isRTL?'الحالية':'Current'} {currentCycleMeta?`· ${cycleLabel(currentCycleMeta)}`:''}</button>
                    {cycles.filter(c=>!c.is_active).map(c=> (
                      <button key={c.id} onClick={()=>{setSelectedCycleId(c.id); setCycleFilterOpen(false);}} className="w-full text-left px-3 py-2 rounded text-xs flex justify-between" style={{background:selectedCycleId===c.id?'var(--accent-dim)':''}}>
                        <span>{cycleLabel(c)}</span><span className="font-data" style={{color:'var(--text-muted)'}}>SAR {c.total_spent}</span>
                      </button>
                    ))}
                    <div className="mt-2 pt-2 flex gap-2" style={{borderTop:'1px solid var(--border)'}}>
                      <button onClick={()=> setShowNewCycle(true)} className="btn-primary flex-1 py-1.5 text-xs flex items-center justify-center gap-1"><Plus className="w-3 h-3"/>{isRTL?'دورة جديدة':'New cycle'}</button>
                      {currentCycleMeta && <button onClick={async()=>{ if(confirm(isRTL?'إنهاء الدورة؟':'End current cycle?')){await endCurrentCycle(); handleRefresh();}}} className="btn-secondary px-3 py-1.5 text-xs" style={{color:'var(--danger)'}}>{isRTL?'إنهاء':'End'}</button>}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={()=> setShowAddTx(!showAddTx)} className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md">
                {showAddTx ? <X className="w-3.5 h-3.5"/> : <Plus className="w-3.5 h-3.5"/>}
                {showAddTx ? (isRTL?'إلغاء':'Cancel') : (isRTL?'إضافة':'New')}
              </button>
            </div>
          </div>
          {showAddTx && <div className="mb-3 animate-fade-up"><SMSInput onInvoiceAdded={handleRefresh} /></div>}
          <InvoiceList refreshTrigger={refreshKey} onUpdate={handleRefresh} selectedCycleId={selectedCycleId} forcedCategory={filterCategory} onClearForced={()=> setFilterCategory('')} />
        </section>

        {/* Layers that appear when asked — history lives in the filter above, timeline is the sparkline inside HeroAnswer */}

      </main>

      {/* New cycle layer */}
      {showNewCycle && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4" onClick={()=> setShowNewCycle(false)}>
          <div className="panel p-5 w-full max-w-sm animate-fade-up" style={{background:'var(--surface-raised)'}} onClick={e=> e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading text-sm" style={{color:'var(--text-primary)'}}>{isRTL?'دورة جديدة':'New cycle'}</h3>
              <button onClick={()=> setShowNewCycle(false)} className="icon-btn"><X className="w-4 h-4"/></button>
            </div>
            <div className="space-y-3">
              <button onClick={async()=>{ await startNewCycle(); handleRefresh();}} className="btn-primary w-full py-2.5 text-sm">{isRTL?'ابدأ الآن':'Start now'}</button>
              <div className="flex items-center gap-3"><div className="flex-1 h-px" style={{background:'var(--border)'}}/><span className="text-[10px] uppercase tracking-wider" style={{color:'var(--text-muted)'}}>{isRTL?'أو تاريخ مخصص':'or custom date'}</span><div className="flex-1 h-px" style={{background:'var(--border)'}}/></div>
              <div className="flex gap-2">
                <input type="date" value={customDate} onChange={e=> setCustomDate(e.target.value)} className="input-field flex-1 p-2.5 text-sm font-data"/>
                <input type="date" value={customEndDate} onChange={e=> setCustomEndDate(e.target.value)} disabled={!customDate} className="input-field flex-1 p-2.5 text-sm font-data disabled:opacity-30"/>
              </div>
              <button disabled={!customDate} onClick={async()=>{ await startNewCycle(customDate, customEndDate||null); setCustomDate(''); setCustomEndDate(''); handleRefresh();}} className="btn-secondary w-full py-2.5 text-sm disabled:opacity-30">{isRTL?'ابدأ بهذا التاريخ':'Start with this date'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-10 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 text-center">
          <p className="text-[10px] font-data tracking-widest" style={{ color: 'var(--text-muted)' }}>
            BUDGET OFFICE
          </p>
        </div>
      </footer>
    </div>
  );
}
