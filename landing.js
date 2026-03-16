// landing.js - Landing Page Interactions

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Auth Check ---
    const currentUser = JSON.parse(sessionStorage.getItem('noshWalletAuth'));
    
    // If logged in, don't stay on landing page
    if (currentUser) {
        window.location.href = 'dashboard.html';
        return;
    }

    // --- Modal Registration for Auth ---
    function bindAuthModalButtons() {
        const btnLogin = document.getElementById('btn-open-login');
        const btnRegister = document.getElementById('btn-open-register');
        const loginModal = document.getElementById('login-modal');
        const registerModal = document.getElementById('register-modal');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const switchToRegister = document.getElementById('switch-to-register');
        const switchToLogin = document.getElementById('switch-to-login');
        const closeBtns = document.querySelectorAll('.close-btn');

        if(btnLogin) btnLogin.addEventListener('click', () => {
            if (loginForm) loginForm.reset();
            loginModal.classList.add('show');
        });
        if(btnRegister) btnRegister.addEventListener('click', () => {
            if (registerForm) registerForm.reset();
            registerModal.classList.add('show');
        });
        
        if(switchToRegister) switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            if (registerForm) registerForm.reset();
            loginModal.classList.remove('show');
            registerModal.classList.add('show');
        });

        if(switchToLogin) switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginForm) loginForm.reset();
            registerModal.classList.remove('show');
            loginModal.classList.add('show');
        });
        
        // Close Modals
        closeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('show');
                } else {
                    const parentModal = btn.closest('.modal');
                    if (parentModal) parentModal.classList.remove('show');
                }
            });
        });

        // Ensure close logic on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('show');
            }
        });
    }

    // --- Password Visibility Toggle ---
    function initializePasswordToggles() {
        const toggleBtns = document.querySelectorAll('.password-toggle');
        
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
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

    // --- Premium Hero Carousel ---
    let currentSlide = 1;
    const totalSlides = 3;
    const slideInterval = 5000; // 5 seconds

    function nextSlide() {
        const activeSlide = document.querySelector('.carousel-slide.active');
        if (activeSlide) activeSlide.classList.remove('active');
        
        currentSlide = (currentSlide % totalSlides) + 1;
        const nextSlideEl = document.getElementById(`slide-${currentSlide}`);
        if (nextSlideEl) nextSlideEl.classList.add('active');
    }

    setInterval(nextSlide, slideInterval);

    // --- Reveal on Scroll ---
    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    };

    const revealObserver = new IntersectionObserver(revealCallback, {
        threshold: 0.1
    });

    document.querySelectorAll('.reveal').forEach(el => {
        revealObserver.observe(el);
    });

    // --- Navigation & FAQ Interactivity ---
    const navLinks = document.querySelectorAll('.nav-link');
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    // Smooth Scroll Logic
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            
            if (targetId === '#security') {
                e.preventDefault();
                const slides = document.querySelectorAll('.carousel-slide');
                slides.forEach(s => s.classList.remove('active'));
                const securitySlide = document.getElementById('slide-2');
                if (securitySlide) securitySlide.classList.add('active');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            if (targetId.startsWith('#')) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    const headerHeight = 80;
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerHeight;
                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                }
            }
        });
    });

    // FAQ Toggle Logic
    faqQuestions.forEach(q => {
        q.addEventListener('click', () => {
            const item = q.parentElement;
            item.classList.toggle('active');
            const icon = q.querySelector('i');
            if (item.classList.contains('active')) {
                icon.style.transform = 'rotate(180deg)';
                icon.style.color = 'var(--primary-yellow)';
            } else {
                icon.style.transform = 'rotate(0deg)';
                icon.style.color = 'var(--gray-mid)';
            }
        });
    });

    // --- Security Menu & Modal Interactivity ---
    const linkSecurityOverview = document.getElementById('link-security-overview');
    const linkSecurityTerms = document.getElementById('link-security-terms');
    const securityTermsModal = document.getElementById('security-terms-modal');

    if (linkSecurityOverview) {
        linkSecurityOverview.addEventListener('click', (e) => {
            e.preventDefault();
            const slides = document.querySelectorAll('.carousel-slide');
            slides.forEach(s => s.classList.remove('active'));
            const securitySlide = document.getElementById('slide-2');
            if (securitySlide) securitySlide.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (linkSecurityTerms) {
        linkSecurityTerms.addEventListener('click', (e) => {
            e.preventDefault();
            if (securityTermsModal) securityTermsModal.classList.add('show');
        });
    }

    bindAuthModalButtons();
    initializePasswordToggles();
});
