document.addEventListener('DOMContentLoaded', () => {

    // ===============================
    // GLOBAL VARIABLES
    // ===============================
    const token = localStorage.getItem('pos_token');
    const user = JSON.parse(localStorage.getItem('pos_user'));

    const productsSection = document.getElementById('products-section');
    const cartItems = document.getElementById('cart-items');
    const totalSpan = document.getElementById('total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const searchBar = document.getElementById('search-bar');

    const adminPanelBtn = document.getElementById('admin-panel-btn');
    const adminPanel = document.getElementById('admin-panel');
    const manageUsersBtn = document.getElementById('manage-users-btn');
    const viewReportsBtn = document.getElementById('view-reports-btn');
    const manageBooksBtn = document.getElementById('manage-books-btn');
    const addBookBtn = document.getElementById('add-book-btn');
    const adminContent = document.getElementById('admin-content');

    let products = [];
    let cart = [];

    // ===============================
    // CHECK AUTHENTICATION
    // ===============================
    if (!token || !user) {
        alert('Please log in first');
        window.location.href = 'login.html';
        return;
    }

    // ===============================
    // FETCH PRODUCTS
    // ===============================
    async function fetchProducts(search = '') {
        try {
            const res = await fetch(`http://localhost:3000/api/books?search=${search}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (!res.ok) {
                if (res.status === 401) {
                    alert('Session expired. Please log in again.');
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error('Failed to fetch products');
            }

            const data = await res.json();
            products = data.books || [];
            renderProducts();
        } catch (err) {
            console.error(err);
            alert('Error loading products: ' + err.message);
        }
    }

    function renderProducts() {
        if (!productsSection) return;
        productsSection.innerHTML = '';

        if (products.length === 0) {
            productsSection.innerHTML = '<p style="width:100%;text-align:center;color:#888;">No products found</p>';
            return;
        }

        products.forEach(product => {
            const div = document.createElement('div');
            div.className = 'product';

            div.innerHTML = `
                <h3>${product.title}</h3>
                <p>Author: ${product.author || 'N/A'}</p>
                <p>ISBN: ${product.isbn || 'N/A'}</p>
                <p>Price: KES ${parseFloat(product.price).toFixed(2)}</p>
                <p>Stock: ${product.quantity}</p>
                <button data-book-id="${product.book_id}">Add to Cart</button>
            `;

            div.querySelector('button').onclick = () => addToCart(product.book_id);
            productsSection.appendChild(div);
        });
    }

    // ===============================
    // ADD TO CART
    // ===============================
    function addToCart(book_id) {
        const product = products.find(p => p.book_id === book_id);
        if (!product) return;

        const cartItem = cart.find(item => item.book_id === book_id);

        if (cartItem) {
            if (cartItem.quantity < product.quantity) {
                cartItem.quantity++;
            } else {
                alert("Not enough stock available.");
                return;
            }
        } else {
            if (product.quantity > 0) {
                cart.push({ ...product, quantity: 1 });
            } else {
                alert("Product out of stock.");
                return;
            }
        }

        renderCart();
    }

    // ===============================
    // REMOVE FROM CART
    // ===============================
    function removeFromCart(book_id) {
        const index = cart.findIndex(item => item.book_id === book_id);
        if (index !== -1) {
            cart.splice(index, 1);
            renderCart();
        }
    }

    // ===============================
    // UPDATE CART QUANTITY
    // ===============================
    function updateCartQuantity(book_id, delta) {
        const cartItem = cart.find(item => item.book_id === book_id);
        const product = products.find(p => p.book_id === book_id);
        
        if (!cartItem || !product) return;

        const newQuantity = cartItem.quantity + delta;

        if (newQuantity <= 0) {
            removeFromCart(book_id);
        } else if (newQuantity <= product.quantity) {
            cartItem.quantity = newQuantity;
            renderCart();
        } else {
            alert("Not enough stock available.");
        }
    }

    // ===============================
    // RENDER CART
    // ===============================
    function renderCart() {
        if (!cartItems || !totalSpan) return;

        cartItems.innerHTML = '';
        let total = 0;

        if (cart.length === 0) {
            cartItems.innerHTML = '<li style="text-align:center;color:#888;">Cart is empty</li>';
            totalSpan.textContent = '0.00';
            return;
        }

        cart.forEach(item => {
            total += item.price * item.quantity;

            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <strong>${item.title}</strong><br>
                    <span style="font-size:0.85rem;color:#666;">KES ${parseFloat(item.price).toFixed(2)} × ${item.quantity}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <button class="cart-qty-btn" data-book-id="${item.book_id}" data-delta="-1" 
                            style="background:#e74c3c;color:#fff;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;">−</button>
                    <span style="font-weight:600;min-width:30px;text-align:center;">${item.quantity}</span>
                    <button class="cart-qty-btn" data-book-id="${item.book_id}" data-delta="1" 
                            style="background:#27ae60;color:#fff;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;">+</button>
                    <button class="cart-remove-btn" data-book-id="${item.book_id}" 
                            style="background:#95a5a6;color:#fff;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;margin-left:8px;">✕</button>
                </div>
            `;
            cartItems.appendChild(li);
        });

        totalSpan.textContent = total.toFixed(2);
    }

    // ===============================
    // EVENT DELEGATION FOR CART BUTTONS
    // ===============================
    if (cartItems) {
        cartItems.addEventListener('click', (e) => {
            if (e.target.classList.contains('cart-qty-btn')) {
                const bookId = parseInt(e.target.dataset.bookId);
                const delta = parseInt(e.target.dataset.delta);
                updateCartQuantity(bookId, delta);
            } else if (e.target.classList.contains('cart-remove-btn')) {
                const bookId = parseInt(e.target.dataset.bookId);
                removeFromCart(bookId);
            }
        });
    }

    // ===============================
    // CHECKOUT
    // ===============================
    if (checkoutBtn) {
        checkoutBtn.onclick = async () => {

            if (cart.length === 0) {
                alert('Cart is empty');
                return;
            }

            // Disable checkout button during processing
            checkoutBtn.disabled = true;
            checkoutBtn.textContent = 'Processing...';

            try {
                const res = await fetch('http://localhost:3000/api/sales', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        user_id: user.user_id,
                        payment_method: 'CASH',
                        items: cart.map(item => ({
                            book_id: item.book_id,
                            quantity: item.quantity
                        }))
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.message || 'Sale failed');
                }

                if (data.success) {
                    if (data.sale) showReceipt(data.sale);
                    cart = [];
                    renderCart();
                    fetchProducts(); // Refresh product list to update stock
                    alert('Sale completed successfully!');
                } else {
                    alert(data.message || 'Sale failed');
                }

            } catch (err) {
                console.error(err);
                alert('Checkout error: ' + err.message);
            } finally {
                // Re-enable checkout button
                checkoutBtn.disabled = false;
                checkoutBtn.textContent = 'Checkout';
            }
        };
    }

    // ===============================
    // RECEIPT MODAL
    // ===============================
    function showReceipt(sale) {
        const modal = document.getElementById('receipt-modal');
        const htmlDiv = document.getElementById('receipt-html');
        if (!modal || !htmlDiv) return;

        let html = `
            <h2 style="text-align:center;margin-bottom:20px;">📚 Bookshop Receipt</h2>
            <div style="border-bottom:2px solid #2a5298;padding-bottom:12px;margin-bottom:12px;">
                <p><b>Date:</b> ${new Date(sale.sale_date).toLocaleString()}</p>
                <p><b>Cashier:</b> ${sale.username}</p>
                <p><b>Transaction ID:</b> ${sale.sale_id}</p>
            </div>
        `;
        
        html += `<table style="width:100%;border-collapse:collapse;margin:16px 0;">`;
        html += `<tr><th>Title</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>`;

        sale.items.forEach(item => {
            html += `
                <tr>
                    <td>${item.title}</td>
                    <td style="text-align:center;">${item.quantity}</td>
                    <td style="text-align:right;">KES ${parseFloat(item.unit_price).toFixed(2)}</td>
                    <td style="text-align:right;">KES ${parseFloat(item.subtotal).toFixed(2)}</td>
                </tr>
            `;
        });

        html += `</table>`;
        html += `
            <div style="border-top:2px solid #2a5298;padding-top:12px;margin-top:12px;">
                <p style="font-size:1.2rem;"><b>Total:</b> <span style="color:#2a5298;font-size:1.4rem;">KES ${parseFloat(sale.total_amount).toFixed(2)}</span></p>
                <p><b>Payment Method:</b> ${sale.payment_method}</p>
            </div>
            <p style="text-align:center;margin-top:20px;color:#888;font-size:0.9rem;">Thank you for your purchase!</p>
        `;

        htmlDiv.innerHTML = html;
        modal.style.display = 'flex';
    }

    const closeReceipt = document.getElementById('close-receipt');
    if (closeReceipt) {
        closeReceipt.onclick = () => {
            document.getElementById('receipt-modal').style.display = 'none';
        };
    }

    const printReceipt = document.getElementById('print-receipt');
    if (printReceipt) {
        printReceipt.onclick = () => {
            window.print();
        };
    }

    const downloadReceipt = document.getElementById('download-receipt');
    if (downloadReceipt) {
        downloadReceipt.onclick = () => {
            alert('PDF download feature coming soon!');
            // TODO: Implement PDF generation using jsPDF or similar library
        };
    }

    // ===============================
    // ADMIN PANEL
    // ===============================
    if (user?.role?.toUpperCase() === 'ADMIN') {
        if (adminPanelBtn) adminPanelBtn.style.display = '';
    }

    if (adminPanelBtn && adminPanel) {
        adminPanelBtn.onclick = () => {
            adminPanel.style.display = adminPanel.style.display === 'none' ? 'block' : 'none';
        };
    }

    // ===============================
    // LOAD USERS (ADMIN)
    // ===============================
    async function loadUsers() {
        if (!adminContent) return;

        adminContent.innerHTML = '<p>Loading users...</p>';

        try {
            const res = await fetch('http://localhost:3000/api/users', {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (!res.ok) throw new Error('Failed to fetch users');

            const data = await res.json();

            if (!data.success) throw new Error(data.message);

            adminContent.innerHTML = `
                <h3>User Management</h3>
                <ul>
                    ${data.users.map(u => `
                        <li>
                            <div>
                                <strong>${u.username}</strong> 
                                <span style="background:#2a5298;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.85rem;margin-left:8px;">${u.role}</span>
                                <span style="color:${u.is_active ? 'green' : 'red'};font-weight:bold;margin-left:8px;">
                                    ${u.is_active ? '● Active' : '○ Inactive'}
                                </span>
                            </div>
                            ${u.role === 'CASHIER' ? `
                                <button class="toggle-user-btn"
                                    data-id="${u.user_id}"
                                    data-active="${u.is_active}">
                                    ${u.is_active ? 'Deactivate' : 'Activate'}
                                </button>` : ''}
                        </li>
                    `).join('')}
                </ul>
            `;

            // Add event listeners for toggle buttons
            document.querySelectorAll('.toggle-user-btn').forEach(btn => {
                btn.onclick = () => toggleUserStatus(btn.dataset.id, btn.dataset.active === 'true');
            });

        } catch (err) {
            console.error(err);
            adminContent.innerHTML = '<p style="color:#e74c3c;">Error loading users: ' + err.message + '</p>';
        }
    }

    // ===============================
    // TOGGLE USER STATUS
    // ===============================
    async function toggleUserStatus(userId, isActive) {
        try {
            const res = await fetch(`http://localhost:3000/api/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ is_active: !isActive })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to update user status');
            }

            alert('User status updated successfully');
            loadUsers(); // Refresh the user list
        } catch (err) {
            console.error(err);
            alert('Error updating user: ' + err.message);
        }
    }

    // ===============================
    // VIEW REPORTS (ADMIN)
    // ===============================
    async function loadReports() {
        if (!adminContent) return;

        adminContent.innerHTML = '<p>Loading sales reports...</p>';

        try {
            const res = await fetch('http://localhost:3000/api/reports/sales', {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (!res.ok) throw new Error('Failed to fetch reports');

            const data = await res.json();

            if (!data.success) throw new Error(data.message);

            adminContent.innerHTML = `
                <h3>Sales Reports</h3>
                <div style="background:#f8f9fa;padding:16px;border-radius:8px;margin-bottom:16px;">
                    <p><strong>Total Sales:</strong> KES ${parseFloat(data.totalSales || 0).toFixed(2)}</p>
                    <p><strong>Total Transactions:</strong> ${data.totalTransactions || 0}</p>
                </div>
                <h4>Recent Transactions</h4>
                <table style="width:100%;border-collapse:collapse;">
                    <tr style="background:#2a5298;color:#fff;">
                        <th style="padding:10px;text-align:left;">Date</th>
                        <th style="padding:10px;text-align:left;">Cashier</th>
                        <th style="padding:10px;text-align:right;">Amount</th>
                        <th style="padding:10px;text-align:left;">Payment</th>
                    </tr>
                    ${(data.recentSales || []).map(sale => `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:8px;">${new Date(sale.sale_date).toLocaleString()}</td>
                            <td style="padding:8px;">${sale.username}</td>
                            <td style="padding:8px;text-align:right;">KES ${parseFloat(sale.total_amount).toFixed(2)}</td>
                            <td style="padding:8px;">${sale.payment_method}</td>
                        </tr>
                    `).join('')}
                </table>
            `;

        } catch (err) {
            console.error(err);
            adminContent.innerHTML = '<p style="color:#e74c3c;">Error loading reports: ' + err.message + '</p>';
        }
    }

    // ===============================
    // MANAGE BOOKS (ADMIN)
    // ===============================
    async function loadManageBooks() {
        if (!adminContent) return;

        adminContent.innerHTML = '<p>Loading books...</p>';

        try {
            const res = await fetch('http://localhost:3000/api/books', {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (!res.ok) throw new Error('Failed to fetch books');

            const data = await res.json();

            if (!data.success) throw new Error(data.message);

            adminContent.innerHTML = `
                <h3>Book Inventory</h3>
                <table style="width:100%;border-collapse:collapse;">
                    <tr style="background:#2a5298;color:#fff;">
                        <th style="padding:10px;text-align:left;">Title</th>
                        <th style="padding:10px;text-align:left;">Author</th>
                        <th style="padding:10px;text-align:left;">ISBN</th>
                        <th style="padding:10px;text-align:right;">Price</th>
                        <th style="padding:10px;text-align:center;">Stock</th>
                        <th style="padding:10px;text-align:center;">Actions</th>
                    </tr>
                    ${(data.books || []).map(book => `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:8px;">${book.title}</td>
                            <td style="padding:8px;">${book.author || 'N/A'}</td>
                            <td style="padding:8px;">${book.isbn || 'N/A'}</td>
                            <td style="padding:8px;text-align:right;">KES ${parseFloat(book.price).toFixed(2)}</td>
                            <td style="padding:8px;text-align:center;">${book.quantity}</td>
                            <td style="padding:8px;text-align:center;">
                                <button class="admin-btn" style="padding:4px 8px;font-size:0.85rem;" 
                                        onclick="alert('Edit feature coming soon')">Edit</button>
                            </td>
                        </tr>
                    `).join('')}
                </table>
            `;

        } catch (err) {
            console.error(err);
            adminContent.innerHTML = '<p style="color:#e74c3c;">Error loading books: ' + err.message + '</p>';
        }
    }

    // ===============================
    // ADD BOOK FORM (ADMIN)
    // ===============================
    function showAddBookForm() {
        if (!adminContent) return;

        adminContent.innerHTML = `
            <h3>Add New Book</h3>
            <form id="add-book-form" style="max-width:500px;">
                <div style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:4px;font-weight:600;">Title *</label>
                    <input type="text" id="book-title" required style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;">
                </div>
                <div style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:4px;font-weight:600;">Author</label>
                    <input type="text" id="book-author" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;">
                </div>
                <div style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:4px;font-weight:600;">ISBN</label>
                    <input type="text" id="book-isbn" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;">
                </div>
                <div style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:4px;font-weight:600;">Price (KES) *</label>
                    <input type="number" id="book-price" required min="0" step="0.01" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;">
                </div>
                <div style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:4px;font-weight:600;">Quantity *</label>
                    <input type="number" id="book-quantity" required min="0" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;">
                </div>
                <button type="submit" class="admin-btn">Add Book</button>
                <button type="button" class="admin-btn" style="background:#95a5a6;" onclick="document.getElementById('admin-content').innerHTML=''">Cancel</button>
            </form>
        `;

        document.getElementById('add-book-form').onsubmit = async (e) => {
            e.preventDefault();
            
            const bookData = {
                title: document.getElementById('book-title').value,
                author: document.getElementById('book-author').value,
                isbn: document.getElementById('book-isbn').value,
                price: parseFloat(document.getElementById('book-price').value),
                quantity: parseInt(document.getElementById('book-quantity').value)
            };

            try {
                const res = await fetch('http://localhost:3000/api/books', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify(bookData)
                });

                const data = await res.json();

                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'Failed to add book');
                }

                alert('Book added successfully!');
                fetchProducts(); // Refresh product list
                adminContent.innerHTML = '';
            } catch (err) {
                console.error(err);
                alert('Error adding book: ' + err.message);
            }
        };
    }

    // ===============================
    // ADMIN BUTTON HANDLERS
    // ===============================
    if (manageUsersBtn) {
        manageUsersBtn.onclick = loadUsers;
    }

    if (viewReportsBtn) {
        viewReportsBtn.onclick = loadReports;
    }

    if (manageBooksBtn) {
        manageBooksBtn.onclick = loadManageBooks;
    }

    if (addBookBtn) {
        addBookBtn.onclick = showAddBookForm;
    }

    // ===============================
    // SEARCH
    // ===============================
    if (searchBar) {
        let searchTimeout;
        searchBar.addEventListener('input', e => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                fetchProducts(e.target.value);
            }, 300); // Debounce search by 300ms
        });
    }

    // ===============================
    // LOGOUT
    // ===============================
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            // Simple logout without confirmation
            localStorage.removeItem('pos_token');
            localStorage.removeItem('pos_user');
            window.location.href = 'login.html';
        };
    }

    // ===============================
    // INITIAL LOAD
    // ===============================
    fetchProducts();

});