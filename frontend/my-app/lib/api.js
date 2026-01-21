const API_URL = 'http://127.0.0.1:8000';

export async function fetchInvoices() {
  const res = await fetch(`${API_URL}/invoices/`);
  return res.json();
}

export async function postSMS(message) {
  const res = await fetch(`${API_URL}/sms/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  return res.json();
}

export async function fetchCategories() {
    const res = await fetch(`${API_URL}/categories/`);
    return res.json();
}

export async function fetchCategoryRemaining(category) {
    const res = await fetch(`${API_URL}/category/remaining_limit/${category}`);
    return res.json();
}

export async function fetchRules() {
    const res = await fetch(`${API_URL}/rules_list/`);
    return res.json();
}

export async function addRule(rule) {
    const res = await fetch(`${API_URL}/rules/`, {
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
    const res = await fetch(`${API_URL}/rule/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
    });
    return res.json();
}

export async function updateInvoice(invoiceId, data) {
    const res = await fetch(`${API_URL}/invoice/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return res.json();
}
