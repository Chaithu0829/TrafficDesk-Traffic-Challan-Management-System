const API = '/api';

function session() {
    try { return JSON.parse(localStorage.getItem('trafficdesk_session')); } catch { return null; }
}
function setSession(value) { localStorage.setItem('trafficdesk_session', JSON.stringify(value)); }
function clearSession() { localStorage.removeItem('trafficdesk_session'); }
function authHeaders() {
    const saved = session();
    return saved?.token ? { Authorization: `Bearer ${saved.token}` } : {};
}
async function api(path, options = {}) {
    const headers = { ...authHeaders(), ...(options.headers || {}) };
    if (options.body) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${API}${path}`, { ...options, headers });
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;
    if (!response.ok) {
        if (response.status === 401 && session()) clearSession();
        throw new Error(data?.message || 'Request failed. Please try again.');
    }
    return data;
}
function showNotice(element, message, kind = 'success') {
    element.textContent = message;
    element.className = `notice show ${kind}`;
}
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]);
}
function formatMoney(value) { return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`; }
function formatDate(value) { return value ? new Date(value).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' }) : 'Legacy record'; }
async function guard(role) {
    const saved = session();
    const redirect = role === 'admin' ? 'admin-login.html' : 'police-login.html';
    if (!saved || saved.user?.role !== role) { window.location.href = redirect; return null; }
    try { return (await api('/auth/me')).user; } catch { window.location.href = redirect; return null; }
}
document.querySelectorAll('[data-logout]').forEach(link => link.addEventListener('click', async event => {
    event.preventDefault();
    try { await api('/auth/logout', { method:'POST' }); } catch { /* local logout still succeeds */ }
    clearSession(); window.location.href = 'index.html';
}));
