'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { fetchInvoices } from '../lib/api';
import SMSInput from '../components/SMSInput';
import InvoiceList from '../components/InvoiceList';
import BudgetOverview from '../components/BudgetOverview';
import { LayoutDashboard, Receipt, Settings, Globe } from 'lucide-react';
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
    <div className="min-h-screen bg-zinc-50/50 font-sans text-zinc-900">
      
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2 rounded-lg">
                <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">{t('appTitle')}</h1>
          </div>
          
          <div className="flex items-center gap-4">
              <button 
                onClick={toggleLanguage}
                className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-indigo-600 transition-colors"
              >
                  <Globe className="w-4 h-4" />
                  {language === 'en' ? 'العربية' : 'English'}
              </button>
              <Link href="/rules" className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-indigo-600 transition-colors">
                <Settings className="w-4 h-4" />
                {t('manageRules')}
              </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Budget Overview Section */}
        <section className="mb-8">
             <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">{t('overview')}</h2>
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
                
                <div className="mt-6 bg-indigo-900 rounded-2xl p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Receipt size={100} />
                    </div>
                    <h3 className="font-semibold text-lg relative z-10">{t('proTip')}</h3>
                    <p className="text-indigo-200 text-sm mt-2 relative z-10 leading-relaxed">
                        {t('proTipDesc')}
                    </p>
                </div>
            </div>
          </div>
        
        </div>
      </main>
    </div>
  );
}
