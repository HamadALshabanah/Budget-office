'use client';
import { getCurrentCycle, getCycleAnalysis } from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import { useState, useEffect } from 'react';

const PACE = {
  ahead:    { color: 'var(--danger)',  en: 'Ahead', ar: 'متجاوز' },
  on_track: { color: 'var(--warning)', en: 'On pace', ar: 'ضمن الوتيرة' },
  behind:   { color: 'var(--accent)',  en: 'Under', ar: 'أقل من الوتيرة' },
};

export default function CategoriesSection({ refreshTrigger, selectedCycleId, onFilterCategory }) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        let cycleId = selectedCycleId;
        if (!cycleId) {
          const c = await getCurrentCycle();
          if (!c || c.status === 'no_active_cycle' || !c.id) { if (!cancelled) setData(null); return; }
          cycleId = c.id;
        }
        const a = await getCycleAnalysis(cycleId);
        if (!cancelled) setData(a);
      } catch (e) { console.error(e); if (!cancelled) setData(null); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [refreshTrigger, selectedCycleId]);

  if (loading) {
    return (
      <div className="panel p-5 animate-pulse space-y-3">
        {[1,2,3].map(i=> <div key={i} className="h-10 rounded" style={{background:'var(--base-subtle)'}}/>)}
      </div>
    );
  }
  if (!data || !data.category_breakdown || data.category_breakdown.length===0) {
    return (
      <div className="panel p-5">
        <p className="text-sm font-medium" style={{color:'var(--text-secondary)'}}>{isRTL?'أضف فئات لترى الإنفاق':'Add categories to see spending'}</p>
        <p className="text-xs mt-1" style={{color:'var(--text-muted)'}}>{isRTL?'حدود الفئات تظهر هنا مع نسب الميزانية':'Category limits and pace appear here'}</p>
      </div>
    );
  }

  const fmt = (n) => new Intl.NumberFormat('en-SA',{maximumFractionDigits:0}).format(n||0);
  const maxSpent = Math.max(...data.category_breakdown.map(c=>c.spent),1);

  return (
    <div className="panel overflow-hidden">
      <div className="px-6 pt-5 pb-3 flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{color:'var(--text-primary)'}}>{isRTL?'الفئات':'Categories'}</h3>
        <span className="text-[10px] font-data" style={{color:'var(--text-muted)'}}>SAR {fmt(data.total_spent)} · {data.transaction_count} {isRTL?'عملية':'tx'}</span>
      </div>
      <div className="px-2 pb-2">
        {/* gauges row — quick budget health */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-3 pb-4">
          {data.category_breakdown.slice(0,8).map(cat=>{
            const pct = cat.limit ? Math.min((cat.spent/cat.limit)*100,100) : 0;
            const pm = cat.pace ? PACE[cat.pace] : null;
            const col = pm ? pm.color : pct>90?'var(--danger)':pct>75?'var(--warning)':'var(--accent)';
            return (
              <button key={cat.category} onClick={()=> onFilterCategory && onFilterCategory(cat.category)} className="text-left rounded-xl p-4 relative overflow-hidden group" style={{background:'var(--surface-raised)', border:'1px solid var(--border)'}}>
                <div className="absolute inset-0 pointer-events-none" style={{width:`${pct}%`, background:`${col}12`}}/>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate" style={{color:'var(--text-primary)'}}>{cat.category}</span>
                    {pm && <span className="w-2 h-2 rounded-full shrink-0" style={{background: pm.color}}/>}
                  </div>
                  <p className="text-xs font-data mt-1.5" style={{color:'var(--amount)'}}>SAR {fmt(cat.spent)} <span style={{color:'var(--text-muted)'}}>/ {cat.limit?`SAR ${fmt(cat.limit)}`:'—'}</span></p>
                  <div className="h-1.5 rounded-full mt-2.5 overflow-hidden" style={{background:'var(--border-strong)'}}>
                    <div className="h-full rounded-full" style={{width:`${pct}%`, background: col}}/>
                  </div>
                  <p className="text-[10px] font-data mt-1.5 flex justify-between" style={{color:'var(--text-muted)'}}>
                    <span>{cat.percentage_of_total}% {isRTL?'من الإنفاق':'of spend'}</span>
                    <span style={{color: col}}>{cat.limit?`${Math.round(pct)}%`:''}</span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {/* detailed list — the numbers */}
        <div className="px-3 pb-4 space-y-3">
          {data.category_breakdown.map(cat=>{
            const pm = cat.pace ? PACE[cat.pace] : null;
            const w = Math.max((cat.spent/maxSpent)*100, cat.spent>0?2:0);
            const lim = cat.percentage_of_limit;
            return (
              <button key={cat.category} onClick={()=> onFilterCategory && onFilterCategory(cat.category)} className="w-full text-left">
                <div className="flex items-baseline">
                  <span className="flex-1 text-sm font-medium flex items-center gap-1.5" style={{color:'var(--text-primary)'}}>
                    {cat.category}
                    {pm && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{background:`${pm.color}18`, color: pm.color}}>{isRTL?pm.ar:pm.en}</span>}
                  </span>
                  <span className="w-14 text-right text-xs font-data" style={{color:'var(--text-muted)'}}>{cat.percentage_of_total}%</span>
                  <span className="w-20 text-right text-xs font-data" style={{color:cat.limit?'var(--amount)':'var(--text-muted)'}}>{cat.limit?`${lim}%`:'—'}</span>
                </div>
                <div className="relative h-2 rounded-full overflow-hidden mt-1.5" style={{background:'var(--base-subtle)'}}>
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{width:`${w}%`, background: pm?pm.color:'var(--accent)', opacity:0.6}}/>
                  {lim!=null && <div className="absolute inset-y-0" style={{left:`calc(${Math.min(lim,100)}% - 1px)`, width:2, background:'var(--text-primary)'}}/>}
                </div>
                <div className="flex justify-between mt-1 text-[10px] font-data" style={{color:'var(--text-muted)'}}>
                  <span>SAR {fmt(cat.spent)}</span>
                  {cat.limit!=null && <span>{isRTL?'الحد':'limit'} SAR {fmt(cat.limit)}</span>}
                </div>
              </button>
            );
          })}
        </div>
        {data.top_merchants?.length>0 && (
          <div className="mx-3 mt-2 pt-4 flex flex-wrap gap-2" style={{borderTop:'1px solid var(--border)'}}>
            <span className="text-[10px] font-medium uppercase tracking-wider w-full mb-1.5" style={{color:'var(--text-muted)'}}>{isRTL?'أكبر التجار':'Top merchants'}</span>
            {data.top_merchants.map(m=> (
              <span key={m.merchant} className="text-xs px-2.5 py-1 rounded-full font-data" style={{background:'var(--base-subtle)', border:'1px solid var(--border)', color:'var(--text-secondary)'}}>{m.merchant} · SAR {fmt(m.spent)}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
