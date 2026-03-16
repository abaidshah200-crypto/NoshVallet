// app.js - NoshVallet Interactions and Logic

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Auth Check ---
    const currentUser = JSON.parse(sessionStorage.getItem('noshValletAuth'));
    
    if (!currentUser) {
        // Not logged in, redirect to landing page
        window.location.href = 'index.html';
        return;
    }
    // Build the user profile header since we are guaranteed logged in
    const authActionsContainer = document.getElementById('auth-actions-container');
    if (authActionsContainer) {
        // Clear buttons but preserve the notification-wrapper
        const notifWrapper = authActionsContainer.querySelector('.notification-wrapper');
        authActionsContainer.innerHTML = '';
        if (notifWrapper) authActionsContainer.appendChild(notifWrapper);
        
        authActionsContainer.insertAdjacentHTML('beforeend', `
            <div class="user-profile">
                <div class="avatar-small"><i class="fa-solid fa-user"></i></div>
                <span class="user-name">${currentUser.name}</span>
            </div>
        `);
    }
    
    // Update other UI elements that need user info
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => el.textContent = currentUser.name);
    
    const walletIdElements = document.querySelectorAll('.wallet-id');
    walletIdElements.forEach(el => el.textContent = 'ID: ' + currentUser.walletId);
    
    // Handle Logout
    const logoutBtn = document.querySelector('.nav-item.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('noshValletAuth');
            window.location.href = 'index.html'; // Redirect to landing
        });
    }

    // --- State Management ---
    let state = {
        balance: 0.00,
        transactions: [],
        notifications: []
    };

    // Load state from localStorage on startup
    function loadState() {
        const savedState = localStorage.getItem('noshValletState');
        if (savedState) {
            state = JSON.parse(savedState);
            // Ensure notifications exist in old states
            if (!state.notifications) state.notifications = [];
        } else { // Seed some dummy data for first time view
            state.balance = 1500.50;
            state.transactions = [
                {
                    id: generateId(),
                    type: 'deposit',
                    title: 'Added via Card',
                    date: new Date(Date.now() - 86400000).toISOString(),
                    amount: 2000.00
                },
                {
                    id: generateId(),
                    type: 'withdraw',
                    title: 'Payment to Daraz',
                    date: new Date(Date.now() - 43200000).toISOString(),
                    amount: 499.50
                }
            ];
            state.notifications = [
                {
                    id: generateId(),
                    title: 'Welcome to NoshVallet!',
                    message: 'Thanks for joining. Explore your new premium wallet.',
                    date: new Date().toISOString(),
                    type: 'info',
                    unread: true
                }
            ];
            saveState();
        }
    }

    // Save state to localStorage
    function saveState() {
        localStorage.setItem('noshValletState', JSON.stringify(state));
        updateUI();
    }

    // Helper to generate simple unique ID
    function generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // Format currency
    function formatCurrency(amount) {
        return amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Format Date string
    function formatDate(dateString) {
        const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    function timeAgo(dateString) {
        const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return formatDate(dateString);
    }

    function addNotification(title, message, type = 'info') {
        state.notifications.unshift({
            id: generateId(),
            title,
            message,
            date: new Date().toISOString(),
            type,
            unread: true
        });
        if (state.notifications.length > 10) state.notifications.pop();
        saveState();
    }


    // --- UI Update Logic ---
    
    // Elements
    const balanceEl = document.getElementById('total-balance');
    const transactionsContainer = document.getElementById('transactions-container');

    function updateUI() {
        // Update Balance
        balanceEl.textContent = formatCurrency(state.balance);

        // Update Transactions List
        renderTransactions();

        // Update Notifications
        renderNotifications();
        
        // Update Side Views if active
        renderFullTransactions();
        renderAnalytics();
        updateSettingsUI();
    }

    function renderFullTransactions() {
        const fullContainer = document.getElementById('full-transactions-container');
        const searchInput = document.getElementById('tx-search');
        const typeFilter = document.getElementById('tx-filter');
        if (!fullContainer) return;

        let filtered = [...state.transactions];
        
        // Search
        if (searchInput && searchInput.value) {
            const query = searchInput.value.toLowerCase();
            filtered = filtered.filter(tx => tx.title.toLowerCase().includes(query) || tx.id.toLowerCase().includes(query));
        }

        // Filter
        if (typeFilter && typeFilter.value !== 'all') {
            filtered = filtered.filter(tx => tx.type === typeFilter.value);
        }

        fullContainer.innerHTML = '';
        if (filtered.length === 0) {
            fullContainer.innerHTML = '<tr><td colspan="4" class="text-center p-4">No matching transactions found</td></tr>';
            return;
        }

        // Sort newest first
        filtered.sort((a,b) => new Date(b.date) - new Date(a.date));

        filtered.forEach(tx => {
            const isDeposit = tx.type === 'deposit';
            const amountClass = isDeposit ? 'positive' : 'negative';
            const amountPrefix = isDeposit ? '+' : '-';

            fullContainer.insertAdjacentHTML('beforeend', `
                <tr>
                    <td><strong>${tx.title}</strong></td>
                    <td class="text-muted">${formatDate(tx.date)}</td>
                    <td><code class="t-ref">${tx.id.toUpperCase()}</code></td>
                    <td class="text-right ${amountClass}">${amountPrefix} Rs. ${formatCurrency(tx.amount)}</td>
                </tr>
            `);
        });
    }

    function renderAnalytics() {
        const incomeVal = document.getElementById('total-income-val');
        const expenseVal = document.getElementById('total-expense-val');
        if (!incomeVal || !expenseVal) return;

        const totalIncome = state.transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = state.transactions.filter(t => t.type === 'withdraw').reduce((sum, t) => sum + t.amount, 0);

        incomeVal.textContent = `Rs. ${formatCurrency(totalIncome)}`;
        expenseVal.textContent = `Rs. ${formatCurrency(totalExpense)}`;

        // Update dummy bars (just a visual trick)
        const bars = document.querySelectorAll('.bar');
        if (bars.length >= 2) {
            const max = Math.max(totalIncome, totalExpense) || 1;
            bars[0].style.height = `${(totalIncome / max) * 100}%`;
            bars[1].style.height = `${(totalExpense / max) * 100}%`;
        }
    }

    function updateSettingsUI() {
        // Update all email displays
        document.querySelectorAll('.user-email').forEach(el => el.textContent = currentUser.email);
        
        const emailDisplayInput = document.getElementById('settings-email-display');
        if (emailDisplayInput) emailDisplayInput.value = currentUser.email;
        
        const settingsNameInput = document.getElementById('settings-name');
        if (settingsNameInput && !settingsNameInput.value) {
             settingsNameInput.placeholder = currentUser.name;
        }

        // Ensure wallet IDs are synced
        document.querySelectorAll('.wallet-id').forEach(el => el.textContent = 'ID: ' + currentUser.walletId);
    }

    function renderNotifications() {
        const notifBadge = document.getElementById('notif-badge');
        const notifList = document.getElementById('notif-list');
        if (!notifBadge || !notifList) return;

        const unreadCount = state.notifications.filter(n => n.unread).length;
        notifBadge.textContent = unreadCount;
        notifBadge.style.display = unreadCount > 0 ? 'flex' : 'none';

        if (state.notifications.length === 0) {
            notifList.innerHTML = `
                <div class="notif-empty">
                    <i class="fa-regular fa-bell-slash"></i>
                    <p>No notifications yet</p>
                </div>
            `;
            return;
        }

        notifList.innerHTML = '';
        state.notifications.forEach(n => {
            const item = document.createElement('div');
            item.className = `notif-item ${n.unread ? 'unread' : ''}`;
            item.innerHTML = `
                <div class="notif-icon ${n.type === 'success' ? 'success' : 'info'}">
                    <i class="fa-solid ${n.type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}"></i>
                </div>
                <div class="notif-content">
                    <p><strong>${n.title}</strong><br>${n.message}</p>
                    <span class="notif-time">${timeAgo(n.date)}</span>
                </div>
            `;
            item.onclick = (e) => {
                e.stopPropagation();
                n.unread = false;
                saveState();
            };
            notifList.appendChild(item);
        });
    }

    function renderTransactions() {
        transactionsContainer.innerHTML = '';
        
        // Filter for last 3 days (72 hours)
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
        const recentOnly = state.transactions.filter(tx => new Date(tx.date).getTime() >= threeDaysAgo);

        if (recentOnly.length === 0) {
            transactionsContainer.innerHTML = `
                <tr>
                    <td colspan="4">
                        <div class="empty-state">
                            <i class="fa-solid fa-clock-rotate-left"></i>
                            <p>No activity in the last 3 days</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Sort by newest first
        const sortedDesc = [...recentOnly].sort((a,b) => new Date(b.date) - new Date(a.date));

        sortedDesc.forEach(tx => {
            const isDeposit = tx.type === 'deposit';
            const iconClass = isDeposit ? 'deposit' : 'withdraw';
            const iconFa = isDeposit ? 'fa-arrow-down' : 'fa-arrow-up';
            const amountPrefix = isDeposit ? '+' : '-';
            const amountClass = isDeposit ? 'positive' : 'negative';

            const txHTML = `
                <tr>
                    <td>
                        <div class="t-details">
                            <div class="t-icon ${iconClass}"><i class="fa-solid ${iconFa}"></i></div>
                            <div>
                                <div class="t-title">${tx.title}</div>
                            </div>
                        </div>
                    </td>
                    <td class="t-date">${formatDate(tx.date)}</td>
                    <td><span class="t-ref">REF-${tx.id.toUpperCase()}</span></td>
                    <td class="text-right t-amt ${amountClass}">${amountPrefix} Rs. ${formatCurrency(tx.amount)}</td>
                </tr>
            `;
            transactionsContainer.insertAdjacentHTML('beforeend', txHTML);
        });
    }


    // --- Modal and Interaction Logic ---

    // Modals
    const depositModal = document.getElementById('deposit-modal');
    const withdrawModal = document.getElementById('withdraw-modal');
    const sendModal = document.getElementById('send-modal');
    const payModal = document.getElementById('pay-modal');
    const transferModal = document.getElementById('transfer-modal');
    
    // Buttons
    const btnDeposit = document.getElementById('btn-deposit');
    const btnWithdraw = document.getElementById('btn-withdraw');
    const btnSend = document.getElementById('btn-send');
    const btnPay = document.getElementById('btn-pay');
    const btnTransfer = document.getElementById('btn-transfer');
    const closeBtns = document.querySelectorAll('.close-btn');

    // Forms
    const depositForm = document.getElementById('deposit-form');
    const depositInput = document.getElementById('deposit-amount');
    const withdrawForm = document.getElementById('withdraw-form');
    const withdrawInput = document.getElementById('withdraw-amount');
    const sendForm = document.getElementById('send-form');
    const sendInput = document.getElementById('send-amount');
    const sendRecipient = document.getElementById('send-recipient');
    const payForm = document.getElementById('pay-form');
    const payInput = document.getElementById('pay-amount');
    const payMerchant = document.getElementById('pay-merchant');
    
    const transferForm = document.getElementById('transfer-form');
    const transferMethod = document.getElementById('transfer-method');
    const transferAccount = document.getElementById('transfer-account');
    const transferAmount = document.getElementById('transfer-amount');
    const transferLabel = document.getElementById('transfer-label');
    
    // Quick Amounts
    const quickBtns = document.querySelectorAll('.quick-btn');

    // Open Modals
    if (btnTransfer) {
        btnTransfer.addEventListener('click', () => {
            transferAccount.value = '';
            transferAmount.value = '';
            transferMethod.selectedIndex = 0;
            transferModal.classList.add('show');
        });
    }

    if (transferMethod) {
        transferMethod.addEventListener('change', (e) => {
            const method = e.target.value;
            if (method === 'Bank Account') {
                transferLabel.textContent = 'Bank Account Number / IBAN';
                transferAccount.placeholder = 'Enter IBAN or Account #';
            } else {
                transferLabel.textContent = `${method} Mobile Number`;
                transferAccount.placeholder = 'e.g. 0300 1234567';
            }
        });
    }

    btnDeposit.addEventListener('click', () => {
        depositInput.value = '';
        depositModal.classList.add('show');
    });

    btnWithdraw.addEventListener('click', () => {
        withdrawInput.value = '';
        withdrawModal.classList.add('show');
    });

    btnSend.addEventListener('click', () => {
        sendInput.value = '';
        sendRecipient.value = '';
        sendModal.classList.add('show');
    });

    btnPay.addEventListener('click', () => {
        payInput.value = '';
        payMerchant.selectedIndex = 0;
        payModal.classList.add('show');
    });

    // Close Modals
    closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
            } else {
                // Fallback in case e.target is the icon
                const parentModal = btn.closest('.modal');
                if (parentModal) parentModal.classList.remove('show');
            }
        });
    });

    // Close when clicking outside content
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });

    // Quick deposit buttons
    quickBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const amount = parseFloat(e.target.dataset.amount);
            depositInput.value = amount;
            depositInput.focus();
        });
    });

    // Handle Forms
    depositForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(depositInput.value);
        if (amount > 0) {
            state.balance += amount;
            state.transactions.unshift({
                id: generateId(),
                type: 'deposit',
                title: 'Top-up via Bank/Card',
                date: new Date().toISOString(),
                amount: amount
            });
            saveState();
            depositModal.classList.remove('show');
            showToast('Deposit Successful!');
            addNotification('Deposit Successful', `Rs. ${formatCurrency(amount)} has been added to your wallet.`, 'success');
        }
    });

    withdrawForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(withdrawInput.value);
        if (amount > 0) {
            if (amount > state.balance) {
                showToast('Insufficient Balance!', true);
            } else {
                state.balance -= amount;
                state.transactions.unshift({
                    id: generateId(),
                    type: 'withdraw',
                    title: 'Withdraw to Linked Bank',
                    date: new Date().toISOString(),
                    amount: amount
                });
                saveState();
                withdrawModal.classList.remove('show');
                showToast('Withdrawal Processed!');
                addNotification('Withdrawal Processed', `Rs. ${formatCurrency(amount)} has been withdrawn to your bank.`, 'info');
            }
        }
    });

    sendForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(sendInput.value);
        const recipient = sendRecipient.value.trim();
        
        if (amount > 0 && recipient) {
            if (amount > state.balance) {
                showToast('Insufficient Balance!', true);
            } else {
                state.balance -= amount;
                state.transactions.unshift({
                    id: generateId(),
                    type: 'withdraw',
                    title: `Sent to ${recipient}`,
                    date: new Date().toISOString(),
                    amount: amount
                });
                saveState();
                sendModal.classList.remove('show');
                showToast(`Rs. ${formatCurrency(amount)} Sent Successfully!`);
                addNotification('Money Sent', `Successfully sent Rs. ${formatCurrency(amount)} to ${recipient}.`, 'success');
            }
        }
    });

    payForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(payInput.value);
        const merchant = payMerchant.value;
        
        if (amount > 0 && merchant) {
            if (amount > state.balance) {
                showToast('Insufficient Balance!', true);
            } else {
                state.balance -= amount;
                state.transactions.unshift({
                    id: generateId(),
                    type: 'withdraw',
                    title: `Payment: ${merchant}`,
                    date: new Date().toISOString(),
                    amount: amount
                });
                saveState();
                payModal.classList.remove('show');
                showToast(`Payment of Rs. ${formatCurrency(amount)} Done!`);
                addNotification('Payment Successful', `Paid Rs. ${formatCurrency(amount)} to ${merchant}.`, 'success');
            }
        }
    });

    if (transferForm) {
        transferForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = parseFloat(transferAmount.value);
            const method = transferMethod.value;
            const account = transferAccount.value.trim();

            if (amount > 0 && method && account) {
                if (amount > state.balance) {
                    showToast('Insufficient Balance!', true);
                } else {
                    state.balance -= amount;
                    state.transactions.unshift({
                        id: generateId(),
                        type: 'withdraw',
                        title: `Transfer to ${method} (${account})`,
                        date: new Date().toISOString(),
                        amount: amount
                    });
                    saveState();
                    transferModal.classList.remove('show');
                    showToast(`Transfer to ${method} Successful!`);
                    addNotification('External Transfer', `Rs. ${formatCurrency(amount)} sent to ${method} (${account}).`, 'success');
                }
            }
        });
    }

    // --- Toast Notifications ---
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = toast.querySelector('.toast-icon');
    const toastIndicator = toast.querySelector('.toast-indicator');
    let toastTimeout;

    function showToast(message, isError = false) {
        clearTimeout(toastTimeout);
        
        toastMsg.textContent = message;
        
        if (isError) {
            toastIcon.className = 'toast-icon fa-solid fa-circle-exclamation';
            toastIcon.style.color = 'var(--danger)';
            toastIndicator.style.backgroundColor = 'var(--danger)';
        } else {
            toastIcon.className = 'toast-icon fa-solid fa-circle-check';
            toastIcon.style.color = 'var(--success)';
            toastIndicator.style.backgroundColor = 'var(--success)';
        }

        toast.classList.add('show');
        
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }


    // --- Interaction for Notifications ---
    const notifBell = document.getElementById('notif-bell');
    const notifPanel = document.getElementById('notif-panel');
    const markAllRead = document.getElementById('mark-all-read');

    if (notifBell && notifPanel) {
        notifBell.addEventListener('click', (e) => {
            e.stopPropagation();
            notifPanel.classList.toggle('show');
        });

        // Close when clicking outside
        window.addEventListener('click', (e) => {
            if (!notifPanel.contains(e.target) && !notifBell.contains(e.target)) {
                notifPanel.classList.remove('show');
            }
        });
    }

    if (markAllRead) {
        markAllRead.addEventListener('click', (e) => {
            e.stopPropagation();
            state.notifications.forEach(n => n.unread = false);
            saveState();
        });
    }

    // --- Navigation (SPA Logic) ---
    const navItems = document.querySelectorAll('.nav-item:not(.logout)');
    const viewSections = document.querySelectorAll('.view-section');
    const contentBackBtns = document.querySelectorAll('.content-back-btn');

    function showView(viewId) {
        viewSections.forEach(section => section.classList.add('hidden'));
        navItems.forEach(item => item.classList.remove('active'));

        const targetView = document.getElementById(`view-${viewId}`);
        const targetNav = document.getElementById(`nav-${viewId}`);

        if (targetView) targetView.classList.remove('hidden');
        if (targetNav) targetNav.classList.add('active');

        // Scroll to top on view change
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Refresh dynamic content
        if (viewId === 'transactions') renderFullTransactions();
        if (viewId === 'analytics') renderAnalytics();
    }

    contentBackBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (globalSearch) globalSearch.value = ''; // Clear search when going back
            if (txSearch) txSearch.value = '';
            showView('dashboard');
        });
    });

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = item.id.replace('nav-', '');
            showView(viewId);
        });
    });

    // Transaction search/filter events
    const globalSearch = document.getElementById('global-search');
    const txSearch = document.getElementById('tx-search');
    const txFilter = document.getElementById('tx-filter');

    if (globalSearch) {
        globalSearch.addEventListener('input', () => {
            const query = globalSearch.value;
            if (query.trim() === '') {
                showView('dashboard');
            } else {
                // Switch to transactions view if not already there
                showView('transactions');
                // Sync with the dedicated search bar
                if (txSearch) {
                    txSearch.value = query;
                    renderFullTransactions();
                }
            }
        });
    }

    if (txSearch) txSearch.addEventListener('input', (e) => {
        // Sync back to global if needed
        if (globalSearch) globalSearch.value = e.target.value;
        renderFullTransactions();
    });
    if (txFilter) txFilter.addEventListener('change', renderFullTransactions);

    // Settings Form
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newName = document.getElementById('settings-name').value.trim();
            if (newName) {
                currentUser.name = newName;
                sessionStorage.setItem('noshValletAuth', JSON.stringify(currentUser));
                
                // Update specific elements without whole reload
                document.querySelectorAll('.user-name').forEach(el => el.textContent = newName);
                showToast('Profile Updated!');
                addNotification('Profile Update', 'Your dashboard name has been updated successfully.', 'info');
                document.getElementById('settings-name').value = '';
                document.getElementById('settings-name').placeholder = newName;
            }
        });
    }

    // Reset Data
    const btnReset = document.getElementById('btn-reset-data');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all wallet data? This cannot be undone.')) {
                state = {
                    balance: 0.00,
                    transactions: [],
                    notifications: []
                };
                saveState();
                showToast('Wallet Reset Successful');
                addNotification('Wallet Reset', 'All your transaction data has been cleared.', 'info');
            }
        });
    }

    // Copy Wallet ID Interaction
    const copyIdBtn = document.querySelector('.icon-btn-circle[title="Copy ID"]');
    if (copyIdBtn) {
        copyIdBtn.addEventListener('click', () => {
            const walletId = currentUser.walletId;
            navigator.clipboard.writeText(walletId).then(() => {
                showToast('Wallet ID Copied!');
                const icon = copyIdBtn.querySelector('i');
                icon.className = 'fa-solid fa-check';
                setTimeout(() => {
                    icon.className = 'fa-solid fa-copy';
                }, 2000);
            });
        });
    }

    // Sidebar Toggle Logic
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainWrapper = document.querySelector('.main-wrapper');
    const backdrop = document.getElementById('sidebar-backdrop');
    // Re-using the existing navItems declared in the outer scope

    if (menuToggle && sidebar && mainWrapper) {
        // Load initial state (only for desktop)
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (isCollapsed && window.innerWidth > 768) {
            sidebar.classList.add('collapsed');
            mainWrapper.classList.add('full-width');
        }

        menuToggle.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                // Mobile behavior: Toggle overlay
                sidebar.classList.toggle('show-mobile');
                if (backdrop) backdrop.classList.toggle('active');
            } else {
                // Desktop behavior: Toggle collapse
                const nowCollapsed = sidebar.classList.toggle('collapsed');
                mainWrapper.classList.toggle('full-width', nowCollapsed);
                localStorage.setItem('sidebarCollapsed', nowCollapsed);
            }
        });

        // Close sidebar on mobile when clicking backdrop
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                sidebar.classList.remove('show-mobile');
                backdrop.classList.remove('active');
            });
        }

        // Close sidebar on mobile when clicking nav items
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('show-mobile');
                    if (backdrop) backdrop.classList.remove('active');
                }
            });
        });
    }

    // 2FA Modal Logic
    const btnConfigure2FA = document.getElementById('btn-configure-2fa');
    const twoFAModal = document.getElementById('two-fa-modal');
    const close2FAModal = document.getElementById('close-2fa-modal');
    const btnSave2FA = document.getElementById('btn-save-2fa');
    const securityOptions = document.querySelectorAll('.security-opt');

    if (btnConfigure2FA && twoFAModal) {
        btnConfigure2FA.addEventListener('click', () => {
            twoFAModal.classList.add('show');
        });

        if (close2FAModal) {
            close2FAModal.addEventListener('click', () => {
                twoFAModal.classList.remove('show');
            });
        }

        // Handle option selection
        securityOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                securityOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });

        // Save changes simulation
        if (btnSave2FA) {
            btnSave2FA.addEventListener('click', () => {
                const activeOpt = document.querySelector('.security-opt.active .opt-title').textContent;
                btnSave2FA.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
                btnSave2FA.disabled = true;

                setTimeout(() => {
                    twoFAModal.classList.remove('show');
                    showToast(`${activeOpt} enabled successfully!`);
                    
                    btnSave2FA.innerHTML = 'Save Changes';
                    btnSave2FA.disabled = false;
                    
                    // Add notification
                    addNotification('Security Updated', `You have switched your 2FA method to ${activeOpt}.`, 'success');
                }, 1500);
            });
        }

        // Close on clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === twoFAModal) {
                twoFAModal.classList.remove('show');
            }
        });
    }

    // --- Developer Tools: Test Data Injection ---
    function injectTestData(isAuto = false) {
        const randomAmount = Math.floor(Math.random() * 9000) + 1000; // 1000 to 10000
        const testTx = {
            id: generateId(),
            type: 'deposit',
            title: isAuto ? 'Initial Test Credit' : 'Dev-Tool Injection',
            date: new Date().toISOString(),
            amount: randomAmount
        };

        state.balance += randomAmount;
        state.transactions.unshift(testTx);
        
        addNotification(
            isAuto ? 'Test Funds Added' : 'Injection Successful', 
            `Rs. ${formatCurrency(randomAmount)} has been injected into your wallet for testing.`, 
            'success'
        );
        
        saveState();
        showToast(`Rs. ${formatCurrency(randomAmount)} Injected!`);
    }

    const btnInject = document.getElementById('btn-inject-test-data');
    if (btnInject) {
        btnInject.addEventListener('click', () => {
            injectTestData();
        });
    }

    // One-time auto-injection for first-time premium test
    if (!localStorage.getItem('noshValletTestInjected')) {
        setTimeout(() => {
            injectTestData(true);
            localStorage.setItem('noshValletTestInjected', 'true');
        }, 1000); // Slight delay for visual pop
    }

    // --- Password Visibility Toggle ---
    function initializePasswordToggles() {
        const toggleBtns = document.querySelectorAll('.password-toggle');
        
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.parentElement.querySelector('input');
                const icon = btn.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    input.classList.add('password-input'); // Maintain styling
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                } else {
                    input.type = 'password';
                    input.classList.remove('password-input');
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                }
            });
        });
    }

    // --- Initialization ---
    loadState(); // Boot up the app
    updateUI(); // Render the loaded state
    initializePasswordToggles();
});
