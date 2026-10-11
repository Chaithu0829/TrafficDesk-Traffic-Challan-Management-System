const searchForm = document.querySelector('#searchForm');
const userNotice = document.querySelector('#notice');
const result = document.querySelector('#result');
function renderChallans(rows) {
    if (!Array.isArray(rows)) { result.innerHTML = ''; return; }
    const owner = rows[0]?.owner_name || 'Not recorded';
    result.innerHTML = `<section class="card table-card"><div style="padding:20px 20px 0"><h2>${escapeHtml(rows[0].vehicle_number)}</h2><p class="muted">Registered owner: ${escapeHtml(owner)}</p></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Violation</th><th>Fine</th><th>Issued by</th><th>Date & time</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(row => `<tr><td>#${row.challan_id}</td><td>${escapeHtml(row.violation_type)}</td><td>${formatMoney(row.fine)}</td><td>${escapeHtml(row.officer_name || 'Legacy record')}<br><small>${escapeHtml(row.badge_number || '—')}</small></td><td>${formatDate(row.issued_at)}</td><td><span class="status ${row.payment_status.toLowerCase()}">${escapeHtml(row.payment_status)}</span></td><td>${row.payment_status === 'Pending' ? `<button class="pay-button" data-pay="${row.challan_id}">Pay now</button>` : 'Paid'}</td></tr>`).join('')}</tbody></table></div></section>`;
    result.querySelectorAll('[data-pay]').forEach(button => button.addEventListener('click', async () => {
        try { await api(`/pay/${button.dataset.pay}`, { method:'PUT' }); searchForm.requestSubmit(); } catch (error) { showNotice(userNotice, error.message, 'error'); }
    }));
}
searchForm.addEventListener('submit', async event => { event.preventDefault(); try { const data = await api(`/challan/${encodeURIComponent(document.querySelector('#vehicle').value)}`); if (data.message) { showNotice(userNotice, data.message, 'error'); result.innerHTML = ''; } else { userNotice.className = 'notice'; renderChallans(data); } } catch (error) { showNotice(userNotice, error.message, 'error'); } });
