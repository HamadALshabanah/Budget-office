'use client';
import { useState, useEffect } from 'react';
import { getCurrentCycle, getCycleAnalysis, getSpendingTimeline } from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import { ArrowDownLeft, Clock, Gauge } from 'lucide-react';

const PACE = {
  ahead:    { color: 'var(--danger)',  en: 'Ahead of pace', ar: 'متجاوز للوتيرة' },
  on_track: { color: 'var(--warning)', en: 'On pace',       ar: 'ضمن الوتيرة' },
  behind:   { color: 'var(--accent)',  en: 'Under pace',    ar: 'أقل من الوتيرة' },
};

export default function HeroAnswer({ refreshTrigger, selectedCycleId }) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [data, setData] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        let analysis;
        let cycleId = selectedCycleId;
        if (!cycleId) {
          const cycle = await getCurrentCycle();
          if (!cycle || cycle.status === 'no_active_cycle' || !cycle.id) {
            if (!cancelled) { setData(null); setTimeline(null); }
            return;
          }
          cycleId = cycle.id;
          analysis = await getCycleAnalysis(cycleId);
          // enrich with days from cycle
          analysis = { ...analysis, days_elapsed: cycle.days_elapsed, days_remaining: cycle.days_remaining };
        } else {
          analysis = await getCycleAnalysis(cycleId);
          const start = new Date(analysis.start_date);
          const end = analysis.end_date ? new Date(analysis.end_date) : new Date();
          const days_elapsed = Math.max(0, Math.floor((end - start) / (1000*60*60*24)));
          analysis = { ...analysis, days_elapsed, days_remaining: analysis.is_active ? Math.max(0, (analysis.cycle_days||30) - days_elapsed) : 0 };
        }
        if (cancelled) return;
        setData(analysis);
        // timeline sparkline — non-blocking
        getSpendingTimeline(cycleId).then(tl => { if (!cancelled) setTimeline(tl?.data || null); }).catch(()=>{});
      } catch (e) { console.error(e); if (!cancelled) setData(null); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [refreshTrigger, selectedCycleId]);

  if (loading) {
    return (
      <div className="panel p-4 animate-pulse">
        <div className="h-3 w-40 rounded mb-3" style={{background:'var(--base-subtle)'}}/>
        <div className="h-2 w-full rounded" style={{background:'var(--base-subtle)'}}/>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="panel p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{color:'var(--text-secondary)'}}>{isRTL ? 'لا توجد دورة نشطة' : 'No active cycle'}</p>
          <p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>{isRTL ? 'ابدأ دورة جديدة لتتبع مصروفك' : 'Start a cycle to see your answer here'}</p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded" style={{background:'var(--base-subtle)', color:'var(--text-muted)'}}>—</span>
      </div>
    );
  }

  const pct = data.total_budget > 0 ? Math.min((data.total_spent / data.total_budget)*100, 100) : 0;
  const timePct = data.time_elapsed_pct ?? 0;
  const pace = data.overall_pace;
  const paceMeta = pace ? PACE[pace] : null;
  const statusColor = paceMeta ? paceMeta.color : pct>90?'var(--danger)':pct>75?'var(--warning)':'var(--accent)';
  const fmt = (n) => new Intl.NumberFormat('en-SA',{maximumFractionDigits:0}).format(n||0);
  const remaining = data.remaining_budget ?? (data.total_budget - data.total_spent);

  const formatCurrency = (n) => fmt(n);
  return (
    <div className="space-y-3">
      {/* scannable bar + pace — keep the glanceable cues */}
      <div className="panel overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-3">
          <span className="text-[10px] font-medium uppercase tracking-wider shrink-0 font-data" style={{color:'var(--text-muted)'}}>
            {isRTL ? 'المستخدم من الميزانية' : 'Budget utilized'}
          </span>
          <div className="relative flex-1 h-1.5 rounded-full overflow-visible" style={{background:'var(--border-strong)'}}>
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{width:`${pct}%`, background:statusColor}}/>
            {timePct!=null && <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded" title={`${Math.round(timePct)}% time`} style={{left:`${Math.min(timePct,100)}%`, background:'var(--text-primary)'}}/>}
          </div>
          <span className="text-[10px] font-semibold font-data shrink-0" style={{color:statusColor}}>{Math.round(pct)}%</span>
          {paceMeta && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0" style={{background:`${paceMeta.color}18`, color:paceMeta.color}}>{isRTL?paceMeta.ar:paceMeta.en}</span>}
          {timeline && timeline.length>0 && (
            <div className="hidden lg:flex items-end gap-px h-6 w-28 shrink-0 opacity-60">
              {(()=>{ const max=Math.max(...timeline.map(d=>d.spent),1); return timeline.map(d=> <div key={d.date} className="flex-1 rounded-t-sm" title={`${d.date}: SAR ${d.spent}`} style={{height:`${Math.max((d.spent/max)*100, d.spent?8:2)}%`, background: d.spent>max*0.6?'var(--danger)':d.spent>0?'var(--accent)':'var(--border-strong)'}}/>); })()}
            </div>
          )}
        </div>
        {paceMeta && (
          <p className="px-5 pb-2 text-[10px] font-data" style={{color:paceMeta.color}}>
            {isRTL?paceMeta.ar:paceMeta.en} {' — '}
            {isRTL ? `استهلكت ${Math.round(pct)}% من الميزانية بينما انقضى ${Math.round(timePct)}% من الدورة` : `${Math.round(pct)}% of budget used vs ${Math.round(timePct)}% of cycle elapsed`}
          </p>
        )}
      </div>

      {/* scannable cards — visual, not reading */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="stat-card-primary">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-medium uppercase tracking-wider" style={{color:'var(--text-muted)'}}>{isRTL?'إجمالي المصروف':'Total Debited'}</p>
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{background:'var(--danger-dim)', color:'var(--danger)'}}><ArrowDownLeft className="w-3.5 h-3.5"/></div>
          </div>
          <p className="text-2xl font-semibold font-data leading-none" style={{color:'var(--amount)'}}>{formatCurrency(data.total_spent)}</p>
          <p className="text-[10px] mt-2 font-data" style={{color:'var(--text-muted)'}}><span style={{color:'var(--text-secondary)'}}>SAR</span> {' — '} {data.transaction_count??0} {isRTL?'عملية':'transactions'}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-medium uppercase tracking-wider" style={{color:'var(--text-muted)'}}>{isRTL?'المتبقي':'Remaining'}</p>
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{background:'var(--accent-dim)', color:'var(--accent)'}}><Gauge className="w-3.5 h-3.5"/></div>
          </div>
          <p className="text-2xl font-semibold font-data leading-none" style={{color: remaining>=0?'var(--accent)':'var(--danger)'}}>{formatCurrency(remaining)}</p>
          <p className="text-[10px] mt-2 font-data" style={{color:'var(--text-muted)'}}>{isRTL?'من':'of'} <span style={{color:'var(--text-secondary)'}} className="font-data">SAR {formatCurrency(data.total_budget)}</span></p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-medium uppercase tracking-wider" style={{color:'var(--text-muted)'}}>{isRTL?'الأيام المتبقية':'Days Left'}</p>
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{background:'var(--warning-dim)', color:'var(--warning)'}}><Clock className="w-3.5 h-3.5"/></div>
          </div>
          <p className="text-2xl font-semibold font-data leading-none" style={{color:statusColor}}>{data.days_remaining}</p>
          <p className="text-[10px] mt-2 font-data" style={{color:'var(--text-muted)'}}>{data.days_elapsed} {isRTL?'يوم منقضي':'days elapsed'}</p>
        </div>
      </div>
    </div>
  );
}
