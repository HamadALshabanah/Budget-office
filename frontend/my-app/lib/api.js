const API_URL = 'http://127.0.0.1:8000';

// ── Auth helpers ──────────────────────────────────────────────────────────────

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export function isAuthenticated() {
  return typeof window !== 'undefined' && !!localStorage.getItem('access_token');
}

export function logout() {
  if (typeof window !== 'undefined') localStorage.removeItem('access_token');
}

export async function login(username, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed');
  }
  const data = await res.json();
  localStorage.setItem('access_token', data.access_token);
  return data;
}

export async function register(username, password) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Registration failed');
  }
  return res.json();
}

// ── Invoice APIs ──────────────────────────────────────────────────────────────

export async function fetchInvoices({ search, category, min_amount, max_amount } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  if (min_amount !== undefined && min_amount !== '') params.set('min_amount', min_amount);
  if (max_amount !== undefined && max_amount !== '') params.set('max_amount', max_amount);
  const qs = params.toString();
  const res = await fetch(`${API_URL}/invoices${qs ? '?' + qs : ''}`, {
    headers: { ...getAuthHeader() },
  });
  return res.json();
}

export async function postSMS(message) {
  const res = await fetch(`${API_URL}/sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ message }),
  });
  return res.json();
}

export async function fetchCategories() {
    const res = await fetch(`${API_URL}/categories`, {
        headers: { ...getAuthHeader() },
    });
    return res.json();
}

export async function fetchCategoryRemaining(category) {
    const res = await fetch(`${API_URL}/categories/${category}/remaining-limit`, {
        headers: { ...getAuthHeader() },
    });
    return res.json();
}

export async function fetchRules() {
    const res = await fetch(`${API_URL}/rules`, {
        headers: { ...getAuthHeader() },
    });
    return res.json();
}

export async function addRule(rule) {
    const res = await fetch(`${API_URL}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(rule),
    });
    return res.json();
}

export async function deleteRule(ruleId) {
    const res = await fetch(`${API_URL}/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
    });
    return res.json();
}

export async function updateRule(ruleId, rule) {
    const res = await fetch(`${API_URL}/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(rule),
    });
    return res.json();
}

export async function updateInvoice(invoiceId, data) {
    const res = await fetch(`${API_URL}/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function fetchCategoryAnalysis(category) {
    const res = await fetch(`${API_URL}/categories/${encodeURIComponent(category)}/analysis`, {
        headers: { ...getAuthHeader() },
    });
    return res.json();
}

export async function deleteInvoice(invoiceId) {
    const res = await fetch(`${API_URL}/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
    });
    return res.json();
}

// ── Budget Cycle APIs ─────────────────────────────────────────────────────────

export async function startNewCycle(startDate = null, endDate = null) {
    const url = startDate
        ? `${API_URL}/cycles/start?start_date=${startDate}${endDate ? `&end_date=${endDate}` : ''}`
        : `${API_URL}/cycles/start`;
    const res = await fetch(url, { method: 'POST', headers: { ...getAuthHeader() } });
    return res.json();
}

export async function endCurrentCycle() {
    const res = await fetch(`${API_URL}/cycles/end`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
    });
    return res.json();
}

export async function getCurrentCycle() {
    const res = await fetch(`${API_URL}/cycles/current`, {
        headers: { ...getAuthHeader() },
    });
    return res.json();
}

export async function getCycleHistory(limit = 12) {
    const res = await fetch(`${API_URL}/cycles/history?limit=${limit}`, {
        headers: { ...getAuthHeader() },
    });
    return res.json();
}

export async function getCycleAnalysis(cycleId) {
    const res = await fetch(`${API_URL}/cycles/${cycleId}/analysis`, {
        headers: { ...getAuthHeader() },
    });
    return res.json();
}

export async function getSpendingTimeline(cycleId) {
    const res = await fetch(`${API_URL}/cycles/${cycleId}/spending-timeline`, {
        headers: { ...getAuthHeader() },
    });
    return res.json();
}

export async function getCycleInvoices(cycleId) {
    const res = await fetch(`${API_URL}/cycles/${cycleId}/invoices`, {
        headers: { ...getAuthHeader() },
    });
    return res.json();
}

export async function deleteCycle(cycleId) {
    const res = await fetch(`${API_URL}/cycles/${cycleId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
    });
    return res.json();
}

export async function categorizeInvoices() {
    const res = await fetch(`${API_URL}/invoices/categorize`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
    });
    return res.json();
}
