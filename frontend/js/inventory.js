// JS for admin-inventory.html bulk upload

document.addEventListener('DOMContentLoaded', () => {
    const bulkUploadBtn = document.getElementById('bulk-upload-btn');
    const inventoryList = document.getElementById('inventory-list');
    if (!bulkUploadBtn) return;

    bulkUploadBtn.onclick = () => {
        inventoryList.innerHTML = `
            <div class="card" style="max-width:600px;">
                <h3>Bulk Upload Books</h3>
                <form id="bulk-upload-form">
                    <input type="file" id="csvFile" accept=".csv" required style="margin-bottom:12px;">
                    <button type="submit">Upload CSV</button>
                    <div id="bulk-upload-error" style="color:#e74c3c;margin-top:8px;display:none;"></div>
                </form>
                <p style="margin-top:16px;color:#888;font-size:0.95rem;">CSV format: title,author,isbn,price,quantity</p>
            </div>
        `;
        const form = document.getElementById('bulk-upload-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('csvFile');
            const errorDiv = document.getElementById('bulk-upload-error');
            errorDiv.style.display = 'none';
            if (!fileInput.files.length) {
                errorDiv.textContent = 'Please select a CSV file.';
                errorDiv.style.display = 'block';
                return;
            }
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                const csv = event.target.result;
                // Parse CSV
                const rows = csv.split('\n').map(row => row.trim()).filter(row => row);
                const books = [];
                for (let i = 0; i < rows.length; i++) {
                    const cols = rows[i].split(',');
                    if (cols.length < 5) {
                        errorDiv.textContent = `Row ${i+1} is invalid.`;
                        errorDiv.style.display = 'block';
                        return;
                    }
                    books.push({
                        title: cols[0],
                        author: cols[1],
                        isbn: cols[2],
                        price: parseFloat(cols[3]),
                        quantity: parseInt(cols[4])
                    });
                }
                // Send to backend
                const token = localStorage.getItem('pos_token');
                try {
                    const res = await fetch('http://localhost:3000/api/books/bulk', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({ books })
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success) {
                        throw new Error(data.message || 'Bulk upload failed');
                    }
                    alert('Bulk upload successful!');
                    inventoryList.innerHTML = '';
                } catch (err) {
                    errorDiv.textContent = err.message;
                    errorDiv.style.display = 'block';
                }
            };
            reader.readAsText(file);
        };
    };
});
