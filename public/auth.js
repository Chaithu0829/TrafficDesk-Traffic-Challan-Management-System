const registrationForm = document.querySelector('#registerForm');
const loginForm = document.querySelector('#loginForm');
const notice = document.querySelector('#notice');

if (registrationForm) {
    registrationForm.addEventListener('submit', async event => {
        event.preventDefault();
        const button = registrationForm.querySelector('button'); button.disabled = true;
        try {
            const payload = Object.fromEntries(new FormData(registrationForm).entries());
            payload.fullName = document.querySelector('#fullName').value;
            payload.badgeNumber = document.querySelector('#badgeNumber').value;
            payload.stationName = document.querySelector('#stationName').value;
            payload.email = document.querySelector('#email').value;
            payload.password = document.querySelector('#password').value;
            const data = await api('/auth/police/register', { method:'POST', body:JSON.stringify(payload) });
            showNotice(notice, `${data.message} Redirecting to login…`);
            registrationForm.reset(); setTimeout(() => { window.location.href = 'police-login.html'; }, 1100);
        } catch (error) { showNotice(notice, error.message, 'error'); } finally { button.disabled = false; }
    });
}
if (loginForm) {
    loginForm.addEventListener('submit', async event => {
        event.preventDefault();
        const button = loginForm.querySelector('button'); button.disabled = true;
        try {
            const role = document.querySelector('[data-login-role]').dataset.loginRole;
            const data = await api('/auth/login', { method:'POST', body:JSON.stringify({ role, identifier:document.querySelector('#identifier').value, password:document.querySelector('#password').value }) });
            setSession(data); window.location.href = role === 'admin' ? 'admin.html' : 'police.html';
        } catch (error) { showNotice(notice, error.message, 'error'); } finally { button.disabled = false; }
    });
}
