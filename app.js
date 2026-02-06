// ===========================
// GASTOS MENSUALES PWA - APP.JS
// ===========================

class GastosApp {
    constructor() {
        this.currentScreen = 'welcome';
        this.currentExpenseTab = 'fixed';
        this.isLoggedIn = false;
        this.isPinCreating = false;
        this.temporaryPin = '';
        this.tourStep = 0;
        this.deferredPrompt = null;
        
        this.init();
    }

    // ===========================
    // INITIALIZATION
    // ===========================
    
    init() {
        this.loadTheme();
        this.initEventListeners();
        this.initPWA();
        this.checkAuth();
        
        // Hide loading after 2 seconds
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
        }, 2000);
    }

    initEventListeners() {
        // Auth events
        document.getElementById('login-btn').addEventListener('click', () => this.showScreen('login'));
        document.getElementById('register-btn').addEventListener('click', () => this.showScreen('register'));
        document.getElementById('back-to-welcome').addEventListener('click', () => this.showScreen('welcome'));
        document.getElementById('back-to-welcome-login').addEventListener('click', () => this.showScreen('welcome'));
        
        // Forms
        document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        
        // Password strength and visibility (register)
        const toggleBtns = document.querySelectorAll('.toggle-register-password');
        const pwdInput = document.getElementById('register-password');
        const pwdConfirmInput = document.getElementById('register-password-confirm');
        if (toggleBtns && toggleBtns.length) toggleBtns.forEach(b => b.addEventListener('click', () => this.toggleRegisterPasswordVisibility()));
        if (pwdInput) pwdInput.addEventListener('input', (e) => this.updatePasswordStrength(e.target.value));
        if (pwdConfirmInput) pwdConfirmInput.addEventListener('input', () => this.updatePasswordStrength(pwdInput.value));
        
        // PIN inputs
        this.initPinInputs();
        
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
        
        // Navigation
        this.initBottomNavigation();
        
        // Quick actions
        document.getElementById('add-expense-btn').addEventListener('click', () => this.showExpenseModal());
        document.getElementById('add-income-btn').addEventListener('click', () => this.showIncomeModal());
        document.getElementById('add-card-transaction-btn').addEventListener('click', () => this.showCardTransactionModal());
        document.getElementById('add-expense-main').addEventListener('click', () => this.showExpenseModal());
        
        // Profile
        document.getElementById('change-photo').addEventListener('click', () => document.getElementById('photo-input').click());
        document.getElementById('photo-input').addEventListener('change', (e) => this.handlePhotoChange(e));
        document.getElementById('logout').addEventListener('click', () => this.logout());
        document.getElementById('settings').addEventListener('click', () => this.showSettingsModal());
        
        // Expense tabs
        document.getElementById('fixed-expenses-tab').addEventListener('click', () => this.switchExpenseTab('fixed'));
        document.getElementById('variable-expenses-tab').addEventListener('click', () => this.switchExpenseTab('variable'));
        
        // Tour
        document.getElementById('tour-skip').addEventListener('click', () => this.skipTour());
        document.getElementById('tour-next').addEventListener('click', () => this.nextTourStep());
        document.getElementById('tour-prev').addEventListener('click', () => this.prevTourStep());
        
        // PWA install
        document.getElementById('install-app').addEventListener('click', () => this.installPWA());
        document.getElementById('install-dismiss').addEventListener('click', () => this.dismissInstallBanner());
        
        // Hash change for routing
        window.addEventListener('hashchange', () => this.handleRoute());
    }

    initPinInputs() {
        // Initialize entry section inputs
        this.initPinGroup('#pin-entry-section', 'entry');
        
        // Initialize confirm section inputs
        this.initPinGroup('#pin-confirm-section', 'confirm');
    }
    
    initPinGroup(sectionId, group) {
        const section = document.querySelector(sectionId);
        const inputs = section.querySelectorAll('.pin-input');
        
        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (e.target.value.length === 1) {
                    if (index < inputs.length - 1) {
                        inputs[index + 1].focus();
                    } else {
                        // Last input - validate
                        console.log(`[DEBUG] Last input filled in ${group} section`);
                        this.validatePin(group);
                    }
                }
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value) {
                    if (index > 0) {
                        inputs[index - 1].focus();
                    }
                }
            });
        });
    }

    // ===========================
    // AUTHENTICATION
    // ===========================
    
    handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const phone = document.getElementById('register-phone').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm') ? document.getElementById('register-password-confirm').value : '';
        
        // Check confirm
        if (password !== passwordConfirm) {
            this.showToast('Las contraseñas no coinciden', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showToast('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        if (!email.includes('@gmail.com')) {
            this.showToast('Debe ser una dirección de Gmail válida', 'error');
            return;
        }
        
        const userData = { name, phone, email, password, avatarBase64: '' };
        localStorage.setItem('gm_user', JSON.stringify(userData));
        
        this.showToast('Cuenta creada correctamente', 'success');
        setTimeout(() => this.showScreen('login'), 1500);
    }

    handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const userData = JSON.parse(localStorage.getItem('gm_user'));
        
        if (!userData || userData.email !== email || userData.password !== password) {
            this.showToast('Credenciales incorrectas', 'error');
            return;
        }
        
        localStorage.setItem('gm_session', JSON.stringify({ loggedIn: true, email }));
        this.showScreen('pin');
    }

    validatePin(group) {
        // DEBUG LOGS
        console.log('[DEBUG PIN] =================');
        console.log('[DEBUG PIN] Group:', group);
        console.log('[DEBUG PIN] isPinCreating:', this.isPinCreating);
        
        const confirmSection = document.getElementById('pin-confirm-section');
        const confirmSectionHidden = confirmSection.classList.contains('hidden');
        console.log('[DEBUG PIN] confirmSectionHidden:', confirmSectionHidden);
        
        // Select correct inputs based on group
        let inputs;
        if (group === 'entry') {
            inputs = document.querySelectorAll('#pin-entry-section .pin-input');
        } else if (group === 'confirm') {
            inputs = document.querySelectorAll('#pin-confirm-section .pin-input');
        } else {
            console.error('[DEBUG PIN] Invalid group:', group);
            return;
        }
        
        console.log('[DEBUG PIN] totalPinInputs:', inputs.length);
        
        const pin = Array.from(inputs).map(i => i.value).join('');
        console.log('[DEBUG PIN] enteredPin:', pin);
        
        if (pin.length !== 4) {
            console.log('[DEBUG PIN] Pin length not 4, returning');
            return;
        }
        
        const storedPin = localStorage.getItem('gm_pin');
        console.log('[DEBUG PIN] storedPin:', storedPin);
        
        // First time - create PIN
        if (!storedPin) {
            if (group === 'entry' && !this.isPinCreating) {
                console.log('[DEBUG PIN] First time entry - storing temp PIN');
                this.temporaryPin = pin;
                this.isPinCreating = true;
                this.showPinConfirmation();
                return;
            }
            
            if (group === 'confirm' && this.isPinCreating) {
                console.log('[DEBUG PIN] Confirming PIN');
                this.validatePinConfirmation(pin);
                return;
            }
        }
        
        // Validate existing PIN
        if (group === 'entry' && storedPin) {
            if (pin === storedPin) {
                console.log('[DEBUG PIN] PIN correct - calling showMainApp');
                this.isLoggedIn = true;
                this.showToast('PIN correcto ✅', 'success');
                this.showMainApp();
            } else {
                console.log('[DEBUG PIN] PIN incorrect');
                this.showPinError();
            }
        }
        
        console.log('[DEBUG PIN] =================');
    }


    validatePinConfirmation(confirmPin) {
        console.log('[DEBUG PIN] Confirming PIN:', confirmPin, 'vs temp:', this.temporaryPin);
        
        if (this.temporaryPin === confirmPin) {
            localStorage.setItem('gm_pin', this.temporaryPin);
            this.isLoggedIn = true;
            this.showToast('PIN creado ✅', 'success');
            console.log('[DEBUG PIN] PIN created successfully - calling showMainApp');
            this.showMainApp();
        } else {
            this.showToast('Los PINs no coinciden', 'error');
            this.clearPinInputs();
            this.isPinCreating = false;
            document.getElementById('pin-confirm-section').classList.add('hidden');
            document.getElementById('pin-title').textContent = 'Crea tu PIN';
            document.getElementById('pin-subtitle').textContent = 'Ingresa un PIN de 4 dígitos';
        }
    }


    showPinConfirmation() {
        document.getElementById('pin-confirm-section').classList.remove('hidden');
        document.getElementById('pin-title').textContent = 'Confirma tu PIN';
        document.getElementById('pin-subtitle').textContent = 'Ingresa nuevamente tu PIN';
        
        // Disable entry inputs
        const entryInputs = document.querySelectorAll('#pin-entry-section .pin-input');
        entryInputs.forEach(input => {
            input.disabled = true;
            input.style.opacity = '0.5';
        });
        
        // Clear and focus confirm inputs
        const confirmInputs = document.querySelectorAll('#pin-confirm-section .pin-input');
        confirmInputs.forEach(i => i.value = '');
        if (confirmInputs[0]) {
            confirmInputs[0].focus();
        }
    }


    showPinError() {
        const pinScreen = document.getElementById('pin-screen');
        pinScreen.classList.add('animate-shake');
        
        // Vibration if supported
        if (navigator.vibrate) {
            navigator.vibrate([100, 30, 100]);
        }
        
        this.showToast('PIN incorrecto', 'error');
        this.clearPinInputs();
        
        setTimeout(() => {
            pinScreen.classList.remove('animate-shake');
        }, 500);
    }

    clearPinInputs() {
        // Clear entry inputs and re-enable them
        const entryInputs = document.querySelectorAll('#pin-entry-section .pin-input');
        entryInputs.forEach(input => {
            input.value = '';
            input.disabled = false;
            input.style.opacity = '1';
        });

        // Clear confirm inputs
        const confirmInputs = document.querySelectorAll('#pin-confirm-section .pin-input');
        confirmInputs.forEach(i => i.value = '');

        // Focus first entry input
        if (entryInputs[0]) {
            entryInputs[0].focus();
        }
    }

    // ===========================
    // PASSWORD STRENGTH / VISIBILITY (Register)
    // ===========================
    updatePasswordStrength(pwd) {
        const bar = document.getElementById('password-strength-bar');
        const text = document.getElementById('password-strength-text');
        if (!bar || !text) return;

        let score = 0;
        if (pwd.length >= 6) score += 1;
        if (pwd.length >= 8) score += 1;
        if (/[A-Z]/.test(pwd)) score += 1;
        if (/[0-9]/.test(pwd)) score += 1;
        if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

        // Map score (0-5) to width and color
        const pct = Math.min(100, Math.round((score / 5) * 100));
        bar.style.width = pct + '%';

        if (score <= 1) {
            bar.style.background = 'linear-gradient(90deg,#ef4444,#f97316)';
            text.textContent = 'Muy débil';
        } else if (score === 2) {
            bar.style.background = 'linear-gradient(90deg,#f97316,#f59e0b)';
            text.textContent = 'Débil';
        } else if (score === 3) {
            bar.style.background = 'linear-gradient(90deg,#f59e0b,#fbbf24)';
            text.textContent = 'Medio';
        } else if (score === 4) {
            bar.style.background = 'linear-gradient(90deg,#10b981,#059669)';
            text.textContent = 'Bueno';
        } else {
            bar.style.background = 'linear-gradient(90deg,#059669,#047857)';
            text.textContent = 'Fuerte';
        }
    }

    toggleRegisterPasswordVisibility() {
        const pwd = document.getElementById('register-password');
        const pwdConfirm = document.getElementById('register-password-confirm');
        const eyeOpens = document.querySelectorAll('.eye-open-icon');
        const eyeCloseds = document.querySelectorAll('.eye-closed-icon');

        if (!pwd) return;

        const makeText = (el) => { if (el) el.type = 'text'; };
        const makePassword = (el) => { if (el) el.type = 'password'; };

        if (pwd.type === 'password') {
            makeText(pwd);
            makeText(pwdConfirm);
            eyeOpens.forEach(el => el.classList.add('hidden'));
            eyeCloseds.forEach(el => el.classList.remove('hidden'));
        } else {
            makePassword(pwd);
            makePassword(pwdConfirm);
            eyeOpens.forEach(el => el.classList.remove('hidden'));
            eyeCloseds.forEach(el => el.classList.add('hidden'));
        }
    }


    checkAuth() {
        const session = JSON.parse(localStorage.getItem('gm_session'));
        if (session && session.loggedIn) {
            this.showScreen('pin');
        }
    }

    logout() {
        this.showConfirm('¿Cerrar sesión?', 'Se perderán los datos no guardados', () => {
            localStorage.removeItem('gm_session');
            this.isLoggedIn = false;
            this.showScreen('welcome');
            this.showToast('Sesión cerrada correctamente', 'success');
        });
    }

    // ===========================
    // NAVIGATION & ROUTING
    // ===========================
    
    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('[id$="-screen"]').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Show auth container or main app
        if (['welcome', 'register', 'login', 'pin'].includes(screenId)) {
            document.getElementById('auth-container').classList.remove('hidden');
            document.getElementById('main-app').classList.add('hidden');
            document.getElementById('bottom-nav').classList.add('hidden');
        } else {
            document.getElementById('auth-container').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            document.getElementById('bottom-nav').classList.remove('hidden');
        }
        
        // Show target screen
        document.getElementById(`${screenId}-screen`).classList.remove('hidden');
        this.currentScreen = screenId;

        // Prevent vertical scroll when PIN screen is active (keep it centered)
        if (screenId === 'pin') {
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
        } else {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        }
        
        // Update hash without triggering hashchange
        history.replaceState(null, null, `#${screenId}`);
        
        // Load screen data
        this.loadScreenData(screenId);
    }

    showMainApp() {
        console.log('[DEBUG PIN] showMainApp called');
        
        this.loadDemoData();
        this.loadUserProfile();
        
        // Force navigation to home
        console.log('[DEBUG PIN] Forcing navigation to #home');
        window.location.hash = '#home';
        
        this.showScreen('home');
        this.updateNavigation('home');
        
        console.log('[DEBUG PIN] showMainApp completed - should be on home now');
        
        // Show tour if first time
        const tourDone = localStorage.getItem('gm_tour_done');
        if (!tourDone) {
            setTimeout(() => this.startTour(), 1000);
        }
    }

    initBottomNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const bubble = document.querySelector('.nav-bubble');
        
        navItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                const screen = item.dataset.screen;
                this.updateNavigation(screen);
                this.showScreen(screen);
            });
        });
    }

    updateNavigation(activeScreen) {
        const navItems = document.querySelectorAll('.nav-item');
        const bubble = document.querySelector('.nav-bubble');
        const bubbleIcon = document.getElementById('bubble-icon');
        
        // Find active nav item
        let activeIndex = 0;
        navItems.forEach((item, index) => {
            if (item.dataset.screen === activeScreen) {
                activeIndex = index;
            }
        });
        
        // Move bubble: position it centered on the active nav item
        if (navItems[activeIndex]) {
            const activeItem = navItems[activeIndex];
            // mark active nav item so its icon can be hidden via CSS
            navItems.forEach(it => it.classList.remove('nav-active'));
            activeItem.classList.add('nav-active');
            // offsetLeft is relative to the nav container (which is positioned relative)
            const itemCenter = activeItem.offsetLeft + (activeItem.offsetWidth / 2);
            const bubbleHalf = bubble.offsetWidth / 2 || 28;
            const leftPosition = Math.round(itemCenter - bubbleHalf);
            bubble.style.left = `${leftPosition}px`;
            // quick pop animation
            bubble.classList.remove('animate-pop');
            // force reflow to restart animation
            void bubble.offsetWidth;
            bubble.classList.add('animate-pop');
            setTimeout(() => bubble.classList.remove('animate-pop'), 420);
        }
        
        // Update bubble icon
        const icons = {
            home: 'M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z',
            history: 'M13.5,8H12V13L16.28,15.54L17,14.33L13.5,12.25V8M13,3A9,9 0 0,0 4,12H1L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3',
            profile: 'M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z'
        };
        
        bubbleIcon.querySelector('path').setAttribute('d', icons[activeScreen]);
    }

    handleRoute() {
        const hash = window.location.hash.slice(1) || 'home';
        if (this.isLoggedIn && ['home', 'expenses', 'history', 'profile'].includes(hash)) {
            this.showScreen(hash);
            this.updateNavigation(hash);
        }
    }

    loadScreenData(screenId) {
        switch(screenId) {
            case 'home':
                this.updateDashboard();
                this.loadRecentTransactions();
                break;
            case 'expenses':
                this.loadExpenses();
                break;
            case 'history':
                this.loadHistory();
                break;
            case 'profile':
                this.loadProfile();
                break;
        }
    }

    // ===========================
    // DATA MANAGEMENT
    // ===========================
    
    loadDemoData() {
        // Only load demo data if no data exists
        if (!localStorage.getItem('gm_expenses')) {
            const demoExpenses = [
                { id: 1, name: 'Renta', amount: 8000, category: 'Vivienda', type: 'fixed', status: 'pending', date: new Date().toISOString() },
                { id: 2, name: 'Supermercado', amount: 1500, category: 'Alimentación', type: 'variable', status: 'paid', date: new Date().toISOString() },
                { id: 3, name: 'Servicios', amount: 800, category: 'Servicios', type: 'fixed', status: 'pending', date: new Date().toISOString() },
                { id: 4, name: 'Gasolina', amount: 600, category: 'Transporte', type: 'variable', status: 'paid', date: new Date().toISOString() },
                { id: 5, name: 'Internet', amount: 500, category: 'Servicios', type: 'fixed', status: 'paid', date: new Date().toISOString() }
            ];
            localStorage.setItem('gm_expenses', JSON.stringify(demoExpenses));
        }
        
        if (!localStorage.getItem('gm_cards')) {
            const demoCards = [
                { id: 1, name: 'Visa Principal', type: 'credit', limit: 50000, debt: 15000, available: 35000, cutDate: '15', payDate: '10', logo: '💳' },
                { id: 2, name: 'Débito BBVA', type: 'debit', limit: 10000, debt: 0, available: 10000, cutDate: '', payDate: '', logo: '💰' }
            ];
            localStorage.setItem('gm_cards', JSON.stringify(demoCards));
        }
        
        if (!localStorage.getItem('gm_incomes')) {
            const demoIncomes = [
                { id: 1, name: 'Salario', amount: 25000, date: new Date().toISOString(), received: true },
                { id: 2, name: 'Freelance', amount: 5000, date: new Date().toISOString(), received: false }
            ];
            localStorage.setItem('gm_incomes', JSON.stringify(demoIncomes));
        }
        
        if (!localStorage.getItem('gm_expense_entries')) {
            localStorage.setItem('gm_expense_entries', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('gm_card_tx')) {
            localStorage.setItem('gm_card_tx', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('gm_reminders')) {
            const demoReminders = [
                { id: 1, title: 'Pagar renta', date: new Date(Date.now() + 86400000).toISOString(), type: 'expense' },
                { id: 2, title: 'Corte tarjeta Visa', date: new Date(Date.now() + 172800000).toISOString(), type: 'card' }
            ];
            localStorage.setItem('gm_reminders', JSON.stringify(demoReminders));
        }
    }

    getData(key) {
        return JSON.parse(localStorage.getItem(key) || '[]');
    }

    setData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    // ===========================
    // DASHBOARD
    // ===========================
    
    updateDashboard() {
        const expenses = this.getData('gm_expenses');
        const incomes = this.getData('gm_incomes');
        const cards = this.getData('gm_cards');
        
        // Calculate totals
        const totalSpent = expenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
        const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
        const totalDebt = cards.reduce((sum, c) => sum + c.debt, 0);
        const totalAvailable = cards.reduce((sum, c) => sum + c.available, 0);
        
        // Update UI
        document.getElementById('total-spent').textContent = `$${totalSpent.toLocaleString()}`;
        document.getElementById('total-income').textContent = `$${totalIncome.toLocaleString()}`;
        document.getElementById('total-debt').textContent = `$${totalDebt.toLocaleString()}`;
        document.getElementById('total-available').textContent = `$${totalAvailable.toLocaleString()}`;
    }

    loadRecentTransactions() {
        const expenses = this.getData('gm_expenses');
        const recentContainer = document.getElementById('recent-transactions');
        
        if (expenses.length === 0) {
            recentContainer.innerHTML = '<p class="text-gray-400 text-center py-4">No hay transacciones recientes</p>';
            return;
        }
        
        const recentExpenses = expenses.slice(0, 5);
        recentContainer.innerHTML = recentExpenses.map(expense => `
            <div class="flex items-center justify-between p-3 glass rounded-xl">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <span class="text-sm">💰</span>
                    </div>
                    <div>
                        <p class="font-medium">${expense.name}</p>
                        <p class="text-xs text-gray-400">${expense.category}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold text-red-400">-$${expense.amount.toLocaleString()}</p>
                    <p class="text-xs ${expense.status === 'paid' ? 'text-green-400' : 'text-orange-400'}">${expense.status === 'paid' ? 'Pagado' : 'Pendiente'}</p>
                </div>
            </div>
        `).join('');
    }

    // ===========================
    // EXPENSES
    // ===========================
    
    switchExpenseTab(tab) {
        this.currentExpenseTab = tab;
        
        // Update tab styles
        document.getElementById('fixed-expenses-tab').className = `flex-1 py-3 px-4 rounded-xl font-semibold transition-colors ${tab === 'fixed' ? 'tab-active' : 'tab-inactive'}`;
        document.getElementById('variable-expenses-tab').className = `flex-1 py-3 px-4 rounded-xl font-semibold transition-colors ${tab === 'variable' ? 'tab-active' : 'tab-inactive'}`;
        
        this.loadExpenses();
    }

    loadExpenses() {
        const expenses = this.getData('gm_expenses');
        const filteredExpenses = expenses.filter(e => e.type === this.currentExpenseTab);
        const listContainer = document.getElementById('expenses-list');
        
        if (filteredExpenses.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-8">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-2xl glass flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <p class="text-gray-400 mb-2">No hay gastos ${this.currentExpenseTab === 'fixed' ? 'fijos' : 'variables'}</p>
                    <button onclick="app.showExpenseModal()" class="text-purple-400 hover:text-purple-300 transition-colors">Agregar el primero</button>
                </div>
            `;
            return;
        }
        
        listContainer.innerHTML = filteredExpenses.map(expense => `
            <div class="glass rounded-2xl p-4 hover:bg-white/20 transition-colors cursor-pointer" onclick="app.showExpenseDetail(${expense.id})">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-semibold">${expense.name}</h3>
                    <span class="px-2 py-1 text-xs rounded-full ${expense.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}">
                        ${expense.status === 'paid' ? 'Pagado' : 'Pendiente'}
                    </span>
                </div>
                <div class="flex items-center justify-between">
                    <p class="text-gray-400 text-sm">${expense.category}</p>
                    <p class="font-bold text-lg">$${expense.amount.toLocaleString()}</p>
                </div>
            </div>
        `).join('');
    }

    showExpenseModal(expenseId = null) {
        const isEdit = expenseId !== null;
        const expense = isEdit ? this.getData('gm_expenses').find(e => e.id === expenseId) : null;
        
        const modal = this.createModal(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">${isEdit ? 'Editar' : 'Agregar'} Gasto</h3>
                <form id="expense-form" class="space-y-4">
                    <div>
                        <input type="text" id="expense-name" placeholder="Nombre del gasto" value="${expense?.name || ''}" required
                            class="w-full p-3 glass rounded-xl placeholder-gray-400 text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all">
                    </div>
                    <div>
                        <input type="number" id="expense-amount" placeholder="Cantidad" value="${expense?.amount || ''}" required
                            class="w-full p-3 glass rounded-xl placeholder-gray-400 text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all">
                    </div>
                    <div>
                        <select id="expense-category" required
                            class="w-full p-3 glass rounded-xl text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all">
                            <option value="">Seleccionar categoría</option>
                            <option value="Vivienda" ${expense?.category === 'Vivienda' ? 'selected' : ''}>Vivienda</option>
                            <option value="Alimentación" ${expense?.category === 'Alimentación' ? 'selected' : ''}>Alimentación</option>
                            <option value="Transporte" ${expense?.category === 'Transporte' ? 'selected' : ''}>Transporte</option>
                            <option value="Servicios" ${expense?.category === 'Servicios' ? 'selected' : ''}>Servicios</option>
                            <option value="Entretenimiento" ${expense?.category === 'Entretenimiento' ? 'selected' : ''}>Entretenimiento</option>
                            <option value="Salud" ${expense?.category === 'Salud' ? 'selected' : ''}>Salud</option>
                            <option value="Otros" ${expense?.category === 'Otros' ? 'selected' : ''}>Otros</option>
                        </select>
                    </div>
                    <div>
                        <select id="expense-type" required
                            class="w-full p-3 glass rounded-xl text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all">
                            <option value="">Tipo de gasto</option>
                            <option value="fixed" ${expense?.type === 'fixed' ? 'selected' : ''}>Fijo mensual</option>
                            <option value="variable" ${expense?.type === 'variable' ? 'selected' : ''}>Variable</option>
                        </select>
                    </div>
                    <div class="flex space-x-3 pt-4">
                        <button type="button" onclick="app.closeModal()" 
                            class="flex-1 py-3 glass rounded-xl hover:bg-white/20 transition-colors">Cancelar</button>
                        <button type="submit" 
                            class="flex-1 py-3 bg-purple-500 rounded-xl hover:bg-purple-600 transition-colors">${isEdit ? 'Guardar' : 'Agregar'}</button>
                    </div>
                </form>
            </div>
        `);
        
        document.getElementById('expense-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveExpense(expenseId);
        });
    }

    saveExpense(expenseId = null) {
        const name = document.getElementById('expense-name').value;
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const category = document.getElementById('expense-category').value;
        const type = document.getElementById('expense-type').value;
        
        let expenses = this.getData('gm_expenses');
        
        if (expenseId) {
            // Edit existing
            const index = expenses.findIndex(e => e.id === expenseId);
            expenses[index] = { ...expenses[index], name, amount, category, type };
        } else {
            // Add new
            const newExpense = {
                id: Date.now(),
                name,
                amount,
                category,
                type,
                status: 'pending',
                date: new Date().toISOString()
            };
            expenses.push(newExpense);
        }
        
        this.setData('gm_expenses', expenses);
        this.closeModal();
        this.loadExpenses();
        this.updateDashboard();
        this.showToast(`Gasto ${expenseId ? 'actualizado' : 'agregado'} correctamente`, 'success');
    }

    // ===========================
    // PROFILE & SETTINGS
    // ===========================
    
    loadUserProfile() {
        const userData = JSON.parse(localStorage.getItem('gm_user'));
        if (userData) {
            document.getElementById('user-name-display').textContent = userData.name;
            
            if (userData.avatarBase64) {
                document.getElementById('user-avatar').src = userData.avatarBase64;
                document.getElementById('user-avatar').classList.remove('hidden');
                document.getElementById('default-avatar').classList.add('hidden');
                
                document.getElementById('profile-avatar').src = userData.avatarBase64;
                document.getElementById('profile-avatar').classList.remove('hidden');
                document.getElementById('profile-default-avatar').classList.add('hidden');
            }
        }
    }

    loadProfile() {
        const userData = JSON.parse(localStorage.getItem('gm_user'));
        if (userData) {
            document.getElementById('profile-name').textContent = userData.name;
            document.getElementById('profile-email').textContent = userData.email;
        }
        // Initialize install banner toggle state
        const installToggle = document.getElementById('install-banner-toggle');
        if (installToggle) {
            const dismissed = localStorage.getItem('gm_install_dismissed');
            // If dismissed flag exists, toggle should be unchecked (don't show banner)
            installToggle.checked = !dismissed;
            installToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    // user wants to see the banner -> remove dismissed flag
                    localStorage.removeItem('gm_install_dismissed');
                    this.showToast('Se mostrará la sugerencia de instalación', 'success');
                } else {
                    localStorage.setItem('gm_install_dismissed', '1');
                    this.showToast('Sugerencia de instalación desactivada', 'info');
                    // hide banner immediately if visible
                    const el = document.getElementById('install-banner');
                    if (el) el.classList.add('hidden');
                }
            });
        }
    }

    handlePhotoChange(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result;
                
                // Update user data
                const userData = JSON.parse(localStorage.getItem('gm_user'));
                userData.avatarBase64 = base64;
                localStorage.setItem('gm_user', JSON.stringify(userData));
                
                // Update UI
                document.getElementById('user-avatar').src = base64;
                document.getElementById('user-avatar').classList.remove('hidden');
                document.getElementById('default-avatar').classList.add('hidden');
                
                document.getElementById('profile-avatar').src = base64;
                document.getElementById('profile-avatar').classList.remove('hidden');
                document.getElementById('profile-default-avatar').classList.add('hidden');
                
                this.showToast('Foto actualizada correctamente', 'success');
            };
            reader.readAsDataURL(file);
        }
    }

    showSettingsModal() {
        const modal = this.createModal(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Configuración</h3>
                <div class="space-y-4">
                    <div class="flex items-center justify-between p-4 glass rounded-xl">
                        <div>
                            <p class="font-medium">Modo oscuro</p>
                            <p class="text-sm text-gray-400">Cambiar tema de la aplicación</p>
                        </div>
                        <button id="theme-toggle-modal" onclick="app.toggleTheme()" class="p-2 glass rounded-lg hover:bg-white/20 transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.4 6.35,17.41C9.37,20.43 14,20.54 17.33,17.97Z" fill="currentColor"/>
                            </svg>
                        </button>
                    </div>
                    
                    <button onclick="app.startTour()" class="w-full p-4 glass rounded-xl flex items-center justify-between hover:bg-white/20 transition-colors">
                        <div class="text-left">
                            <p class="font-medium">Reiniciar guía</p>
                            <p class="text-sm text-gray-400">Ver el recorrido nuevamente</p>
                        </div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8Z" fill="currentColor"/>
                        </svg>
                    </button>
                    
                    <div class="border-t border-white/20 pt-4">
                        <button onclick="app.closeModal()" class="w-full py-3 bg-purple-500 rounded-xl hover:bg-purple-600 transition-colors">Cerrar</button>
                    </div>
                </div>
            </div>
        `);
    }

    // ===========================
    // TOUR
    // ===========================
    
    startTour() {
        this.closeModal();
        this.tourStep = 0;
        localStorage.removeItem('gm_tour_done');
        document.getElementById('tour-overlay').classList.remove('hidden');
        this.showTourStep();
    }

    showTourStep() {
        const steps = [
            {
                title: '¡Bienvenido a Gastos Mensuales!',
                text: 'Tu asistente personal para controlar tus finanzas de manera inteligente.',
                highlight: '#quick-actions'
            },
            {
                title: 'Dashboard Principal',
                text: 'Aquí puedes ver el resumen de tus gastos, ingresos y tarjetas de un vistazo.',
                highlight: '.grid.grid-cols-2.gap-4'
            },
            {
                title: 'Acciones Rápidas',
                text: 'Agrega gastos, ingresos o transacciones de tarjeta desde estos botones.',
                highlight: '#quick-actions'
            },
            {
                title: 'Transacciones Recientes',
                text: 'Revisa tus últimas transacciones y su estado actual.',
                highlight: '#recent-section'
            },
            {
                title: 'Navegación',
                text: 'Usa la barra inferior para navegar entre las diferentes secciones de la app.',
                highlight: '#bottom-nav'
            }
        ];
        
        const step = steps[this.tourStep];
        document.getElementById('tour-title').textContent = step.title;
        document.getElementById('tour-text').textContent = step.text;
        
        // Update dots
        document.querySelectorAll('.tour-dot').forEach((dot, index) => {
            dot.className = `tour-dot w-2 h-2 rounded-full ${index === this.tourStep ? 'bg-purple-500' : 'bg-white/30'}`;
        });
        
        // Show/hide buttons
        document.getElementById('tour-prev').classList.toggle('hidden', this.tourStep === 0);
        document.getElementById('tour-next').textContent = this.tourStep === steps.length - 1 ? 'Finalizar' : 'Siguiente';
        
        // Highlight element
        this.highlightElement(step.highlight);
    }

    highlightElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            const rect = element.getBoundingClientRect();
            const highlight = document.getElementById('tour-highlight');
            
            // Create a "hole" in the overlay to highlight the element
            highlight.style.background = `
                radial-gradient(circle at ${rect.left + rect.width/2}px ${rect.top + rect.height/2}px, 
                transparent ${Math.max(rect.width, rect.height) + 20}px, 
                rgba(0,0,0,0.5) ${Math.max(rect.width, rect.height) + 25}px)
            `;
        }
    }

    nextTourStep() {
        const totalSteps = 5;
        if (this.tourStep < totalSteps - 1) {
            this.tourStep++;
            this.showTourStep();
        } else {
            this.endTour();
        }
    }

    prevTourStep() {
        if (this.tourStep > 0) {
            this.tourStep--;
            this.showTourStep();
        }
    }

    skipTour() {
        this.endTour();
    }

    endTour() {
        localStorage.setItem('gm_tour_done', 'true');
        document.getElementById('tour-overlay').classList.add('hidden');
        this.showToast('¡Recorrido completado! Ya puedes usar la aplicación', 'success');
    }

    // ===========================
    // MODALS & TOASTS
    // ===========================
    
    createModal(content) {
        const modalContainer = document.getElementById('modals-container');
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop bg-black/50';
        modal.innerHTML = `
            <div class="w-full max-w-md glass rounded-2xl shadow-2xl animate-bounce-in">
                ${content}
            </div>
        `;
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
        
        modalContainer.appendChild(modal);
        return modal;
    }

    closeModal() {
        const modalContainer = document.getElementById('modals-container');
        modalContainer.innerHTML = '';
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} p-4 rounded-xl shadow-lg animate-slide-in-right flex items-center space-x-3`;
        
        const icons = {
            success: '✓',
            error: '✗',
            info: 'ℹ'
        };
        
        toast.innerHTML = `
            <div class="w-8 h-8 rounded-full flex items-center justify-center ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'}">
                <span class="text-white font-bold">${icons[type]}</span>
            </div>
            <p class="flex-1">${message}</p>
            <button onclick="this.parentElement.remove()" class="text-gray-400 hover:text-white transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" fill="currentColor"/>
                </svg>
            </button>
        `;
        
        document.getElementById('toast-container').appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    showConfirm(title, message, onConfirm) {
        const modal = this.createModal(`
            <div class="p-6 text-center">
                <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2Z" fill="currentColor"/>
                    </svg>
                </div>
                <h3 class="text-xl font-bold mb-2">${title}</h3>
                <p class="text-gray-300 mb-6">${message}</p>
                <div class="flex space-x-3">
                    <button onclick="app.closeModal()" class="flex-1 py-3 glass rounded-xl hover:bg-white/20 transition-colors">Cancelar</button>
                    <button onclick="app.confirmAction()" class="flex-1 py-3 bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors">Confirmar</button>
                </div>
            </div>
        `);
        
        this.pendingConfirmAction = onConfirm;
    }

    confirmAction() {
        if (this.pendingConfirmAction) {
            this.pendingConfirmAction();
            this.pendingConfirmAction = null;
        }
        this.closeModal();
    }

    // ===========================
    // THEME
    // ===========================
    
    loadTheme() {
        const theme = localStorage.getItem('gm_theme') || 'light';
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.getElementById('sun-icon').classList.add('hidden');
            document.getElementById('moon-icon').classList.remove('hidden');
        }
    }

    toggleTheme() {
        const isDark = document.documentElement.classList.contains('dark');
        
        if (isDark) {
            document.documentElement.classList.remove('dark');
            document.getElementById('sun-icon').classList.remove('hidden');
            document.getElementById('moon-icon').classList.add('hidden');
            localStorage.setItem('gm_theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            document.getElementById('sun-icon').classList.add('hidden');
            document.getElementById('moon-icon').classList.remove('hidden');
            localStorage.setItem('gm_theme', 'dark');
        }
        
        this.showToast('Tema cambiado correctamente', 'success');
    }

    // ===========================
    // PWA
    // ===========================
    
    initPWA() {
        // Install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            // Only show install banner if the user hasn't dismissed it before
            const dismissed = localStorage.getItem('gm_install_dismissed');
            if (!dismissed) {
                document.getElementById('install-banner').classList.remove('hidden');
            }
        });
        
        // Installed
        window.addEventListener('appinstalled', () => {
            this.deferredPrompt = null;
            document.getElementById('install-banner').classList.add('hidden');
            this.showToast('¡App instalada correctamente!', 'success');
        });
    }

    installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted PWA install');
                    // if user accepted, clear the dismissed flag so banner won't reappear
                    localStorage.removeItem('gm_install_dismissed');
                }
                this.deferredPrompt = null;
                // hide banner regardless of choice
                const el = document.getElementById('install-banner');
                if (el) el.classList.add('hidden');
            });
        }
    }

    dismissInstallBanner() {
        document.getElementById('install-banner').classList.add('hidden');
        try {
            localStorage.setItem('gm_install_dismissed', '1');
        } catch (e) {
            console.warn('Could not persist install dismissal:', e);
        }
    }

    // ===========================
    // UTILITY METHODS
    // ===========================
    
    loadHistory() {
        // Placeholder for history functionality
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = `
            <div class="text-center py-8">
                <div class="w-16 h-16 mx-auto mb-4 rounded-2xl glass flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13.5,8H12V13L16.28,15.54L17,14.33L13.5,12.25V8M13,3A9,9 0 0,0 4,12H1L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3" fill="currentColor"/>
                    </svg>
                </div>
                <p class="text-gray-400 mb-2">Historial de transacciones</p>
                <p class="text-sm text-gray-500">Próximamente disponible</p>
            </div>
        `;
    }

    showIncomeModal() {
        this.showToast('Modal de ingresos - En desarrollo', 'info');
    }

    showCardTransactionModal() {
        this.showToast('Modal de transacción tarjeta - En desarrollo', 'info');
    }

    showExpenseDetail(id) {
        this.showToast(`Detalle de gasto ${id} - En desarrollo`, 'info');
    }
}

// Initialize app
const app = new GastosApp();