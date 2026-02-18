// JS for cashier-history.html sales history

document.addEventListener('DOMContentLoaded', () => {
    const transactionsList = document.getElementById('transactions-list');
    const dailySummary = document.getElementById('daily-summary');
    const token = localStorage.getItem('pos_token');
    const user = JSON.parse(localStorage.getItem('pos_user'));
    if (!user) return;

    // Load transactions with optional date filter
    async function loadTransactions(date = null) {
        transactionsList.innerHTML = '<div class="card">Loading transactions...</div>';
        let url = `http://localhost:3000/api/sales/user/${user.user_id}?limit=20`;
        if (date) {
            url += `&date=${date}`;
        }
        try {
            const res = await fetch(url, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to fetch transactions');
            if (!data.sales.length) {
                transactionsList.innerHTML = '<div class="card">No transactions found.</div>';
                return;
            }
            transactionsList.innerHTML = `
                <table id="sales-table" style="width:100%;border-collapse:collapse;">
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

    // Filter button
    const filterBtn = document.getElementById('filter-btn');
    const filterDate = document.getElementById('filter-date');
    if (filterBtn && filterDate) {
        filterBtn.onclick = () => {
            const dateVal = filterDate.value;
            loadTransactions(dateVal || null);
        };
    }

    // Print button
    const printBtn = document.getElementById('print-btn');
    if (printBtn) {
        printBtn.onclick = () => {
            const table = document.getElementById('sales-table');
            if (!table) {
                alert('No sales to print.');
                return;
            }
            const printWindow = window.open('', '', 'width=800,height=600');
            printWindow.document.write('<html><head><title>Sales Report</title>');
            printWindow.document.write('<style>table{width:100%;border-collapse:collapse;}th,td{border:1px solid #222;padding:8px;}th{background:#2a5298;color:#fff;}</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write('<h2>Sales Report</h2>');
            printWindow.document.write(table.outerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print();
        };
    }

    loadTransactions();
    loadDailySummary();
});
