(async () => {
    const user = await guard('admin'); if (!user) return;
    document.querySelector('#adminIdentity').innerHTML = `Signed in as <strong>${escapeHtml(user.name)}</strong>`;
    const empty = (columns, message) => `<tr><td class="empty" colspan="${columns}">${message}</td></tr>`;
    async function loadDashboard() {
        const [summary, police, vehicles] = await Promise.all([api('/admin/dashboard'), api('/admin/police'), api('/admin/vehicles')]);
        document.querySelector('#stats').innerHTML = [['Registered police',summary.totalPolice],['Vehicles',summary.totalVehicles],['Total challans',summary.totalChallans],['Pending payments',summary.pendingChallans],['Collected',formatMoney(summary.collectedAmount)]].map(([label,value]) => `<div class="stat"><span class="label">${label}</span><strong>${value}</strong></div>`).join('');
        document.querySelector('#policeRows').innerHTML = police.length ? police.map(row => `<tr><td>${escapeHtml(row.badge_number)}</td><td>${escapeHtml(row.full_name)}</td><td>${escapeHtml(row.station_name)}</td><td>${escapeHtml(row.email)}</td><td>${formatDate(row.created_at)}</td><td>${row.challans_issued}</td></tr>`).join('') : empty(6, 'No police officers registered yet.');
        document.querySelector('#vehicleRows').innerHTML = vehicles.length ? vehicles.map(row => `<tr><td>${escapeHtml(row.vehicle_number)}</td><td>${escapeHtml(row.owner_name)}</td><td>${row.total_challans}</td><td>${formatMoney(row.total_fines)}</td></tr>`).join('') : empty(4, 'No vehicle records yet.');
    }
    async function loadChallans() {
        const search = document.querySelector('#search').value;
        const rows = await api(`/admin/challans?search=${encodeURIComponent(search)}`);
        document.querySelector('#challanRows').innerHTML = rows.length ? rows.map(row => `<tr><td>#${row.challan_id}</td><td><strong>${escapeHtml(row.vehicle_number)}</strong><br><small>${escapeHtml(row.owner_name)}</small></td><td>${escapeHtml(row.violation_type)}</td><td>${formatMoney(row.fine)}</td><td>${escapeHtml(row.officer_name || 'Legacy record')}<br><small>${escapeHtml(row.badge_number || '—')}</small></td><td>${formatDate(row.issued_at)}</td><td><span class="status ${row.payment_status.toLowerCase()}">${row.payment_status}</span></td></tr>`).join('') : empty(7, 'No challans match this search.');
    }
    try { await Promise.all([loadDashboard(), loadChallans()]); } catch (error) { document.querySelector('#challanRows').innerHTML = empty(7, escapeHtml(error.message)); }
    document.querySelector('#searchButton').addEventListener('click', loadChallans);
    document.querySelector('#search').addEventListener('keydown', event => { if (event.key === 'Enter') loadChallans(); });
})();
