// JS for cashier-history.html sales history

document.addEventListener('DOMContentLoaded', () => {
    const transactionsList = document.getElementById('transactions-list');
    const dailySummary = document.getElementById('daily-summary');
    const token = localStorage.getItem('pos_token');
    const user = JSON.parse(localStorage.getItem('pos_user'));
    if (!user) return;

    // Load transactions
    async function loadTransactions() {
        transactionsList.innerHTML = '<div class="card">Loading transactions...</div>';
        try {
            const res = await fetch(`http://localhost:3000/api/sales/user/${user.user_id}?limit=20`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to fetch transactions');
            if (!data.sales.length) {
                transactionsList.innerHTML = '<div class="card">No transactions found.</div>';
                return;
            }
            transactionsList.innerHTML = `
                <table style="width:100%;border-collapse:collapse;">
                    <tr style="background:#2a5298;color:#fff;">
                        <th>Date</th><th>Amount</th><th>Payment</th>
                    </tr>
                    ${data.sales.map(tx => `
                        <tr style="border-bottom:1px solid #eee;">
                            <td>${new Date(tx.sale_date).toLocaleString()}</td>
                            <td>KES ${parseFloat(tx.total_amount).toFixed(2)}</td>
                            <td>${tx.payment_method}</td>
                        </tr>
                    `).join('')}
                </table>
            `;
        } catch (err) {
            transactionsList.innerHTML = `<div class="card" style="color:#e74c3c;">${err.message}</div>`;
        }
    }

    // Load daily summary
    async function loadDailySummary() {
        dailySummary.innerHTML = '<div class="card">Loading daily summary...</div>';
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await fetch(`http://localhost:3000/api/sales/reports/daily?date=${today}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to fetch daily summary');
            dailySummary.innerHTML = `
                <div class="card">
                    <h3>Summary for ${data.date}</h3>
                    <p><strong>Total Sales:</strong> KES ${parseFloat(data.summary.total_sales || 0).toFixed(2)}</p>
                    <p><strong>Transactions:</strong> ${data.summary.total_transactions || 0}</p>
                    <p><strong>Average Sale:</strong> KES ${parseFloat(data.summary.average_sale || 0).toFixed(2)}</p>
                </div>
            `;
        } catch (err) {
            dailySummary.innerHTML = `<div class="card" style="color:#e74c3c;">${err.message}</div>`;
        }
    }

    loadTransactions();
    loadDailySummary();
});
