// app.js - NoshWallet Interactions and Logic

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Auth Check ---
    const currentUser = JSON.parse(sessionStorage.getItem('noshWalletAuth'));
    
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
            sessionStorage.removeItem('noshWalletAuth');
            window.location.href = 'index.html'; // Redirect to landing
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
                    amount: 2299.00
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
        renderTransactions();

        // Update Notifications
        renderNotifications();
        
        // Update Side Views if active
        renderFullTransactions();
        renderAnalytics();
        updateSettingsUI();
        // renderSavedAccounts(); // Removed obsolete call
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
    const sendModal = document.getElementById('send-modal');
    const payModal = document.getElementById('pay-modal');
    
    
    // Buttons
    const btnDeposit = document.getElementById('btn-deposit');
    const btnWithdraw = document.getElementById('btn-withdraw');
    const btnSend = document.getElementById('btn-send');
    const btnPay = document.getElementById('btn-pay');
    const closeBtns = document.querySelectorAll('.close-btn');
    // Forms
    const depositForm = document.getElementById('deposit-form');
    const depositInput = document.getElementById('deposit-amount');
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
            depositInput.value = '';
            depositModal.classList.add('show');
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
                amount: amount
            });

            addNotification('Withdrawal Successful', `Rs. ${formatCurrency(amount - fee)} has been sent to your bank account.`, 'success');
            saveState();
            showToast('Withdrawal Processed!');
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

    function triggerProcessingFlow() {
        showDepositStep(4);
        const amount = parseFloat(depositInput.value);
        
        // Simulation delay
        setTimeout(() => {
            const processingState = document.querySelector('.processing-state');
            const successState = document.querySelector('.success-state');
            if (processingState) processingState.classList.add('hidden');
            if (successState) successState.classList.remove('hidden');
            
            const finalAmountEl = document.getElementById('final-deposit-amount');
            if (finalAmountEl) finalAmountEl.textContent = formatCurrency(amount);

            // Update Balance
            state.balance += amount;
            state.transactions.unshift({
                id: generateId(),
                type: 'deposit',
                title: `Deposit via ${selectedBank}`,
                date: new Date().toISOString(),
                amount: amount
            });
            saveState();
            addNotification('Deposit Successful', `Rs. ${formatCurrency(amount)} from ${selectedBank} added.`, 'success');
        }, 2500);
    }

    if (btnDepositVerify) {
        btnDepositVerify.addEventListener('click', () => {
            const isOtpFilled = Array.from(otpBoxes).every(box => box.value.length === 1);
            if (!isOtpFilled) {
                showToast('Please enter 6-digit OTP', true);
                return;
            }
            triggerProcessingFlow();
        });
    }

    const btnDepositFinish = document.getElementById('btn-deposit-finish');
    if (btnDepositFinish) {
        btnDepositFinish.addEventListener('click', () => {
            depositModal.classList.remove('show');
            // Reset modal for next time
            setTimeout(() => {
                showDepositStep(1);
                depositInput.value = '';
                bankItems.forEach(b => b.classList.remove('active'));
                methodTiles.forEach(t => t.classList.remove('active'));
                if (btnBankNext) btnBankNext.disabled = true;
                otpBoxes.forEach(box => box.value = '');
                if (p2pSenderInput) p2pSenderInput.value = '';
                
                // Clear card inputs too
                if (cardNumInput) cardNumInput.value = '';
                if (cardExpInput) cardExpInput.value = '';
                if (cardCvvInput) cardCvvInput.value = '';
                if (cardNameInput) cardNameInput.value = '';
                if (previewNum) previewNum.textContent = '#### #### #### ####';
                
                const processingState = document.querySelector('.processing-state');
                const successState = document.querySelector('.success-state');
                if (processingState) processingState.classList.remove('hidden');
                if (successState) successState.classList.add('hidden');
            }, 500);
        });
    }

    if (depositForm) {
        depositForm.addEventListener('submit', (e) => e.preventDefault());
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

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
        });

        const items = menu.querySelectorAll('.dropdown-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                hiddenInput.value = item.dataset.value;
                selectedText.textContent = item.textContent;
                selectedText.classList.remove('text-muted');
                menu.classList.remove('active');
            });
        });

        document.addEventListener('click', (e) => {
            if (!withdrawBankDropdown.contains(e.target)) {
                menu.classList.remove('active');
            }
        });
    }

    // --- Initialization ---
    loadState(); // Boot up the app
    updateUI(); // Render the loaded state
    initializePasswordToggles();
});
