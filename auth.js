// auth.js - NoshWallet Authentication Logic

document.addEventListener('DOMContentLoaded', () => {

    // --- Data Management ---
    function getUsers() {
        const users = localStorage.getItem('noshWalletUsers');
        return users ? JSON.parse(users) : [];
    }

    function saveUsers(users) {
        localStorage.setItem('noshWalletUsers', JSON.stringify(users));
    }

    // --- Auth State ---
    const currentUser = sessionStorage.getItem('noshWalletAuth');

    // If already logged in, redirect to dashboard
    if (currentUser && window.location.pathname.includes('index.html')) {
        window.location.href = 'dashboard.html';
        return;
    }

    // --- UI Elements ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    // Toast Elements (Standardized across the app)
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = toast ? toast.querySelector('.toast-icon') : null;
    const toastIndicator = toast ? toast.querySelector('.toast-indicator') : null;
    let toastTimeout;

    function showToast(message, isError = false) {
        if (!toast || !toastMsg) return;
        
        clearTimeout(toastTimeout);
        toastMsg.textContent = message;
        
        if (isError) {
            if (toastIcon) toastIcon.className = 'toast-icon fa-solid fa-circle-exclamation';
            if (toastIcon) toastIcon.style.color = 'var(--danger)';
            if (toastIndicator) toastIndicator.style.backgroundColor = 'var(--danger)';
        } else {
            if (toastIcon) toastIcon.className = 'toast-icon fa-solid fa-circle-check';
            if (toastIcon) toastIcon.style.color = 'var(--success)';
            if (toastIndicator) toastIndicator.style.backgroundColor = 'var(--success)';
        }

        toast.classList.add('show');
        
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // --- Login Handlers ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            const users = getUsers();
            const user = users.find(u => u.email === email && u.password === password);

            if (user) {
                sessionStorage.setItem('noshWalletAuth', JSON.stringify({
                    name: user.name,
                    email: user.email,
                    walletId: user.walletId
                }));
                showToast('Login Successful!', false);
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 800);
            } else {
                showToast('Invalid email or password.', true);
            }
        });
    }

    // --- Register Handlers ---
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;

            const users = getUsers();
            
            if (users.some(u => u.email === email)) {
                showToast('Email already registered.', true);
                return;
            }

            const newUser = {
                name: name,
                email: email,
                password: password,
                walletId: 'NV-' + Math.floor(Math.random() * 900000 + 100000), 
            };

            users.push(newUser);
            saveUsers(users);

            showToast('Account created! Entering dashboard...', false);
            
            setTimeout(() => {
                sessionStorage.setItem('noshWalletAuth', JSON.stringify({
                    name: newUser.name,
                    email: newUser.email,
                    walletId: newUser.walletId
                }));
                
                // Seed initial state for new user
                localStorage.setItem('noshWalletState', JSON.stringify({
                    balance: 1000.00,
                    transactions: [{
                        id: 'WELCOME',
                        type: 'deposit',
                        title: 'Welcome Bonus',
                        date: new Date().toISOString(),
                        amount: 1000.00
                    }]
                }));
                
                window.location.href = 'dashboard.html';
            }, 1500);
        });
    }

    // --- Demo Account Logic ---
    const quickLoginBtn = document.getElementById('btn-quick-login');
    const demoEmail = 'demo@noshwallet.com';
    const demoPassword = 'demo1234';

    // Seed Demo User if not exists
    (function seedDemoUser() {
        const users = getUsers();
        if (!users.some(u => u.email === demoEmail)) {
            users.push({
                name: 'Demo User',
                email: demoEmail,
                password: demoPassword,
                walletId: 'NV-DEMO-001'
            });
            saveUsers(users);
        }
    })();

    if (quickLoginBtn) {
        quickLoginBtn.addEventListener('click', () => {
            const emailInput = document.getElementById('login-email');
            const passwordInput = document.getElementById('login-password');
            
            if (emailInput && passwordInput) {
                emailInput.value = demoEmail;
                passwordInput.value = demoPassword;
                
                showToast('Pre-filling demo credentials...', false);
                
                setTimeout(() => {
                    loginForm.dispatchEvent(new Event('submit'));
                }, 1000);
            }
        });
    }
});
