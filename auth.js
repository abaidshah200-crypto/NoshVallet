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
    let pendingUser = null; // Store user during 2FA

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            const users = getUsers();
            const user = users.find(u => u.email === email && u.password === password);

            if (user) {
                // Check if 2FA is enabled
                if (user.twoFA && user.twoFA !== 'None' && user.twoFA !== 'Authenticator App') { // Simplified check for demo
                    pendingUser = user;
                    const otpModal = document.getElementById('otp-modal');
                    const otpMessage = document.getElementById('otp-message');
                    
                    if (otpModal) {
                        const contact = user.twoFA === 'SMS Verification' ? (user.phone || 'associated phone') : user.email;
                        if (otpMessage) otpMessage.innerHTML = `Enter the 6-digit code sent to <br> <strong class="highlight-yellow">${contact}</strong>`;
                        
                        showToast(`Security code sent to ${contact}`, false);
                        otpModal.classList.add('show');
                    }
                    return;
                }

                // Standard login if no 2FA (or for Authenticator App which we simulate as enabled/disabled)
                completeLogin(user);
            } else {
                showToast('Invalid email or password.', true);
            }
        });
    }

    function completeLogin(user) {
        sessionStorage.setItem('noshWalletAuth', JSON.stringify({
            name: user.name,
            email: user.email,
            walletId: user.walletId,
            phone: user.phone || 'Not set',
            twoFA: user.twoFA || 'Authenticator App'
        }));
        
        showToast('Login Successful!', false);
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 800);
    }

    // --- OTP Form Handlers ---
    const otpForm = document.getElementById('otp-form');
    if (otpForm) {
        otpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const otpValue = document.getElementById('otp-input').value;

            if (otpValue === '123456') {
                if (pendingUser) {
                    completeLogin(pendingUser);
                }
            } else {
                showToast('Invalid verification code.', true);
            }
        });
    }

    const btnResendOtp = document.getElementById('resend-otp');
    if (btnResendOtp) {
        btnResendOtp.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('New security code sent!', false);
        });
    }

    // --- Register Handlers ---
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const phone = document.getElementById('reg-phone').value;

            const users = getUsers();
            
            if (users.some(u => u.email === email)) {
                showToast('Email already registered.', true);
                return;
            }

            const newUser = {
                name: name,
                email: email,
                password: password,
                phone: phone,
                walletId: 'NV-' + Math.floor(Math.random() * 900000 + 100000),
                twoFA: 'Authenticator App' // Default
            };

            users.push(newUser);
            saveUsers(users);

            showToast('Account created! Entering dashboard...', false);
            
            setTimeout(() => {
                sessionStorage.setItem('noshWalletAuth', JSON.stringify({
                    name: newUser.name,
                    email: newUser.email,
                    walletId: newUser.walletId,
                    phone: newUser.phone,
                    twoFA: newUser.twoFA
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

    // Seed/refresh Demo User every page load to ensure it's always up to date
    (function seedDemoUser() {
        let users = getUsers();
        const demoIndex = users.findIndex(u => u.email === 'demo@noshwallet.com');
        const freshDemo = {
            name: 'Demo User',
            email: 'demo@noshwallet.com',
            password: 'demo1234',
            phone: '0300 1234567',
            walletId: 'NV-Demo01',
            twoFA: 'Authenticator App'
        };
        if (demoIndex === -1) {
            users.push(freshDemo);
        } else {
            users[demoIndex] = freshDemo; // Always refresh demo data
        }
        saveUsers(users);
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
                    // Use a proper SubmitEvent so the handler fires in all browsers
                    loginForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                }, 800);
            }
        });
    }
});
