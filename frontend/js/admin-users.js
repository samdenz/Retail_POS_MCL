// Add cashier form logic for admin-add-cashier.html
document.addEventListener('DOMContentLoaded', () => {
    const addCashierForm = document.getElementById('add-cashier-form');
    if (addCashierForm) {
        addCashierForm.onsubmit = async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirmPassword').value;
            const errorDiv = document.getElementById('errorMsg');
            errorDiv.style.display = 'none';
            if (!username || !password || !confirm) {
                errorDiv.textContent = 'All fields are required.';
                errorDiv.style.display = 'block';
                return;
            }
            if (password !== confirm) {
                errorDiv.textContent = 'Passwords do not match.';
                errorDiv.style.display = 'block';
                return;
            }
            const token = localStorage.getItem('pos_token');
            if (!token) {
                errorDiv.textContent = 'You must be logged in as admin.';
                errorDiv.style.display = 'block';
                return;
            }
            try {
                const res = await fetch('http://localhost:3000/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ username, password, role: 'CASHIER' })
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.message || 'Failed to add cashier');
                alert('Cashier account created successfully!');
                addCashierForm.reset();
            } catch (err) {
                errorDiv.textContent = err.message;
                errorDiv.style.display = 'block';
            }
        };
    }
});
// JS for admin-users.html user management

document.addEventListener('DOMContentLoaded', () => {
    const usersList = document.getElementById('users-list');
    const addUserBtn = document.getElementById('add-user-btn');
    const token = localStorage.getItem('pos_token');

    // Load users
    async function loadUsers() {
        usersList.innerHTML = '<div class="card">Loading users...</div>';
        try {
            const res = await fetch('http://localhost:3000/api/users', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to fetch users');
            usersList.innerHTML = `
                <table style="width:100%;border-collapse:collapse;">
                    <tr style="background:#2a5298;color:#fff;">
                        <th>Username</th><th>Role</th><th>Status</th><th>Actions</th>
                    </tr>
                    ${data.users.map(u => `
                        <tr style="border-bottom:1px solid #eee;">
                            <td>${u.username}</td>
                            <td>${u.role}</td>
                            <td style="color:${u.is_active ? 'green' : 'red'};font-weight:bold;">
                                ${u.is_active ? 'Active' : 'Inactive'}
                            </td>
                            <td>
                                ${u.role === 'CASHIER' ? `<button class="toggle-user-btn" data-id="${u.user_id}" data-active="${u.is_active}">
                                    ${u.is_active ? 'Deactivate' : 'Activate'}
                                </button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </table>
            `;
            document.querySelectorAll('.toggle-user-btn').forEach(btn => {
                btn.onclick = () => toggleUserStatus(btn.dataset.id, btn.dataset.active === 'true');
            });
        } catch (err) {
            usersList.innerHTML = `<div class="card" style="color:#e74c3c;">${err.message}</div>`;
        }
    }

    // Toggle user status
    async function toggleUserStatus(userId, isActive) {
        try {
            const res = await fetch(`http://localhost:3000/api/users/${userId}/activate`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ is_active: !isActive })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update user status');
            alert('User status updated successfully');
            loadUsers();
        } catch (err) {
            alert('Error updating user: ' + err.message);
        }
    }

    // Add user form
    if (addUserBtn) {
        addUserBtn.onclick = () => {
            usersList.innerHTML = `
                <div class="card" style="max-width:400px;">
                    <h3>Add New User</h3>
                    <form id="add-user-form">
                        <label>Username</label>
                        <input type="text" id="username" required><br>
                        <label>Password</label>
                        <input type="password" id="password" required><br>
                        <label>Role</label>
                        <select id="role" required>
                            <option value="CASHIER">Cashier</option>
                            <option value="ADMIN">Admin</option>
                        </select><br>
                        <div id="add-user-error" style="color:#e74c3c;margin:8px 0;display:none;"></div>
                        <button type="submit">Add User</button>
                        <button type="button" onclick="window.location.reload()">Cancel</button>
                    </form>
                </div>
            `;
            document.getElementById('add-user-form').onsubmit = async (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const role = document.getElementById('role').value;
                const errorDiv = document.getElementById('add-user-error');
                errorDiv.style.display = 'none';
                try {
                    const res = await fetch('http://localhost:3000/api/users', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({ username, password, role })
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to add user');
                    alert('User added successfully!');
                    window.location.reload();
                } catch (err) {
                    errorDiv.textContent = err.message;
                    errorDiv.style.display = 'block';
                }
            };
        };
    }

    // Initial load
    loadUsers();
});
