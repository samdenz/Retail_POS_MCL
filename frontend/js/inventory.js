// JS for admin-inventory.html bulk upload

document.addEventListener('DOMContentLoaded', () => {
    const bulkUploadBtn = document.getElementById('bulk-upload-btn');
    const addBookBtn = document.getElementById('add-book-btn');
    const inventoryList = document.getElementById('inventory-list');
    if (bulkUploadBtn) {
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
    }

    if (addBookBtn) {
        addBookBtn.onclick = () => {
            inventoryList.innerHTML = `
                <div class="card" style="max-width:400px;">
                    <h3>Add Book</h3>
                    <form id="add-book-form">
                        <input type="text" id="book-title" placeholder="Title" required style="margin-bottom:8px;width:100%;"><br>
                        <input type="text" id="book-author" placeholder="Author" required style="margin-bottom:8px;width:100%;"><br>
                        <input type="text" id="book-isbn" placeholder="ISBN" required style="margin-bottom:8px;width:100%;"><br>
                        <input type="number" id="book-price" placeholder="Price" required min="0" step="0.01" style="margin-bottom:8px;width:100%;"><br>
                        <input type="number" id="book-quantity" placeholder="Quantity" required min="1" step="1" style="margin-bottom:8px;width:100%;"><br>
                        <button type="submit">Add Book</button>
                        <div id="add-book-error" style="color:#e74c3c;margin-top:8px;display:none;"></div>
                    </form>
                </div>
            `;
            const form = document.getElementById('add-book-form');
            form.onsubmit = async (e) => {
                e.preventDefault();
                const title = document.getElementById('book-title').value.trim();
                const author = document.getElementById('book-author').value.trim();
                const isbn = document.getElementById('book-isbn').value.trim();
                const price = parseFloat(document.getElementById('book-price').value);
                const quantity = parseInt(document.getElementById('book-quantity').value);
                const errorDiv = document.getElementById('add-book-error');
                errorDiv.style.display = 'none';
                if (!title || !author || !isbn || isNaN(price) || isNaN(quantity)) {
                    errorDiv.textContent = 'Please fill in all fields correctly.';
                    errorDiv.style.display = 'block';
                    return;
                }
                const token = localStorage.getItem('pos_token');
                try {
                    const res = await fetch('http://localhost:3000/api/books', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({ title, author, isbn, price, quantity })
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success) {
                        throw new Error(data.message || 'Failed to add book');
                    }
                    alert('Book added successfully!');
                    inventoryList.innerHTML = '';
                } catch (err) {
                    errorDiv.textContent = err.message;
                    errorDiv.style.display = 'block';
                }
            };
        };
    }
});
