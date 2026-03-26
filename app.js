// app.js - NoshWallet Interactions and Logic

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Auth Check ---
    const currentUser = JSON.parse(sessionStorage.getItem('noshWalletAuth'));
    const authActionsContainer = document.getElementById('auth-actions-container');

    if (!currentUser) {
        // Guest mode: Show Guest Profile in header, keep notification wrapper
        if (authActionsContainer) {
            const notifWrapper = authActionsContainer.querySelector('.notification-wrapper');
            authActionsContainer.innerHTML = '';
            if (notifWrapper) authActionsContainer.appendChild(notifWrapper);
            
            authActionsContainer.insertAdjacentHTML('beforeend', `
                <div class="user-profile guest" style="cursor: pointer;">
                    <div class="avatar-small"><i class="fa-solid fa-user"></i></div>
                    <span class="user-name">Guest (Log In)</span>
                </div>
            `);
            
            // Profile icon triggers login modal
            const guestProfile = authActionsContainer.querySelector('.user-profile.guest');
            if (guestProfile) {
                guestProfile.addEventListener('click', () => {
                    const loginModal = document.getElementById('login-modal');
                    if (loginModal) loginModal.classList.add('show');
                });
            }
        }

        
        // Allow sidebar navigation for guests (no forced disable)

        // Hide sensitive dashboard items or show login prompt
        const balanceEl = document.getElementById('total-balance');
        if (balanceEl) balanceEl.textContent = '---';
    } else {
        // Build the user profile header since we are logged in
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
        
        // Update user-specific UI info
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => el.textContent = currentUser.name);
        
        const walletIdElements = document.querySelectorAll('.wallet-id');
        walletIdElements.forEach(el => el.textContent = 'ID: ' + currentUser.walletId);
    }
    
    // Handle Logout
    const logoutBtn = document.querySelector('.nav-item.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('noshWalletAuth');
            window.location.reload(); // Refresh to clear state and show guest view
        });
    }


    // --- State Management ---
    let state = {
        balance: 0.00,
        transactions: [],
        notifications: [],
        savedAccounts: []
    };

    // Load state from localStorage on startup
    function loadState() {
        const savedState = localStorage.getItem('noshWalletState');
        if (savedState) {
            state = JSON.parse(savedState);
            // Ensure notifications exist in old states
            if (!state.notifications) state.notifications = [];
            if (!state.savedAccounts) state.savedAccounts = [];
        } else { // Seed some dummy data for first time view
            state.balance = 2299.00;
            state.transactions = [
                {
                    id: generateId(),
                    type: 'deposit',
                    title: 'Initial Wallet Top-up',
                    date: new Date(Date.now() - 86400000).toISOString(),
                    amount: 2299.00,
                    status: 'Completed'
                }
            ];
            state.savedAccounts = [
                {
                    id: generateId(),
                    bankName: 'HBL Bank',
                    accountNum: '0349****422',
                    holderName: 'User Account',
                    isDefault: true
                }
            ];
            state.notifications = [
                {
                    id: generateId(),
                    title: 'Welcome to NoshWallet!',
                    message: 'Thanks for joining. Your balance is PKR 2,299.00',
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
        localStorage.setItem('noshWalletState', JSON.stringify(state));
        updateUI();
    }

    // --- User Data Management ---
    function getAllUsers() {
        const users = localStorage.getItem('noshWalletUsers');
        return users ? JSON.parse(users) : [];
    }

    function saveAllUsers(users) {
        localStorage.setItem('noshWalletUsers', JSON.stringify(users));
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
        renderSummaryStats();
        renderTransactions();
        renderNotifications();
        
        // Update Side Views if active
        renderFullTransactions();
        renderAnalytics();
        updateSettingsUI();
    }

    function renderFullTransactions() {
        const fullContainer = document.getElementById('full-transactions-container');
        const searchInput = document.getElementById('tx-search');
        const typeFilter = document.getElementById('tx-filter-value');
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
            const status = tx.status || 'Completed';
            const statusClass = status.toLowerCase();

            fullContainer.insertAdjacentHTML('beforeend', `
                <tr>
                    <td><code class="t-ref">${tx.id.toUpperCase()}</code></td>
                    <td><span class="t-type-badge ${tx.type}">${tx.type.toUpperCase()}</span></td>
                    <td><strong>${tx.title}</strong></td>
                    <td class="${amountClass}">${amountPrefix} Rs. ${formatCurrency(tx.amount)}</td>
                    <td><span class="status-badge ${statusClass}">${status}</span></td>
                    <td class="text-right text-muted">${formatDate(tx.date)}</td>
                </tr>
            `);
        });
    }

    function renderSummaryStats() {
        const creditStat = document.getElementById('stat-total-credits');
        const debitStat = document.getElementById('stat-total-debits');
        const recentStat = document.getElementById('stat-recent-count');
        
        if (!creditStat || !debitStat || !recentStat) return;

        const totalCredits = state.transactions
            .filter(t => t.type === 'deposit')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalDebits = state.transactions
            .filter(t => t.type === 'withdraw' || t.type === 'send' || t.type === 'pay')
            .reduce((sum, t) => sum + t.amount, 0);

        // Count for last 3 days
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
        const recentCount = state.transactions.filter(tx => new Date(tx.date).getTime() >= threeDaysAgo).length;

        creditStat.textContent = `Rs. ${formatCurrency(totalCredits)}`;
        debitStat.textContent = `Rs. ${formatCurrency(totalDebits)}`;
        recentStat.textContent = recentCount;
    }

    function renderAnalytics() {
        const incomeVal = document.getElementById('total-income-val');
        const expenseVal = document.getElementById('total-expense-val');
        if (!incomeVal || !expenseVal) return;

        const totalIncome = state.transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = state.transactions.filter(t => t.type === 'withdraw' || t.type === 'send' || t.type === 'pay').reduce((sum, t) => sum + t.amount, 0);

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
        
        const settingsEmailInput = document.getElementById('settings-email');
        if (settingsEmailInput) settingsEmailInput.value = currentUser.email;
        
        const settingsPhoneInput = document.getElementById('settings-phone');
        if (settingsPhoneInput) settingsPhoneInput.value = currentUser.phone || '';
        
        const settingsNameInput = document.getElementById('settings-name');
        if (settingsNameInput) {
             settingsNameInput.placeholder = currentUser.name;
             settingsNameInput.value = ''; // Clear it but keep placeholder
        }

        // Reset password fields
        const passInput = document.getElementById('settings-pass');
        const passConfirmInput = document.getElementById('settings-pass-confirm');
        if (passInput) passInput.value = '';
        if (passConfirmInput) passConfirmInput.value = '';

        // Ensure wallet IDs are synced
        document.querySelectorAll('.wallet-id').forEach(el => el.textContent = 'ID: ' + currentUser.walletId);

        // Update 2FA status
        const twoFADisplay = document.getElementById('two-fa-display');
        if (twoFADisplay) {
            twoFADisplay.textContent = currentUser.twoFA || 'Authenticator App';
        }
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
                    <td colspan="6">
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
            const amountPrefix = isDeposit ? '+' : '-';
            const amountClass = isDeposit ? 'positive' : 'negative';
            const status = tx.status || 'Completed';
            const statusClass = status.toLowerCase();

            const txHTML = `
                <tr>
                    <td><code class="t-ref">${tx.id.toUpperCase()}</code></td>
                    <td><span class="t-type-badge ${tx.type}">${tx.type.toUpperCase()}</span></td>
                    <td>
                        <div class="t-details">
                            <div class="t-title">${tx.title}</div>
                        </div>
                    </td>
                    <td class="t-amt ${amountClass}">${amountPrefix} Rs. ${formatCurrency(tx.amount)}</td>
                    <td><span class="status-badge ${statusClass}">${status}</span></td>
                    <td class="text-right t-date">${formatDate(tx.date)}</td>
                </tr>
            `;
            transactionsContainer.insertAdjacentHTML('beforeend', txHTML);
        });
    }


    // --- Modal and Interaction Logic ---

    // Modals
    const depositModal = document.getElementById('deposit-modal');
    const sendModal = document.getElementById('send-modal');
    const payModal = document.getElementById('pay-modal');
    
    
    // Buttons
    const btnDeposit = document.getElementById('btn-deposit');
    const btnWithdraw = document.getElementById('btn-withdraw');
    const btnSend = document.getElementById('btn-send');
    const btnPay = document.getElementById('btn-pay');
    const closeBtns = document.querySelectorAll('.close-btn');
    // Forms
    const depositAmountInput = document.getElementById('deposit-amount-input-page');
    const displayTotalDeposit = document.getElementById('display-total-deposit-page');
    const paymentCards = document.querySelectorAll('.payment-card');
    const btnDepositSubmitNew = document.getElementById('btn-deposit-submit-page');

    const sendForm = document.getElementById('send-form');
    const sendInput = document.getElementById('send-amount');
    const sendRecipient = document.getElementById('send-recipient');
    const payForm = document.getElementById('pay-form');
    const payInput = document.getElementById('pay-amount');
    const payMerchant = document.getElementById('pay-merchant');
    
    // Quick Amounts
    const quickBtns = document.querySelectorAll('.quick-btn');

    // Open Modals
    if (btnDeposit) {
        btnDeposit.addEventListener('click', () => {
            if (depositAmountInput) depositAmountInput.value = '';
            showView('deposit');
            if (typeof updateDepositSummary === 'function') updateDepositSummary();
        });
    }

    if (btnWithdraw) {
        btnWithdraw.addEventListener('click', () => {
            showView('withdraw');
        });
    }

    if (btnSend) {
        btnSend.addEventListener('click', () => {
            sendInput.value = '';
            sendRecipient.value = '';
            sendModal.classList.add('show');
        });
    }

    if (btnPay) {
        btnPay.addEventListener('click', () => {
            payInput.value = '';
            payMerchant.value = '';
            payModal.classList.add('show');
        });
    }

    // --- Withdrawal Logic (Page View) ---
    function renderWithdrawPage() {
        const balanceDisplay = document.getElementById('withdraw-page-available-balance');
        const summaryAvailable = document.getElementById('summary-page-available-val');
        const accountsList = document.getElementById('withdraw-page-accounts-list');
        
        if (balanceDisplay) balanceDisplay.textContent = formatCurrency(state.balance);
        if (summaryAvailable) summaryAvailable.textContent = formatCurrency(state.balance);
        
        if (accountsList) {
            accountsList.innerHTML = '';
            if (state.savedAccounts.length === 0) {
                accountsList.innerHTML = '<p class="text-sm text-muted p-3 border-dashed text-center">No bank accounts linked yet.</p>';
            } else {
                state.savedAccounts.forEach(acc => {
                    const card = document.createElement('div');
                    card.className = `saved-account-card ${acc.isDefault ? 'active' : ''}`;
                    card.innerHTML = `
                        <div class="account-icon">
                            <i class="fa-solid fa-building-columns"></i>
                        </div>
                        <div class="account-info">
                            <span class="account-name">${acc.bankName}</span>
                            <span class="account-number">${acc.accountNum}</span>
                            <div class="account-fee-tag"><i class="fa-solid fa-tags"></i> 1% Fee</div>
                        </div>
                        <div class="account-selector"></div>
                    `;
                    card.onclick = () => {
                        document.querySelectorAll('.saved-account-card').forEach(c => c.classList.remove('active'));
                        card.classList.add('active');
                    };
                    accountsList.appendChild(card);
                });
            }
        }
        updateWithdrawPageSummary();
    }

    function updateWithdrawPageSummary() {
        const amountInput = document.getElementById('withdraw-page-amount');
        const withdrawVal = document.getElementById('summary-page-withdraw-val');
        const feeVal = document.getElementById('summary-page-fee-val');
        const receiveVal = document.getElementById('summary-page-receive-val');

        if (!amountInput) return;

        const amount = parseFloat(amountInput.value) || 0;
        const fee = amount * 0.01; // 1% fee
        const finalAmount = Math.max(0, amount - fee);

        if (withdrawVal) withdrawVal.textContent = `Rs. ${formatCurrency(amount)}`;
        if (feeVal) feeVal.textContent = `Rs. ${formatCurrency(fee)}`;
        if (receiveVal) receiveVal.textContent = formatCurrency(finalAmount);
    }

    // Withdrawal View Event Listeners
    const btnWithdrawPageMax = document.getElementById('btn-withdraw-page-max');
    const withdrawPageAmountInput = document.getElementById('withdraw-page-amount');
    const withdrawPageForm = document.getElementById('withdraw-page-form');
    const btnShowInlineAdd = document.getElementById('btn-show-inline-add');
    const inlineBankModal = document.getElementById('inline-bank-modal');
    const btnCloseInlineBank = document.getElementById('btn-close-inline-bank');
    const btnCancelInlineBank = document.getElementById('btn-cancel-inline-bank');
    const btnSaveInlineBank = document.getElementById('btn-save-inline-bank');

    if (btnWithdrawPageMax) {
        btnWithdrawPageMax.addEventListener('click', () => {
            if (withdrawPageAmountInput) {
                withdrawPageAmountInput.value = state.balance;
                updateWithdrawPageSummary();
            }
        });
    }

    if (withdrawPageAmountInput) {
        withdrawPageAmountInput.addEventListener('input', updateWithdrawPageSummary);
    }

    if (btnShowInlineAdd) {
        btnShowInlineAdd.addEventListener('click', () => {
            if (inlineBankModal) {
                inlineBankModal.classList.add('show');
            }
        });
    }

    if (btnCloseInlineBank) {
        btnCloseInlineBank.addEventListener('click', () => {
            if (inlineBankModal) {
                inlineBankModal.classList.remove('show');
            }
        });
    }

    if (btnCancelInlineBank) {
        btnCancelInlineBank.addEventListener('click', () => {
            if (inlineBankModal) {
                inlineBankModal.classList.remove('show');
            }
        });
    }

    // Close on click outside
    if (inlineBankModal) {
        inlineBankModal.addEventListener('click', (e) => {
            if (e.target === inlineBankModal) {
                inlineBankModal.classList.remove('show');
            }
        });
    }

    if (btnSaveInlineBank) {
        btnSaveInlineBank.addEventListener('click', () => {
            const bankName = document.getElementById('withdraw-page-bank-name').value;
            const accountNum = document.getElementById('withdraw-page-acc-num').value;
            const holderName = document.getElementById('withdraw-page-holder').value;

            if (bankName && accountNum && holderName) {
                const newAccount = {
                    id: generateId(),
                    bankName,
                    accountNum,
                    holderName,
                    isDefault: state.savedAccounts.length === 0
                };
                state.savedAccounts.push(newAccount);
                saveState();
                if (inlineBankModal) {
                    inlineBankModal.classList.remove('show');
                }
                showToast('Bank Account Linked!');
                renderWithdrawPage();
            } else {
                showToast('Please fill all bank details!', true);
            }
        });
    }

    if (withdrawPageForm) {
        withdrawPageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = parseFloat(withdrawPageAmountInput.value);
            const activeAccount = document.querySelector('#withdraw-page-accounts-list .saved-account-card.active');

            if (!activeAccount) {
                showToast('Please select a bank account!', true);
                return;
            }

            if (amount > state.balance) {
                showToast('Insufficient balance!', true);
                return;
            }

            if (amount <= 0) {
                showToast('Invalid withdraw amount!', true);
                return;
            }

            const fee = amount * 0.01;
            const bankName = activeAccount.querySelector('.account-name').textContent;

            // Process Withdrawal
            state.balance -= amount;
            state.transactions.unshift({
                id: generateId(),
                type: 'withdraw',
                title: `Withdraw to ${bankName}`,
                date: new Date().toISOString(),
                amount: amount,
                status: 'Completed'
            });

            addNotification('Withdrawal Successful', `Rs. ${formatCurrency(amount - fee)} has been sent to your bank account.`, 'success');
            saveState();
            showToast('Withdrawal Processed!');
            const withdrawModal = document.getElementById('withdraw-modal');
            if (withdrawModal) withdrawModal.classList.remove('show');
            showView('dashboard');
        });
    }

    // Close Modals
    if (closeBtns) {
        closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
                if (modal.id === 'deposit-modal') showDepositStep(1);
            } else {
                // Fallback in case e.target is the icon
                const parentModal = btn.closest('.modal');
                if (parentModal) {
                    parentModal.classList.remove('show');
                    if (parentModal.id === 'deposit-modal') showDepositStep(1);
                }
            }
        });
    });
}

    // Close when clicking outside content
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
            if (e.target.id === 'deposit-modal') showDepositStep(1);
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

    // --- Realistic Multi-step Deposit Logic ---
    let selectedBank = null;

    function showDepositStep(stepId) {
        document.querySelectorAll('.deposit-step').forEach(step => step.classList.add('hidden'));
        
        const targetId = (typeof stepId === 'string' && stepId.startsWith('deposit-step-')) 
            ? stepId 
            : `deposit-step-${stepId}`;
        
        const targetStep = document.getElementById(targetId);
        if (targetStep) targetStep.classList.remove('hidden');

        // Update modal title
        const titleEl = document.getElementById('deposit-modal-title');
        if (titleEl) {
            if (stepId === 1) titleEl.textContent = 'Deposit Funds';
            if (stepId === 2) titleEl.textContent = 'Select Payment Method';
            if (stepId === 'bank') titleEl.textContent = 'Select Bank';
            if (stepId === 'card') titleEl.textContent = 'Card Details';
            if (stepId === 'p2p') titleEl.textContent = 'P2P Request';
            if (stepId === 3) titleEl.textContent = 'Verify Transaction';
            if (stepId === 4) titleEl.textContent = 'Processing Payment';
        }
    }

    // Step 1 -> 2
    const btnDepositNext1 = document.getElementById('btn-deposit-next-1');
    if (btnDepositNext1) {
        btnDepositNext1.addEventListener('click', () => {
            const amount = parseFloat(depositInput.value);
            if (amount >= 100) {
                showDepositStep(2);
            } else {
                markInvalid(depositInput);
                showToast('Minimum deposit is Rs. 100', true);
            }
        });
    }

    // Method Selection (Step 2)
    const methodTiles = document.querySelectorAll('.method-tile');
    methodTiles.forEach(tile => {
        tile.addEventListener('click', () => {
            const method = tile.dataset.method;
            if (method === 'card') {
                selectedBank = 'Debit Card';
                showDepositStep('card');
            } else if (method === 'bank') {
                showDepositStep('bank');
            } else if (method === 'p2p') {
                selectedBank = 'P2P Transfer';
                showDepositStep('p2p');
            }
        });
    });

    const btnMethodBack = document.getElementById('btn-method-back');
    if (btnMethodBack) {
        btnMethodBack.addEventListener('click', () => showDepositStep(1));
    }

    // Bank Selection Sub-step
    const bankItems = document.querySelectorAll('.bank-item');
    const btnBankNext = document.getElementById('btn-bank-next');
    const btnBankBack = document.getElementById('btn-bank-back');

    bankItems.forEach(item => {
        item.addEventListener('click', () => {
            bankItems.forEach(b => b.classList.remove('active'));
            item.classList.add('active');
            selectedBank = item.dataset.bank;
            if (btnBankNext) btnBankNext.disabled = false;
        });
    });

    if (btnBankNext) {
        btnBankNext.addEventListener('click', () => showDepositStep(3));
    }
    if (btnBankBack) {
        btnBankBack.addEventListener('click', () => showDepositStep(2));
    }

    // P2P Sub-step
    const btnP2PNext = document.getElementById('btn-p2p-next');
    const btnP2PBack = document.getElementById('btn-p2p-back');
    const p2pSenderInput = document.getElementById('p2p-sender-id');

    if (btnP2PNext) {
        btnP2PNext.addEventListener('click', (e) => {
            e.preventDefault();
            if (!p2pSenderInput.value) {
                markInvalid(p2pSenderInput);
                showToast('Please enter Sender ID', true);
                return;
            }
            triggerProcessingFlow();
        });
    }
    if (btnP2PBack) {
        btnP2PBack.addEventListener('click', () => showDepositStep(2));
    }

    // OTP Logic (Step 3)
    const otpBoxes = document.querySelectorAll('.otp-box');
    const btnDepositVerify = document.getElementById('btn-deposit-verify');
    const btnDepositBack3 = document.getElementById('btn-deposit-back-3');

    if (btnDepositBack3) {
        btnDepositBack3.addEventListener('click', () => {
            // Go back to the correct previous step based on method
            if (selectedBank === 'Debit Card') showDepositStep('card');
            else if (selectedBank === 'P2P Transfer') showDepositStep('p2p');
            else showDepositStep('bank');
        });
    }

    otpBoxes.forEach((box, idx) => {
        box.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && idx < otpBoxes.length - 1) {
                otpBoxes[idx + 1].focus();
            }
        });
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                otpBoxes[idx - 1].focus();
            }
        });
    });

    // Card Details Logic (Step 2.5)
    const cardNumInput = document.getElementById('card-number-input');
    const cardExpInput = document.getElementById('card-expiry-input');
    const cardCvvInput = document.getElementById('card-cvv-input');
    const cardNameInput = document.getElementById('card-name-input');
    const previewNum = document.getElementById('preview-number');
    const previewExp = document.getElementById('preview-expiry');
    const previewName = document.getElementById('preview-name');
    const btnCardNext = document.getElementById('btn-card-next');
    const btnCardBack = document.getElementById('btn-card-back');

    if (cardNumInput) {
        cardNumInput.addEventListener('input', (e) => {
            // Masking
            let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            let formatted = value.match(/.{1,4}/g)?.join(' ') || '';
            e.target.value = formatted;
            previewNum.textContent = formatted || '#### #### #### ####';
            
            // Detection
            const previewLogo = document.getElementById('preview-logo');
            if (value.startsWith('4')) previewLogo.innerHTML = '<i class="fa-brands fa-cc-visa"></i>';
            else if (value.startsWith('5')) previewLogo.innerHTML = '<i class="fa-brands fa-cc-mastercard"></i>';
            else previewLogo.innerHTML = '<i class="fa-solid fa-credit-card"></i>';
        });
    }

    if (cardExpInput) {
        cardExpInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\//g, '').replace(/[^0-9]/gi, '');
            if (value.length > 2) value = value.substring(0, 2) + '/' + value.substring(2, 4);
            e.target.value = value;
            previewExp.textContent = value || 'MM/YY';
        });
    }

    if (cardNameInput) {
        cardNameInput.addEventListener('input', (e) => {
            previewName.textContent = e.target.value.toUpperCase() || 'FULL NAME';
        });
    }

    if (btnCardBack) {
        btnCardBack.addEventListener('click', () => showDepositStep(2));
    }

    if (btnCardNext) {
        btnCardNext.addEventListener('click', () => {
            const rawCardNum = cardNumInput.value.replace(/\s+/g, '');
            if (rawCardNum.length < 13) {
                markInvalid(cardNumInput);
                showToast('Card number is too short', true);
                return;
            }
            if (cardExpInput.value.length < 5) {
                markInvalid(cardExpInput);
                showToast('Please enter expiry (MM/YY)', true);
                return;
            }
            if (cardCvvInput.value.length < 3) {
                markInvalid(cardCvvInput);
                showToast('Please enter 3-digit CVV', true);
                return;
            }
            
            triggerProcessingFlow();
        });
    }

    function markInvalid(element) {
        if (!element) return;
        element.classList.add('is-invalid', 'shake');
        setTimeout(() => {
            element.classList.remove('shake');
        }, 400);
        
        // Remove red border when user starts typing again
        element.addEventListener('input', () => {
            element.classList.remove('is-invalid');
        }, { once: true });
    }

    // --- Overhauled Deposit Logic ---
    let selectedPaymentCard = 'mastercard'; // Default
    console.log('Deposit logic initialized. Default card:', selectedPaymentCard);

    function updateDepositSummary() {
        const val = parseFloat(depositAmountInput.value) || 0;
        if (displayTotalDeposit) {
            displayTotalDeposit.textContent = `Rs. ${formatCurrency(val)}`;
        }
    }

    if (depositAmountInput) {
        depositAmountInput.addEventListener('input', updateDepositSummary);
    }

    // Delegate card selection and ensure initial state
    function initCardSelection() {
        const cards = document.querySelectorAll('.payment-card');
        console.log('Found payment cards:', cards.length);
        
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const amount = parseFloat(depositAmountInput ? depositAmountInput.value : 0) || 0;

                cards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                selectedPaymentCard = card.dataset.cardId;
                
                console.log('Instant Modal Trigger for:', selectedPaymentCard);
                openMethodModal(selectedPaymentCard, amount);
            });
        });

        // Set initial card from active class if present
        const activeCard = document.querySelector('.payment-card.active');
        if (activeCard) selectedPaymentCard = activeCard.dataset.cardId;
    }

    function openMethodModal(methodId, amount) {
        if (methodId === 'crypto') {
            const modal = document.getElementById('crypto-deposit-modal');
            const amountPayEl = document.getElementById('crypto-amount-pay');
            const amountReceiveEl = document.getElementById('crypto-amount-receive');
            const currentAmount = depositAmountInput ? (parseFloat(depositAmountInput.value) || 0) : amount;
            
            if (modal) {
                const usdtRate = 285;
                const usdtAmount = (currentAmount / usdtRate).toFixed(2);
                const pkrToUsd = currentAmount > 0 ? (currentAmount / usdtRate).toFixed(2) : '0.00';
                
                if (amountPayEl) amountPayEl.textContent = currentAmount > 0 ? `${usdtAmount} USDT` : '--- USDT';
                if (amountReceiveEl) amountReceiveEl.textContent = currentAmount > 0 ? `${pkrToUsd} USD` : '--- USD';
                
                showCryptoStep(1);
                modal.classList.add('show');
            }
        }
        else if (methodId === 'p2p') {
            const modal = document.getElementById('p2p-deposit-modal');
            const amountEl = document.getElementById('p2p-confirm-amount');
            if (modal) {
                if (amountEl) amountEl.textContent = `Rs. ${formatCurrency(amount)}`;
                showP2PStep(1);
                modal.classList.add('show');
            }
        }
        else {
            // Show Premium "In Progress" Modal for all other methods (MasterCard, Discover, Amex, GPay)
            const progressModal = document.getElementById('method-in-progress-modal');
            if (progressModal) {
                progressModal.classList.add('show');
            }
        }
    }
    initCardSelection();

    // --- processDeposit is already defined below ---

    function processDeposit(amount, methodName) {
        state.balance += amount;
        state.transactions.unshift({
            id: generateId(),
            type: 'deposit',
            title: `Deposit via ${methodName.charAt(0).toUpperCase() + methodName.slice(1)}`,
            date: new Date().toISOString(),
            amount: amount,
            status: 'Completed'
        });
        
        saveState();
        updateUI();
        addNotification('Deposit Successful', `Rs. ${formatCurrency(amount)} added to your wallet.`, 'success');
        
        // Navigate Back
        showView('dashboard');
        showToast(`Successfully deposited Rs. ${formatCurrency(amount)}!`);
        
        // Reset
        depositAmountInput.value = '';
        updateDepositSummary();
    }

    const paymentDetailsForm = document.getElementById('payment-details-form');
    if (paymentDetailsForm) {
        paymentDetailsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Payment details submitted for:', selectedPaymentCard);
            const amount = parseFloat(depositAmountInput.value);
            document.getElementById('payment-details-modal').classList.remove('show');
            processDeposit(amount, selectedPaymentCard);
        });
    }

    const btnClosePaymentModal = document.getElementById('btn-close-payment-modal');
    if (btnClosePaymentModal) {
        btnClosePaymentModal.addEventListener('click', () => {
            document.getElementById('payment-details-modal').classList.remove('show');
        });
    }

    // Brand-Specific Modal Listeners (MasterCard, Discover, Amex)
    const brandCardConfig = [
        { form: 'mastercard-details-form', modal: 'mastercard-details-modal', close: 'btn-close-mastercard-modal' },
        { form: 'discover-details-form', modal: 'discover-details-modal', close: 'btn-close-discover-modal' },
        { form: 'amex-details-form', modal: 'amex-details-modal', close: 'btn-close-amex-modal' }
    ];

    brandCardConfig.forEach(config => {
        const form = document.getElementById(config.form);
        const modal = document.getElementById(config.modal);
        const closeBtn = document.getElementById(config.close);

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const amount = parseFloat(depositAmountInput.value);
                modal.classList.remove('show');
                processDeposit(amount, selectedPaymentCard);
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.classList.remove('show'));
        }
    });

    const p2pBankData = {
        'USA': {
            bank: 'JPMorgan Chase Bank',
            holder: 'Henry Thomas',
            branch: 'New York Branch',
            routing: '021000021',
            iban: 'US11 6509 2696 9232 7577 50',
            address: 'JPMorgan Chase Bank, 270 Park Avenue, NY 10017, USA',
            receiver: '212 571 1298',
            currency: 'USD'
        },
        'Canada': {
            bank: 'Royal Bank of Canada (RBC)',
            holder: 'Nosh Vallet Intl',
            branch: 'Toronto HQ',
            routing: '0039210',
            iban: 'CA99 1002 0000 0000 0072',
            address: '200 Bay St, Toronto, ON M5J 2J2, Canada',
            receiver: '416 974 5151',
            currency: 'CAD'
        },
        'UK': {
            bank: 'Barclays Bank PLC',
            holder: 'Nosh Vallet UK Ltd',
            branch: 'London Canary Wharf',
            routing: '20-00-00',
            iban: 'GB29 BARC 2000 0092 4381 00',
            address: '1 Churchill Place, London E14 5HP, UK',
            receiver: '020 7116 1000',
            currency: 'GBP'
        },
        'Germany': {
            bank: 'Deutsche Bank',
            holder: 'Nosh Vallet EU',
            branch: 'Frankfurt Central',
            routing: '100 700 24',
            iban: 'DE44 1007 0024 3900 1122 33',
            address: 'Taunusanlage 12, 60325 Frankfurt, Germany',
            receiver: '+49 69 910-00',
            currency: 'EUR'
        },
        'Pakistan': {
            bank: 'Habib Bank Limited (HBL)',
            holder: 'NOSH VALLET PVT LTD',
            branch: 'Main Boulevard, Lahore',
            routing: 'HBL000342',
            iban: 'PK44 HABB 0003 4200 1182 9384',
            address: 'HBL Tower, Blue Area, Islamabad, Pakistan',
            receiver: '042 111 425 111',
            currency: 'PKR'
        },
        'India': {
            bank: 'ICICI Bank',
            holder: 'Nosh Vallet India',
            branch: 'Bandra Kurla, Mumbai',
            routing: 'ICIC0000001',
            iban: 'IN92 ICIC 6239 0011 2233 44',
            address: 'ICICI Bank Towers, Mumbai 400051, India',
            receiver: '1800 102 4242',
            currency: 'INR'
        },
        'UAE': {
            bank: 'Emirates NBD',
            holder: 'Nosh Vallet UAE',
            branch: 'Dubai Marina',
            routing: 'ENBD0001',
            iban: 'AE82 ENBD 9829 0000 1122 33',
            address: 'Al Souq Al Kabeer, Dubai, UAE',
            receiver: '+971 600 540000',
            currency: 'AED'
        }
    };

    // --- Crypto Multi-Step Logic ---
    window.showCryptoStep = function(stepNum) {
        console.log('Switching to Crypto Step:', stepNum);
        
        // Update Content Visibility
        for (let i = 1; i <= 3; i++) {
            const content = document.getElementById(`crypto-step-content-${i}`);
            const tab = document.getElementById(`crypto-step-tab-${i}`);
            if (content) {
                if (i === stepNum) content.classList.remove('hidden-step');
                else content.classList.add('hidden-step');
            }
            if (tab) {
                if (i < stepNum) {
                    tab.classList.add('completed');
                    tab.classList.remove('active');
                    const circle = tab.querySelector('.modal-step-circle');
                    if (circle) circle.innerHTML = '<i class="fa-solid fa-check"></i>';
                } else if (i === stepNum) {
                    tab.classList.add('active');
                    tab.classList.remove('completed');
                    const circle = tab.querySelector('.modal-step-circle');
                    if (circle) circle.textContent = stepNum;
                } else {
                    tab.classList.remove('active', 'completed');
                    const circle = tab.querySelector('.modal-step-circle');
                    if (circle) circle.textContent = i;
                }
            }
        }

        // Reset Step 2 Checkbox and Button on each entry + refresh amount display
        if (stepNum === 2) {
            const checkbox = document.getElementById('cryptoPaymentConfirmed');
            const continueBtn = document.getElementById('btn-crypto-to-step-3');
            if (checkbox) checkbox.checked = false;
            if (continueBtn) continueBtn.disabled = true;

            // Refresh amount from deposit input
            const currentAmount = depositAmountInput ? (parseFloat(depositAmountInput.value) || 0) : 0;
            const usdtRate = 285;
            const amountPayEl = document.getElementById('crypto-amount-pay');
            const amountReceiveEl = document.getElementById('crypto-amount-receive');
            if (amountPayEl) amountPayEl.textContent = currentAmount > 0 ? `${(currentAmount / usdtRate).toFixed(2)} USDT` : '--- USDT';
            if (amountReceiveEl) amountReceiveEl.textContent = currentAmount > 0 ? `${(currentAmount / usdtRate).toFixed(2)} USD` : '--- USD';
        }
    };

    // Confirmation Checkbox Logic (Crypto)
    const cryptoConfirmCheckbox = document.getElementById('cryptoPaymentConfirmed');
    if (cryptoConfirmCheckbox) {
        cryptoConfirmCheckbox.addEventListener('change', (e) => {
            const continueBtn = document.getElementById('btn-crypto-to-step-3');
            if (continueBtn) continueBtn.disabled = !e.target.checked;
        });
    }

    // Final Crypto Submission
    const btnCryptoFinalSubmit = document.getElementById('btn-crypto-final-submit');
    if (btnCryptoFinalSubmit) {
        btnCryptoFinalSubmit.addEventListener('click', () => {
            const hash = document.getElementById('crypto-hash-input').value;
            if (!hash) {
                showToast('Please enter your Transaction Hash / ID', true);
                return;
            }
            const amount = parseFloat(depositAmountInput ? depositAmountInput.value : 0) || 0;
            if (!amount || amount < 100) {
                showToast('Please enter a deposit amount of at least Rs. 100 on the deposit page', true);
                return;
            }
            processDeposit(amount, 'crypto'); // Fixed: amount first, method second
            document.getElementById('crypto-deposit-modal').classList.remove('show');
        });
    }

    // --- P2P Multi-Step Logic ---
    window.showP2PStep = function(stepNum) {
        console.log('Switching to P2P Step:', stepNum);
        
        // Update Content Visibility
        for (let i = 1; i <= 3; i++) {
            const content = document.getElementById(`p2p-step-content-${i}`);
            const tab = document.getElementById(`p2p-step-tab-${i}`);
            if (content) {
                if (i === stepNum) content.classList.remove('hidden-step');
                else content.classList.add('hidden-step');
            }
            if (tab) {
                if (i < stepNum) {
                    tab.classList.add('completed');
                    tab.classList.remove('active');
                } else if (i === stepNum) {
                    tab.classList.add('active');
                    tab.classList.remove('completed');
                } else {
                    tab.classList.remove('active', 'completed');
                }
            }
        }

        // Reset Step 2 Checkbox and Button on each entry
        if (stepNum === 2) {
            const checkbox = document.getElementById('p2p-confirm-checkbox');
            const continueBtn = document.getElementById('btn-p2p-to-step-3');
            if (checkbox) checkbox.checked = false;
            if (continueBtn) continueBtn.disabled = true;
        }
    };

    // Initialize P2P Account Card Listeners
    const p2pAccountCards = document.querySelectorAll('.p2p-account-card');
    p2pAccountCards.forEach(card => {
        card.addEventListener('click', () => {
            const country = card.dataset.country;
            const amount = parseFloat(depositAmountInput.value) || 0;
            const data = p2pBankData[country];

            if (data) {
                console.log('Injecting P2P Data for:', country);
                
                // Update UI Elements
                document.getElementById('p2p-detail-flag').src = `https://flagcdn.com/w80/${card.dataset.flag}.png`;
                document.getElementById('p2p-detail-country').textContent = country === 'USA' ? 'United States' : country;
                document.getElementById('p2p-detail-currency').textContent = `${data.currency} | ${data.iban.slice(-7)}`;
                document.getElementById('p2p-alert-country').textContent = country;
                
                // Detailed Grid
                document.getElementById('p2p-val-holder').textContent = data.holder;
                document.getElementById('p2p-val-bank').textContent = data.bank;
                document.getElementById('p2p-val-branch').textContent = data.branch;
                document.getElementById('p2p-val-routing').textContent = data.routing;
                document.getElementById('p2p-val-iban').textContent = data.iban;
                document.getElementById('p2p-val-receiver').textContent = data.receiver;
                document.getElementById('p2p-val-address').textContent = data.address;

                // Form Section
                const formattedAmount = `${data.currency === 'USD' || data.currency === 'EUR' || data.currency === 'GBP' ? '$' : ''}${formatCurrency(amount)} ${data.currency}`;
                document.getElementById('p2p-exact-amount').textContent = formattedAmount;
                document.getElementById('p2p-amount-sent-input').value = formattedAmount;
                document.getElementById('p2p-hint-amount').textContent = formattedAmount;

                showP2PStep(2);
            }
        });
    });

    // Confirmation Checkbox Logic
    const p2pConfirmCheckbox = document.getElementById('p2p-confirm-checkbox');
    if (p2pConfirmCheckbox) {
        p2pConfirmCheckbox.addEventListener('change', (e) => {
            const continueBtn = document.getElementById('btn-p2p-to-step-3');
            if (continueBtn) continueBtn.disabled = !e.target.checked;
        });
    }

    // Final P2P Submission
    const btnP2PFinalSubmit = document.getElementById('btn-p2p-final-submit');
    if (btnP2PFinalSubmit) {
        btnP2PFinalSubmit.addEventListener('click', () => {
            const amount = parseFloat(depositAmountInput.value);
            const refId = document.getElementById('p2p-ref-id-input').value;
            
            if (!refId || refId.length < 5) {
                showToast('Please enter a valid Transaction Reference ID', true);
                return;
            }

            console.log('P2P Final Submit:', { amount, refId });
            document.getElementById('p2p-deposit-modal').classList.remove('show');
            processDeposit(amount, 'p2p');
        });
    }

    // Existing Modal Listeners
    const newModalConfig = [
        { btn: 'btn-crypto-confirm', modal: 'crypto-deposit-modal', close: 'btn-close-crypto-modal' },
        { btn: 'btn-p2p-confirm', modal: 'p2p-deposit-modal', close: 'btn-close-p2p-modal' },
        { btn: 'btn-gpay-confirm', modal: 'gpay-deposit-modal' }
    ];

    newModalConfig.forEach(config => {
        const confirmBtn = document.getElementById(config.btn);
        const modal = document.getElementById(config.modal);
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                const amount = parseFloat(depositAmountInput.value);
                modal.classList.remove('show');
                processDeposit(amount, selectedPaymentCard);
            });
        }
        if (config.close) {
            const closeBtn = document.getElementById(config.close);
            if (closeBtn) {
                closeBtn.addEventListener('click', () => modal.classList.remove('show'));
            }
        }
    });

    // Remove the unused submit listener for btnDepositSubmitNew since it's now instant
    if (btnDepositSubmitNew) {
        btnDepositSubmitNew.style.display = 'none'; 
    }

    // Initialize balance on modal open
    if (btnDeposit) {
        btnDeposit.addEventListener('click', () => {
            updateDepositSummary();
        });
    }



    if (sendForm) {
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
                        type: 'send',
                        title: `Sent to ${recipient}`,
                        date: new Date().toISOString(),
                        amount: amount,
                        status: 'Completed'
                    });
                    saveState();
                    sendModal.classList.remove('show');
                    showToast(`Rs. ${formatCurrency(amount)} Sent Successfully!`);
                    addNotification('Money Sent', `Successfully sent Rs. ${formatCurrency(amount)} to ${recipient}.`, 'success');
                }
            }
        });
    }

    if (payForm) {
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
                        type: 'pay',
                        title: `Payment: ${merchant}`,
                        date: new Date().toISOString(),
                        amount: amount,
                        status: 'Completed'
                    });
                    saveState();
                    payModal.classList.remove('show');
                    showToast(`Payment of Rs. ${formatCurrency(amount)} Done!`);
                    addNotification('Payment Successful', `Paid Rs. ${formatCurrency(amount)} to ${merchant}.`, 'success');
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
        if (viewId === 'withdraw') {
            const withdrawModal = document.getElementById('withdraw-modal');
            if (withdrawModal) {
                withdrawModal.classList.add('show');
                renderWithdrawPage();
            }
            return;
        }

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
        if (viewId === 'withdraw') renderWithdrawPage();
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
    const txFilterDropdown = document.getElementById('tx-filter-dropdown');

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
    if (txFilterDropdown) {
        const trigger = txFilterDropdown.querySelector('.dropdown-trigger');
        const menu = txFilterDropdown.querySelector('.dropdown-menu');
        const hiddenValueInput = document.getElementById('tx-filter-value');
        const selectedLabel = document.getElementById('tx-filter-selected');
        
        // Items logic
        const items = menu.querySelectorAll('.dropdown-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const val = item.dataset.value;
                hiddenValueInput.value = val;
                selectedLabel.textContent = item.textContent;
                
                // Active class management
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                menu.classList.remove('active'); // Close menu
                renderFullTransactions(); // Trigger filter
            });
        });

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = menu.classList.toggle('active');
            trigger.classList.toggle('active', isActive);
        });

        document.addEventListener('click', () => {
            menu.classList.remove('active');
            trigger.classList.remove('active');
        });
    }

    // Settings Form
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newName = document.getElementById('settings-name').value.trim();
            const newEmail = document.getElementById('settings-email').value.trim();
            const newPhone = document.getElementById('settings-phone').value.trim();
            const newPass = document.getElementById('settings-pass').value;
            const confirmPass = document.getElementById('settings-pass-confirm').value;

            if (newPass && newPass !== confirmPass) {
                showToast('Passwords do not match!', true);
                return;
            }

            // Persistence
            const allUsers = getAllUsers();
            const userIndex = allUsers.findIndex(u => u.email === currentUser.email);

            if (userIndex === -1) {
                showToast('User data error!', true);
                return;
            }

            // Check if email is changing and if it is already taken
            if (newEmail !== currentUser.email) {
                const emailExists = allUsers.some(u => u.email === newEmail);
                if (emailExists) {
                    showToast('Email already in use!', true);
                    return;
                }
            }

            // Update user object
            if (newName) currentUser.name = newName;
            currentUser.email = newEmail;
            currentUser.phone = newPhone;
            if (newPass) currentUser.password = newPass;

            // Sync with localStorage
            allUsers[userIndex] = currentUser;
            saveAllUsers(allUsers);

            // Sync with sessionStorage
            sessionStorage.setItem('noshWalletAuth', JSON.stringify(currentUser));
            
            // Update UI
            document.querySelectorAll('.user-name').forEach(el => el.textContent = currentUser.name);
            document.querySelectorAll('.user-email').forEach(el => el.textContent = currentUser.email);
            
            showToast('Profile Updated Successfully!');
            addNotification('Profile Update', 'Your account details have been updated.', 'success');
            
            updateSettingsUI();
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
            // Pre-select current method
            const currentMethod = currentUser.twoFA || 'Authenticator App';
            securityOptions.forEach(opt => {
                const title = opt.querySelector('.opt-title').textContent;
                if (title === currentMethod) {
                    opt.classList.add('active');
                } else {
                    opt.classList.remove('active');
                }
            });
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

        // Save changes with persistence
        if (btnSave2FA) {
            btnSave2FA.addEventListener('click', () => {
                const activeOpt = document.querySelector('.security-opt.active .opt-title').textContent;
                btnSave2FA.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
                btnSave2FA.disabled = true;

                setTimeout(() => {
                    // Persistence logic
                    currentUser.twoFA = activeOpt;
                    sessionStorage.setItem('noshWalletAuth', JSON.stringify(currentUser));
                    
                    const allUsers = getAllUsers();
                    const userIndex = allUsers.findIndex(u => u.email === currentUser.email);
                    if (userIndex !== -1) {
                        allUsers[userIndex] = currentUser;
                        saveAllUsers(allUsers);
                    }

                    twoFAModal.classList.remove('show');
                    showToast(`${activeOpt} enabled successfully!`);
                    
                    btnSave2FA.innerHTML = 'Save Changes';
                    btnSave2FA.disabled = false;
                    
                    // Update settings UI status
                    updateSettingsUI();
                    
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
            amount: randomAmount,
            status: 'Completed'
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
    if (!localStorage.getItem('noshWalletTestInjected')) {
        setTimeout(() => {
            injectTestData(true);
            localStorage.setItem('noshWalletTestInjected', 'true');
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

    // --- Custom Withdraw Select Logic ---
    const withdrawBankDropdown = document.getElementById('withdraw-bank-dropdown');
    if (withdrawBankDropdown) {
        const trigger = withdrawBankDropdown.querySelector('.dropdown-trigger');
        const menu = withdrawBankDropdown.querySelector('.dropdown-menu');
        const hiddenInput = document.getElementById('withdraw-page-bank-name');
        const selectedText = withdrawBankDropdown.querySelector('.selected-text');

        // Teleport menu to body so parent overflow:scroll never clips it
        document.body.appendChild(menu);

        function openMenu() {
            const rect = trigger.getBoundingClientRect();
            menu.style.cssText = `
                position: fixed !important;
                top: ${rect.bottom + 2}px;
                left: ${rect.left}px;
                width: ${rect.width}px;
                z-index: 999999;
                display: flex;
            `;
            menu.classList.add('active');
        }

        function closeMenu() {
            menu.style.display = '';
            menu.classList.remove('active');
        }

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.contains('active') ? closeMenu() : openMenu();
        });

        const items = menu.querySelectorAll('.dropdown-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                hiddenInput.value = item.dataset.value;
                selectedText.textContent = item.textContent;
                selectedText.classList.remove('text-muted');
                closeMenu();
            });
        });

        document.addEventListener('click', (e) => {
            if (!trigger.contains(e.target) && !menu.contains(e.target)) {
                closeMenu();
            }
        });
    }

    // --- Initialization ---
    loadState(); // Boot up the app
    updateUI(); // Render the loaded state
    initializePasswordToggles();
});
