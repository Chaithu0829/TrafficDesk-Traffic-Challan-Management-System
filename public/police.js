(async () => {
    const user = await guard('police'); if (!user) return;
    document.querySelector('#officerIdentity').innerHTML = `Signed in as <strong>${escapeHtml(user.name)}</strong><br>${escapeHtml(user.badgeNumber)}`;
    const choices = document.querySelector('#violations');
    const notice = document.querySelector('#notice');
    try {
        const violations = await api('/violations');
        choices.innerHTML = violations.map(item => `<label class="choice"><input type="checkbox" name="violation" value="${item.violation_id}"><span><strong>${escapeHtml(item.violation_type)}</strong><small>${formatMoney(item.fine)}</small></span></label>`).join('');
    } catch (error) { showNotice(notice, error.message, 'error'); }
    document.querySelector('#vehicle').addEventListener('blur', event => { event.target.value = event.target.value.toUpperCase().replace(/[\s-]/g, ''); });
    document.querySelector('#challanForm').addEventListener('submit', async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('button'); button.disabled = true;
        const violation_ids = [...document.querySelectorAll('input[name="violation"]:checked')].map(input => Number(input.value));
        try {
            const result = await api('/createChallan', { method:'POST', body:JSON.stringify({ vehicle_number:document.querySelector('#vehicle').value, owner_name:document.querySelector('#owner').value, violation_ids }) });
            showNotice(notice, result.message); form.reset();
        } catch (error) { showNotice(notice, error.message, 'error'); } finally { button.disabled = false; }
    });
})();
