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

    // --- Modal Interactivity ---
    function initializeAuthModals() {
        const loginModal = document.getElementById('login-modal');
        const registerModal = document.getElementById('register-modal');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const switchToRegister = document.getElementById('switch-to-register');
        const switchToLogin = document.getElementById('switch-to-login');
        const closeBtns = document.querySelectorAll('.close-btn');

        if (switchToRegister) {
            switchToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                if (registerForm) registerForm.reset();
                if (loginModal) loginModal.classList.remove('show');
                if (registerModal) registerModal.classList.add('show');
            });
        }

        if (switchToLogin) {
            switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                if (loginForm) loginForm.reset();
                if (registerModal) registerModal.classList.remove('show');
                if (loginModal) loginModal.classList.add('show');
            });
        }

        closeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('show');
                }
            });
        });

        // Close logic on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('show');
            }
        });
    }

    function initializePasswordToggles() {
        const toggleBtns = document.querySelectorAll('.password-toggle');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.parentElement.querySelector('input');
                const icon = btn.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                }
            });
        });
    }

    // --- UI Logic ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
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
    let pendingUser = null;

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const users = getUsers();
            const user = users.find(u => u.email === email && u.password === password);
            if (user) {
                if (user.twoFA && user.twoFA !== 'None' && user.twoFA !== 'Authenticator App') {
                    pendingUser = user;
                    const otpModal = document.getElementById('otp-modal');
                    const otpMessage = document.getElementById('otp-message');
                    if (otpModal) {
                        const contact = user.twoFA === 'SMS Verification' ? (user.phone || 'associated phone') : user.email;
                        if (otpMessage) otpMessage.innerHTML = `Enter the code sent to <br> <strong class="highlight-yellow">${contact}</strong>`;
                        showToast(`Security code sent to ${contact}`, false);
                        otpModal.classList.add('show');
                    }
                    return;
                }
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
            window.location.reload(); // Refresh into logged-in state
        }, 800);
    }

    const otpForm = document.getElementById('otp-form');
    if (otpForm) {
        otpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const otpValue = document.getElementById('otp-input').value;
            if (otpValue === '123456') {
                if (pendingUser) completeLogin(pendingUser);
            } else {
                showToast('Invalid verification code.', true);
            }
        });
    }

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
                name, email, password,
                walletId: 'NV-' + Math.floor(Math.random() * 900000 + 100000),
                twoFA: 'Authenticator App'
            };
            users.push(newUser);
            saveUsers(users);
            showToast('Account created!', false);
            setTimeout(() => {
                sessionStorage.setItem('noshWalletAuth', JSON.stringify({
                    name: newUser.name,
                    email: newUser.email,
                    walletId: newUser.walletId,
                    twoFA: newUser.twoFA
                }));
                window.location.reload();
            }, 1000);
        });
    }

    // --- Demo Account Logic ---
    const quickLoginBtn = document.getElementById('btn-quick-login');
    if (quickLoginBtn) {
        quickLoginBtn.addEventListener('click', () => {
            const emailInput = document.getElementById('login-email');
            const passwordInput = document.getElementById('login-password');
            if (emailInput && passwordInput) {
                emailInput.value = 'demo@noshwallet.com';
                passwordInput.value = 'demo1234';
                showToast('Pre-filling demo credentials...', false);
                setTimeout(() => {
                    loginForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                }, 800);
            }
        });
    }

    // Initialize all logic
    initializeAuthModals();
    initializePasswordToggles();
});

