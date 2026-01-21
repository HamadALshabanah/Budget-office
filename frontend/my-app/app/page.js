'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { fetchInvoices } from '../lib/api';
import SMSInput from '../components/SMSInput';
import InvoiceList from '../components/InvoiceList';
import BudgetOverview from '../components/BudgetOverview';
import { LayoutDashboard, Receipt, Settings, Globe, Terminal } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

export default function Home() {
  const { t, language, setLanguage } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchInvoices().then(setInvoices).catch(console.error);
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] font-mono text-gray-200">
      
      {/* Header */}
      <header className="bg-[#12121a] border-b border-[#2a2a3a] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-400 p-2 rounded border border-cyan-400/50 shadow-[0_0_15px_rgba(0,255,255,0.4)]">
                <Terminal className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-cyan-400 text-glow-cyan">{t('appTitle')}</h1>
              <p className="text-[10px] text-cyan-600 uppercase tracking-widest">Financial Terminal v2.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
              <button 
                onClick={toggleLanguage}
                className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-cyan-400 transition-colors px-3 py-1.5 border border-[#2a2a3a] rounded hover:border-cyan-500/50 hover:shadow-[0_0_10px_rgba(0,255,255,0.2)]"
              >
                  <Globe className="w-4 h-4" />
                  {language === 'en' ? 'العربية' : 'English'}
              </button>
              <Link href="/rules" className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-cyan-400 transition-colors px-3 py-1.5 border border-[#2a2a3a] rounded hover:border-cyan-500/50 hover:shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                <Settings className="w-4 h-4" />
                {t('manageRules')}
              </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Budget Overview Section */}
        <section className="mb-8">
             <h2 className="text-xs font-bold text-cyan-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
               <span className="text-cyan-400">▶</span> {t('overview')}
               <span className="flex-1 h-px bg-gradient-to-r from-cyan-500/50 to-transparent"></span>
             </h2>
             <BudgetOverview refreshTrigger={refreshKey} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Action Column */}
          <div className="lg:col-span-2 space-y-8">
             <section>
                 <InvoiceList invoices={invoices} onUpdate={handleRefresh} />
             </section>
          </div>

          {/* Sidebar / Input Column */}
          <div className="space-y-6">
            <div className="sticky top-24">
                <SMSInput onInvoiceAdded={handleRefresh} />
                
                <div className="mt-6 bg-gradient-to-br from-[#1a1a25] to-[#12121a] rounded-lg p-5 border border-[#2a2a3a] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-20">
                        <Receipt size={80} className="text-magenta-500" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 to-transparent"></div>
                    <h3 className="font-bold text-fuchsia-400 relative z-10 flex items-center gap-2">
                      <span className="text-fuchsia-500">◆</span> {t('proTip')}
                    </h3>
                    <p className="text-gray-400 text-sm mt-2 relative z-10 leading-relaxed">
                        {t('proTipDesc')}
                    </p>
                </div>
            </div>
          </div>
        
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-[#2a2a3a] py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-gray-600 tracking-wider">
            ━━━ BUDGET OFFICE TERMINAL ━━━ SYS.OK ━━━
          </p>
        </div>
      </footer>
    </div>
  );
}
