document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorDiv = document.getElementById('login-error');
    const loginBtn = document.getElementById('loginBtn');
    const spinner = document.getElementById('spinner');

    // Reset error
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    // Show loading state
    loginBtn.disabled = true;
    spinner.style.display = 'block';
    loginBtn.textContent = "Logging in...";

    try {
        const res = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        console.log("Response status:", res.status);
        console.log("Response data:", data);


        if (res.ok && data.success && data.token) {
            localStorage.setItem('pos_token', data.token);
            localStorage.setItem('pos_user', JSON.stringify(data.user));
            if (data.user.role && data.user.role.toLowerCase() === 'admin') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'pos.html';
            }
        } else {
            errorDiv.textContent = data.message || 'Invalid credentials';
            errorDiv.style.display = 'block';
        }

    } catch (err) {
        errorDiv.textContent = 'Login failed. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        // 🔥 THIS FIXES YOUR ISSUE
        spinner.style.display = 'none';
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
    }
});
