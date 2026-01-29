'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
  en: {
    locale: "en-US",
    appTitle: "Budget Office",
    manageRules: "Manage Rules",
    overview: "Overview",
    setupBudget: "Setup your budget",
    setupBudgetDesc: "Add classification rules to start tracking category limits.",
    spent: "Spent",
    limit: "Limit",
    left: "left",
    newExpense: "New Expense",
    pasteSMS: "Paste SMS here... e.g. Purchase of SAR 150.00 at XYZ Store...",
    processSMS: "Process SMS",
    success: "Processed successfully",
    error: "Failed to process",
    recentActivity: "Recent Activity",
    noExpenses: "No expenses yet",
    startPrompt: "Paste an SMS to get started",
    unknownMerchant: "Unknown Merchant",
    proTip: "Pro Tip",
    proTipDesc: "Copy the entire SMS message from your bank and paste it directly. The system will automatically extract the merchant, amount, and date.",
    // Rules Page
    rulesTitle: "Manage Rules & Budgets",
    addRule: "Add Rule",
    merchantLabel: "Merchant Keyword",
    merchantPlaceholder: "Type keyword and press Enter...",
    merchantHint: "Press Enter or comma to add. Supports multiple keywords.",
    categoryLabel: "Main Category",
    categoryPlaceholder: "e.g. Transport",
    limitLabel: "Monthly Limit (SAR)",
    limitPlaceholder: "Optional",
    saveRule: "Save Rule",
    colPattern: "Pattern",
    colCategory: "Category",
    colLimit: "Limit",
    confirmDelete: "Are you sure?",
    confirmDeleteInvoice: "Are you sure you want to delete this invoice?",
    noRules: "No rules defined",
    loading: "Loading...",
    edit: "Edit",
    editRule: "Edit Rule",
    editInvoice: "Edit Invoice",
    update: "Update",
    cancel: "Cancel",
    selectCategory: "Select category",
    subCategoryLabel: "Sub Category",
    subCategoryPlaceholder: "e.g. Ride-sharing",
    classificationLabel: "Classification",
    classificationPlaceholder: "e.g. Expense",
    applyRules: "Apply Rules",
    applyRulesDesc: "Re-categorize all invoices",
    applying: "Applying...",
    appliedSuccess: "Updated",
    invoices: "invoices",
  },
  ar: {
    locale: "ar-SA",
    appTitle: "مكتب الميزانية",
    manageRules: "إدارة التصنيفات",
    overview: "نظرة عامة",
    setupBudget: "إعداد الميزانية",
    setupBudgetDesc: "أضف قواعد التصنيف للبدء في تتبع حدود الفئات.",
    spent: "المصروف",
    limit: "الحد",
    left: "متبقي",
    newExpense: "نفقات جديدة",
    pasteSMS: "الصق الرسالة النصية هنا... مثال: تم الشراء بمبلغ 150.00 ريال...",
    processSMS: "معالجة الرسالة",
    success: "تمت المعالجة بنجاح",
    error: "فشلت المعالجة",
    recentActivity: "النشاط الأخير",
    noExpenses: "لا توجد نفقات بعد",
    startPrompt: "الصق رسالة نصية للبدء",
    unknownMerchant: "تاجر غير معروف",
    proTip: "نصيحة",
    proTipDesc: "انسخ رسالة البنك النصية بالكامل والصقها مباشرة. سيقوم النظام باستخراج اسم التاجر والمبلغ والتاريخ تلقائياً.",
    // Rules Page
    rulesTitle: "إدارة التصنيفات والميزانيات",
    addRule: "إضافة تصنيف",
    merchantLabel: "كلمات مفتاحية للتاجر",
    merchantPlaceholder: "اكتب الكلمة واضغط Enter...",
    merchantHint: "اضغط Enter أو فاصلة للإضافة. يدعم كلمات متعددة.",
    categoryLabel: "الفئة الرئيسية",
    categoryPlaceholder: "مثال: مواصلات",
    limitLabel: "الحد الشهري (ريال)",
    limitPlaceholder: "اختياري",
    saveRule: "حفظ التصنيف",
    colPattern: "الكلمة المفتاحية",
    colCategory: "الفئة",
    colLimit: "الحد",
    confirmDelete: "هل أنت متأكد؟",
    confirmDeleteInvoice: "هل أنت متأكد من حذف هذه الفاتورة؟",
    noRules: "لا توجد تصانيف معرفة",
    loading: "جاري التحميل...",
    edit: "تعديل",
    editRule: "تعديل التصنيف",
    editInvoice: "تعديل النفقة",
    update: "تحديث",
    cancel: "إلغاء",
    selectCategory: "اختر الفئة",
    subCategoryLabel: "الفئة الفرعية",
    subCategoryPlaceholder: "مثال: توصيل",
    classificationLabel: "التصنيف",
    classificationPlaceholder: "مثال: مصروف",
    applyRules: "تطبيق القواعد",
    applyRulesDesc: "إعادة تصنيف جميع الفواتير",
    applying: "جاري التطبيق...",
    appliedSuccess: "تم تحديث",
    invoices: "فاتورة",
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    // Check localStorage or browser preference
    const savedLang = localStorage.getItem('language');
    if (savedLang) {
      setLanguage(savedLang);
    } else if (navigator.language.startsWith('ar')) {
        setLanguage('ar');
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key) => translations[language][key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL: language === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
