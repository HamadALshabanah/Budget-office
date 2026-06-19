const API_URL = 'http://127.0.0.1:8000';

export async function fetchInvoices({ search, category, min_amount, max_amount } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  if (min_amount !== undefined && min_amount !== '') params.set('min_amount', min_amount);
  if (max_amount !== undefined && max_amount !== '') params.set('max_amount', max_amount);
  const qs = params.toString();
  const res = await fetch(`${API_URL}/invoices${qs ? '?' + qs : ''}`);
  return res.json();
}

export async function postSMS(message) {
  const res = await fetch(`${API_URL}/sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  return res.json();
}

export async function fetchCategories() {
    const res = await fetch(`${API_URL}/categories`);
    return res.json();
}

export async function fetchCategoryRemaining(category) {
    const res = await fetch(`${API_URL}/categories/${category}/remaining-limit`);
    return res.json();
}

export async function fetchRules() {
    const res = await fetch(`${API_URL}/rules`);
    return res.json();
}

export async function addRule(rule) {
    const res = await fetch(`${API_URL}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
    });
    return res.json();
}

export async function deleteRule(ruleId) {
    const res = await fetch(`${API_URL}/rules/${ruleId}`, {
        method: 'DELETE',
    });
    return res.json();
}

export async function updateRule(ruleId, rule) {
    const res = await fetch(`${API_URL}/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
    });
    return res.json();
}

export async function updateInvoice(invoiceId, data) {
    const res = await fetch(`${API_URL}/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function fetchCategoryAnalysis(category) {
    const res = await fetch(`${API_URL}/categories/${encodeURIComponent(category)}/analysis`);
    return res.json();
}

export async function deleteInvoice(invoiceId) {
    const res = await fetch(`${API_URL}/invoices/${invoiceId}`, {
        method: 'DELETE',
    });
    return res.json();
}

// Budget Cycle APIs
export async function startNewCycle(startDate = null, endDate = null) {
    const url = startDate
        ? `${API_URL}/cycles/start?start_date=${startDate}${endDate ? `&end_date=${endDate}` : ''}`
        : `${API_URL}/cycles/start`;
    const res = await fetch(url, { method: 'POST' });
    return res.json();
}

export async function endCurrentCycle() {
    const res = await fetch(`${API_URL}/cycles/end`, { method: 'POST' });
    return res.json();
}

export async function getCurrentCycle() {
    const res = await fetch(`${API_URL}/cycles/current`);
    return res.json();
}

export async function getCycleHistory(limit = 12) {
    const res = await fetch(`${API_URL}/cycles/history?limit=${limit}`);
    return res.json();
}

export async function getCycleAnalysis(cycleId) {
    const res = await fetch(`${API_URL}/cycles/${cycleId}/analysis`);
    return res.json();
}

export async function getSpendingTimeline(cycleId) {
    const res = await fetch(`${API_URL}/cycles/${cycleId}/spending-timeline`);
    return res.json();
}

export async function getCycleInvoices(cycleId) {
    const res = await fetch(`${API_URL}/cycles/${cycleId}/invoices`);
    return res.json();
}

export async function categorizeInvoices() {
    const res = await fetch(`${API_URL}/invoices/categorize`, { method: 'POST' });
    return res.json();
}
