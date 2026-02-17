// JS for admin-reports.html reports

document.addEventListener('DOMContentLoaded', () => {
    const salesReportsDiv = document.getElementById('sales-reports');
    const inventoryReportsDiv = document.getElementById('inventory-reports');
    const userPerformanceDiv = document.getElementById('user-performance');
    const token = localStorage.getItem('pos_token');

    // Load sales reports
    async function loadSalesReports() {
        salesReportsDiv.innerHTML = '<div class="card">Loading sales reports...</div>';
        try {
            const res = await fetch('http://localhost:3000/api/sales/reports/daily', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to fetch sales reports');
            salesReportsDiv.innerHTML = `
                <div class="card">
                    <h3>Daily Sales Summary (${data.date})</h3>
                    <p><strong>Total Sales:</strong> KES ${parseFloat(data.summary.total_sales || 0).toFixed(2)}</p>
                    <p><strong>Transactions:</strong> ${data.summary.total_transactions || 0}</p>
                    <p><strong>Average Sale:</strong> KES ${parseFloat(data.summary.average_sale || 0).toFixed(2)}</p>
                    <h4>By Payment Method</h4>
                    <ul>
                        ${(data.by_payment_method || []).map(pm => `<li>${pm.payment_method}: KES ${parseFloat(pm.total || 0).toFixed(2)} (${pm.count} txns)</li>`).join('')}
                    </ul>
                    <h4>Top Selling Books</h4>
                    <ul>
                        ${(data.top_books || []).map(book => `<li>${book.title} (${book.total_sold} sold, KES ${parseFloat(book.revenue || 0).toFixed(2)})</li>`).join('')}
                    </ul>
                </div>
            `;
        } catch (err) {
            salesReportsDiv.innerHTML = `<div class="card" style="color:#e74c3c;">${err.message}</div>`;
        }
    }

    // Load inventory reports
    async function loadInventoryReports() {
        inventoryReportsDiv.innerHTML = '<div class="card">Loading inventory reports...</div>';
        try {
            const res = await fetch('http://localhost:3000/api/books/reports/low-stock', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to fetch inventory reports');
            inventoryReportsDiv.innerHTML = `
                <div class="card">
                    <h3>Low Stock Books</h3>
                    <ul>
                        ${(data.books || []).map(book => `<li>${book.title} (Stock: ${book.quantity})</li>`).join('')}
                    </ul>
                </div>
            `;
        } catch (err) {
            inventoryReportsDiv.innerHTML = `<div class="card" style="color:#e74c3c;">${err.message}</div>`;
        }
    }

    // Load user performance
    async function loadUserPerformance() {
        userPerformanceDiv.innerHTML = '<div class="card">Loading user performance...</div>';
        try {
            const res = await fetch('http://localhost:3000/api/admin/cashier-performance', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to fetch user performance');
            userPerformanceDiv.innerHTML = `
                <div class="card">
                    <h3>Cashier Performance</h3>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr style="background:#2a5298;color:#fff;">
                            <th>Name</th><th>Transactions</th><th>Total Revenue</th><th>Total Sales</th>
                        </tr>
                        ${(data.data || []).map(row => `
                            <tr style="border-bottom:1px solid #eee;">
                                <td>${row.name}</td>
                                <td>${row.transactions}</td>
                                <td>KES ${parseFloat(row.total_revenue || 0).toFixed(2)}</td>
                                <td>KES ${parseFloat(row.total_sales || 0).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            `;
        } catch (err) {
            userPerformanceDiv.innerHTML = `<div class="card" style="color:#e74c3c;">${err.message}</div>`;
        }
    }

    // Initial load
    loadSalesReports();
    loadInventoryReports();
    loadUserPerformance();
});
