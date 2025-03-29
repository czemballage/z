// النماذج
class Transaction {
  constructor(id, type, amount, rate, totalValue, date) {
    this.id = id;
    this.type = type; // شراء أو بيع
    this.amount = parseFloat(amount);
    this.rate = parseFloat(rate);
    this.totalValue = parseFloat(totalValue);
    this.date = date || new Date();
    this.profit = 0; // سيتم حسابه لاحقًا في حالة البيع
  }
}

class CapitalManager {
  constructor() {
    this.loadFromStorage();
    
    if (!this.initialized) {
      this.initialized = false;
      this.usdBalance = 0;
      this.dzdBalance = 0;
      this.initialRate = 0;
      this.transactions = [];
      this.totalBought = 0;
      this.totalSold = 0;
    }
  }

  initialize(usdBalance, dzdBalance, initialRate) {
    this.usdBalance = parseFloat(usdBalance);
    this.dzdBalance = parseFloat(dzdBalance);
    this.initialRate = parseFloat(initialRate);
    this.initialized = true;
    this.saveToStorage();
  }

  buyDollars(amount, rate) {
    const totalValue = amount * rate;
    
    if (totalValue > this.dzdBalance) {
      throw new Error("رصيد الدينار غير كافي لإجراء عملية الشراء");
    }
    
    const transaction = new Transaction(
      Date.now().toString(),
      "buy",
      amount,
      rate,
      totalValue,
      new Date()
    );
    
    this.usdBalance += amount;
    this.dzdBalance -= totalValue;
    this.totalBought += amount;
    
    this.transactions.push(transaction);
    this.saveToStorage();
    
    return transaction;
  }

  sellDollars(amount, rate) {
    if (amount > this.usdBalance) {
      throw new Error("رصيد الدولار غير كافي لإجراء عملية البيع");
    }
    
    const totalValue = amount * rate;
    
    // حساب متوسط سعر الشراء لحساب الربح
    const avgBuyRate = this.calculateAvgBuyRate();
    const profit = amount * (rate - avgBuyRate);
    
    const transaction = new Transaction(
      Date.now().toString(),
      "sell",
      amount,
      rate,
      totalValue,
      new Date()
    );
    
    transaction.profit = profit;
    
    this.usdBalance -= amount;
    this.dzdBalance += totalValue;
    this.totalSold += amount;
    
    this.transactions.push(transaction);
    this.saveToStorage();
    
    return transaction;
  }

  depositDollars(amount, rate) {
    const totalValue = amount * rate;
    
    const transaction = new Transaction(
      Date.now().toString(),
      "deposit",
      amount,
      rate,
      totalValue,
      new Date()
    );
    
    this.usdBalance += amount;
    
    this.transactions.push(transaction);
    this.saveToStorage();
    
    return transaction;
  }

  calculateAvgBuyRate() {
    // الحصول على عمليات الشراء فقط
    const buyTransactions = this.transactions.filter(t => t.type === "buy");
    
    if (buyTransactions.length === 0) {
      return this.initialRate;
    }
    
    const totalAmount = buyTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalValue = buyTransactions.reduce((sum, t) => sum + t.totalValue, 0);
    
    return totalValue / totalAmount;
  }

  deleteTransaction(id) {
    const index = this.transactions.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    const transaction = this.transactions[index];
    
    if (transaction.type === 'buy') {
      this.usdBalance -= transaction.amount;
      this.dzdBalance += transaction.totalValue;
      this.totalBought -= transaction.amount;
    } else if (transaction.type === 'sell') {
      this.usdBalance += transaction.amount;
      this.dzdBalance -= transaction.totalValue;
      this.totalSold -= transaction.amount;
    }
    
    this.transactions.splice(index, 1);
    this.saveToStorage();
    
    return true;
  }

  saveToStorage() {
    localStorage.setItem('capitalManagerData', JSON.stringify({
      initialized: this.initialized,
      usdBalance: this.usdBalance,
      dzdBalance: this.dzdBalance,
      initialRate: this.initialRate,
      transactions: this.transactions,
      totalBought: this.totalBought,
      totalSold: this.totalSold
    }));
  }

  loadFromStorage() {
    const data = localStorage.getItem('capitalManagerData');
    if (data) {
      const parsedData = JSON.parse(data);
      this.initialized = parsedData.initialized;
      this.usdBalance = parsedData.usdBalance;
      this.dzdBalance = parsedData.dzdBalance;
      this.initialRate = parsedData.initialRate;
      this.transactions = parsedData.transactions.map(t => {
        const transaction = new Transaction(
          t.id,
          t.type,
          t.amount,
          t.rate,
          t.totalValue,
          new Date(t.date)
        );
        transaction.profit = t.profit;
        return transaction;
      });
      this.totalBought = parsedData.totalBought;
      this.totalSold = parsedData.totalSold;
    }
  }
}

// واجهة المستخدم
class UI {
  constructor() {
    this.capitalManager = new CapitalManager();
    this.currentSection = 'home';
    this.currentTheme = localStorage.getItem('appTheme') || 'default';
    this.applyTheme(this.currentTheme);
    this.initApp();
  }

  initApp() {
    const app = document.getElementById('app');
    
    if (!this.capitalManager.initialized) {
      this.showInitialSetupForm(app);
    } else {
      this.renderMainUI(app);
    }
  }

  applyTheme(theme) {
    document.body.removeAttribute('data-theme');
    
    if (theme !== 'default') {
      document.body.setAttribute('data-theme', theme);
    }
    
    localStorage.setItem('appTheme', theme);
    this.currentTheme = theme;
  }

  showInitialSetupForm(container) {
    container.innerHTML = `
      <div class="app-container">
        <div class="card">
          <h2 class="text-center">إعداد رأس المال</h2>
          <form id="initial-setup-form">
            <div class="form-group">
              <label for="usd-balance">رصيد الدولار (USDT)</label>
              <input type="text" inputmode="decimal" id="usd-balance" required>
            </div>
            <div class="form-group">
              <label for="dzd-balance">رصيد الدينار (DZD)</label>
              <input type="text" inputmode="decimal" id="dzd-balance" required>
            </div>
            <div class="form-group">
              <label for="initial-rate">سعر الصرف (DZD/USDT)</label>
              <input type="text" inputmode="decimal" id="initial-rate" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block">بدء التطبيق</button>
          </form>
        </div>
      </div>
    `;
    
    // إعداد حقول الإدخال للتعامل مع الأرقام العشرية
    const usdBalanceInput = document.getElementById('usd-balance');
    const dzdBalanceInput = document.getElementById('dzd-balance');
    const initialRateInput = document.getElementById('initial-rate');
    
    this.setupDecimalInput(usdBalanceInput);
    this.setupDecimalInput(dzdBalanceInput);
    this.setupDecimalInput(initialRateInput);
    
    document.getElementById('initial-setup-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const usdBalance = parseFloat(usdBalanceInput.value.replace(',', '.'));
      const dzdBalance = parseFloat(dzdBalanceInput.value.replace(',', '.'));
      const initialRate = parseFloat(initialRateInput.value.replace(',', '.'));
      
      if (isNaN(usdBalance) || isNaN(dzdBalance) || isNaN(initialRate)) {
        alert('الرجاء إدخال قيم صحيحة');
        return;
      }
      
      this.capitalManager.initialize(usdBalance, dzdBalance, initialRate);
      this.renderMainUI(container);
    });
  }

  renderMainUI(container) {
    container.innerHTML = `
      <div class="app-container">
        <div class="app-header">
          <div class="app-logo">
            <i class="fas fa-wallet"></i>
            <span>إدارة رأس المال</span>
          </div>
          <div class="header-actions">
            <button class="header-action-btn theme-toggle-btn" title="تغيير المظهر">
              <i class="fas fa-moon"></i>
            </button>
            <button class="header-action-btn delete-data-btn" title="حذف البيانات">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        <div class="main-content">
          ${this.renderCurrentSection()}
        </div>
        
        <div class="bottom-nav">
          <button class="nav-btn ${this.currentSection === 'home' ? 'active' : ''}" data-section="home">
            <i class="fas fa-home"></i>
            <span>الرئيسية</span>
          </button>
          <button class="nav-btn ${this.currentSection === 'transactions' ? 'active' : ''}" data-section="transactions">
            <i class="fas fa-exchange-alt"></i>
            <span>المعاملات</span>
          </button>
          <button class="nav-btn ${this.currentSection === 'profits' ? 'active' : ''}" data-section="profits">
            <i class="fas fa-chart-line"></i>
            <span>الأرباح</span>
          </button>
        </div>
      </div>
    `;
    
    // إضافة مستمعات الأحداث لأزرار التنقل
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentSection = btn.getAttribute('data-section');
        document.querySelector('.main-content').innerHTML = this.renderCurrentSection();
        
        // تحديث الزر النشط
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // إعداد مستمعات الأحداث للقسم الجديد
        this.setupSectionEventListeners();
      });
    });
    
    // إضافة مستمعات أحداث لأزرار الإعدادات في الهيدر
    this.setupHeaderActions();
    
    // إعداد مستمعات الأحداث للقسم الحالي
    this.setupSectionEventListeners();
  }
  
  setupHeaderActions() {
    // زر تغيير المظهر
    document.querySelector('.theme-toggle-btn')?.addEventListener('click', () => {
      const newTheme = this.currentTheme === 'default' ? 'dark' : 'default';
      this.applyTheme(newTheme);
      
      // تحديث أيقونة الزر
      const icon = document.querySelector('.theme-toggle-btn i');
      if (icon) {
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      }
    });
    
    // زر حذف البيانات
    document.querySelector('.delete-data-btn')?.addEventListener('click', () => {
      if (confirm('هل أنت متأكد من حذف جميع البيانات؟')) {
        localStorage.removeItem('capitalManagerData');
        window.location.reload();
      }
    });
  }
  
  renderCurrentSection() {
    switch (this.currentSection) {
      case 'home':
        return this.renderHomeSection();
      case 'transactions':
        return this.renderTransactionsSection();
      case 'profits':
        return this.renderProfitsSection();
      default:
        return this.renderHomeSection();
    }
  }
  
  renderHomeSection() {
    const avgBuyRate = this.capitalManager.calculateAvgBuyRate();
    const totalUsdBalance = this.capitalManager.usdBalance;
    const totalDzdBalance = this.capitalManager.dzdBalance;
    
    return `
      <div class="card main-balances-card pulse-animation">
        <div class="balance-header">الرصيد الحالي</div>
        <div class="balances-wrapper">
          <div class="balance-item">
            <div class="balance-label">USDT</div>
            <div class="balance-value">${totalUsdBalance.toFixed(2)}</div>
          </div>
          <div class="balance-divider"></div>
          <div class="balance-item">
            <div class="balance-label">DZD</div>
            <div class="balance-value">${totalDzdBalance.toFixed(2)}</div>
          </div>
        </div>
        <button class="edit-balance-btn" title="تعديل الرصيد">
          <i class="fas fa-edit"></i>
        </button>
      </div>
      
      <div class="avg-rate-card">
        <div class="avg-rate-value">
          <span class="label">متوسط سعر الشراء</span>
          <span class="value">${avgBuyRate.toFixed(2)} DZD</span>
        </div>
      </div>
      
      <div class="actions-card">
        <div class="action-buttons">
          <button class="btn-action btn-buy" id="buy-btn">
            <i class="fas fa-download"></i>
            <span>شراء</span>
          </button>
          <button class="btn-action btn-sell" id="sell-btn">
            <i class="fas fa-upload"></i>
            <span>بيع</span>
          </button>
          <button class="btn-action btn-deposit" id="deposit-btn">
            <i class="fas fa-plus-circle"></i>
            <span>إيداع</span>
          </button>
        </div>
      </div>
      
      <div class="card">
        <h4 class="section-title">آخر المعاملات</h4>
        <div class="transaction-list">
          ${this.renderRecentTransactions(3)}
        </div>
        <div class="view-all-btn-container">
          <button class="view-all-btn" id="view-all-transactions-btn">عرض الكل</button>
        </div>
      </div>
    `;
  }
  
  renderTransactionsSection() {
    return `
      <div class="section-header">
        <h2>سجل المعاملات</h2>
      </div>
      
      <div class="card transactions-card">
        <div class="transactions-list" id="transaction-list">
          ${this.renderAllTransactions()}
        </div>
      </div>
    `;
  }
  
  renderRecentTransactions(limit) {
    const transactions = [...this.capitalManager.transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
    
    if (transactions.length === 0) {
      return '<div class="text-center py-3">لا توجد معاملات</div>';
    }
    
    return transactions.map(t => `
      <div class="transaction-item">
        <div class="transaction-icon ${this.getTransactionTypeClass(t.type)}">
          <i class="fas ${this.getTransactionTypeIcon(t.type)}"></i>
        </div>
        <div class="transaction-details">
          <div class="transaction-header">
            <span class="transaction-type-label">${this.getTransactionTypeText(t.type)}</span>
            <span class="transaction-date">${new Date(t.date).toLocaleDateString('ar-DZ')}</span>
          </div>
          <div class="transaction-body">
            <div class="transaction-amount">${t.amount.toFixed(2)} USDT</div>
            <div class="transaction-rate">السعر: ${t.rate.toFixed(2)} DZD</div>
            <div class="transaction-value">القيمة: ${t.totalValue.toFixed(2)} DZD</div>
          </div>
        </div>
      </div>
    `).join('');
  }
  
  renderAllTransactions() {
    const transactions = [...this.capitalManager.transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (transactions.length === 0) {
      return '<div class="empty-state">لا توجد معاملات حتى الآن</div>';
    }
    
    return transactions.map(t => `
      <div class="transaction-item" data-id="${t.id}">
        <div class="transaction-icon ${this.getTransactionTypeClass(t.type)}">
          <i class="fas ${this.getTransactionTypeIcon(t.type)}"></i>
        </div>
        <div class="transaction-details">
          <div class="transaction-header">
            <span class="transaction-type-label">${this.getTransactionTypeText(t.type)}</span>
            <span class="transaction-date">${new Date(t.date).toLocaleDateString('ar-DZ')}</span>
          </div>
          <div class="transaction-body">
            <div class="transaction-amount">${t.amount.toFixed(2)} USDT</div>
            <div class="transaction-rate">السعر: ${t.rate.toFixed(2)} DZD</div>
            <div class="transaction-value">القيمة: ${t.totalValue.toFixed(2)} DZD</div>
          </div>
        </div>
        <div class="transaction-actions">
          <button class="action-btn edit-btn" data-id="${t.id}"><i class="fas fa-edit"></i></button>
          <button class="action-btn delete-btn" data-id="${t.id}"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `).join('');
  }
  
  getTransactionTypeClass(type) {
    switch (type) {
      case 'buy':
        return 'transaction-type-buy';
      case 'sell':
        return 'transaction-type-sell';
      default:
        return '';
    }
  }
  
  getTransactionTypeText(type) {
    switch (type) {
      case 'buy':
        return 'شراء';
      case 'sell':
        return 'بيع';
      default:
        return type;
    }
  }
  
  getTransactionTypeIcon(type) {
    switch (type) {
      case 'buy':
        return 'fa-download';
      case 'sell':
        return 'fa-upload';
      default:
        return 'fa-exchange-alt';
    }
  }

  setupSectionEventListeners() {
    // إعداد مستمعات الأحداث للقسم الحالي
    switch (this.currentSection) {
      case 'home':
        this.setupHomeListeners();
        break;
      case 'transactions':
        this.setupTransactionsListeners();
        break;
    }
  }
  
  setupHomeListeners() {
    // مستمعات أحداث لأزرار المعاملات
    document.getElementById('buy-btn')?.addEventListener('click', () => {
      this.showTransactionModal('buy');
    });
    
    document.getElementById('sell-btn')?.addEventListener('click', () => {
      this.showTransactionModal('sell');
    });
    
    document.getElementById('deposit-btn')?.addEventListener('click', () => {
      this.showTransactionModal('deposit');
    });
    
    // زر عرض كل المعاملات
    document.getElementById('view-all-transactions-btn')?.addEventListener('click', () => {
      this.currentSection = 'transactions';
      document.querySelector('.main-content').innerHTML = this.renderCurrentSection();
      
      // تحديث الزر النشط في شريط التنقل
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-section') === 'transactions') {
          btn.classList.add('active');
        }
      });
      
      this.setupSectionEventListeners();
    });
    
    // زر تعديل الرصيد
    document.querySelector('.edit-balance-btn')?.addEventListener('click', () => {
      this.showEditBalanceModal();
    });
  }
  
  setupTransactionsListeners() {
    // إظهار/إخفاء أزرار العمليات عند النقر على المعاملة
    document.querySelectorAll('.transaction-item').forEach(item => {
      item.addEventListener('click', () => {
        // إزالة الحالة النشطة من جميع المعاملات
        document.querySelectorAll('.transaction-item').forEach(i => {
          i.classList.remove('active');
        });
        
        // إضافة الحالة النشطة للمعاملة المختارة
        item.classList.add('active');
      });
    });
    
    // إضافة مستمعات الأحداث لأزرار التعديل
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // منع التأثير على العنصر الأب
        const id = btn.getAttribute('data-id');
        const transaction = this.capitalManager.transactions.find(t => t.id === id);
        if (transaction) {
          this.showEditTransactionModal(transaction);
        }
      });
    });
    
    // إضافة مستمعات الأحداث لأزرار الحذف
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // منع التأثير على العنصر الأب
        const id = btn.getAttribute('data-id');
        if (confirm('هل أنت متأكد من حذف هذه المعاملة؟')) {
          this.capitalManager.deleteTransaction(id);
          document.querySelector('.main-content').innerHTML = this.renderCurrentSection();
          this.setupSectionEventListeners();
        }
      });
    });
  }
  
  showTransactionModal(type) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    let title, buttonClass;
    
    switch (type) {
      case 'buy':
        title = 'شراء دولار';
        buttonClass = 'btn-buy';
        break;
      case 'sell':
        title = 'بيع دولار';
        buttonClass = 'btn-sell';
        break;
      case 'deposit':
        title = 'إيداع دولار';
        buttonClass = 'btn-deposit';
        break;
    }
    
    modal.innerHTML = `
      <div class="modal-content">
        <h3>${title}</h3>
        <form id="transaction-form">
          <div class="form-group">
            <label for="amount">الكمية (USDT)</label>
            <input type="text" inputmode="decimal" id="amount" required>
          </div>
          <div class="form-group">
            <label for="rate">السعر (DZD/USDT)</label>
            <input type="text" inputmode="decimal" id="rate" required>
          </div>
          ${type !== 'deposit' ? `
          <div class="form-group">
            <label for="total-value">المبلغ الإجمالي (DZD)</label>
            <input type="text" id="total-value" readonly>
          </div>
          ` : ''}
          <div class="btn-group">
            <button type="button" class="btn btn-secondary" id="cancel-btn">إلغاء</button>
            <button type="submit" class="btn ${buttonClass}">${title}</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // إعداد حقول الإدخال للتعامل مع الأرقام العشرية
    const amountInput = document.getElementById('amount');
    const rateInput = document.getElementById('rate');
    const totalValueInput = document.getElementById('total-value');
    
    // تنسيق الإدخال للتعامل مع الفواصل العشرية
    this.setupDecimalInput(amountInput);
    this.setupDecimalInput(rateInput);
    
    // حساب القيمة الإجمالية تلقائيًا
    const updateTotalValue = () => {
      const amount = parseFloat(amountInput.value.replace(',', '.')) || 0;
      const rate = parseFloat(rateInput.value.replace(',', '.')) || 0;
      totalValueInput.value = (amount * rate).toFixed(2);
    };
    
    amountInput.addEventListener('input', updateTotalValue);
    rateInput.addEventListener('input', updateTotalValue);
    
    // إعداد مستمعات الأحداث للنموذج
    document.getElementById('cancel-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    document.getElementById('transaction-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(amountInput.value.replace(',', '.'));
      const rate = parseFloat(rateInput.value.replace(',', '.'));
      
      if (isNaN(amount) || isNaN(rate) || amount <= 0 || rate <= 0) {
        alert('الرجاء إدخال قيم صحيحة للكمية والسعر');
        return;
      }
      
      try {
        switch (type) {
          case 'buy':
            this.capitalManager.buyDollars(amount, rate);
            break;
          case 'sell':
            this.capitalManager.sellDollars(amount, rate);
            break;
          case 'deposit':
            this.capitalManager.depositDollars(amount, rate);
            break;
        }
        
        document.body.removeChild(modal);
        document.querySelector('.main-content').innerHTML = this.renderCurrentSection();
        this.setupSectionEventListeners();
      } catch (error) {
        alert(error.message);
      }
    });
  }
  
  setupDecimalInput(input) {
    if (!input) return;
    
    input.addEventListener('input', function(e) {
      // السماح فقط بالأرقام والنقطة والفاصلة
      let value = this.value.replace(/[^0-9.,]/g, '');
      
      // التأكد من وجود علامة عشرية واحدة فقط
      const decimalCount = (value.match(/[.,]/g) || []).length;
      if (decimalCount > 1) {
        const lastDecimalIndex = Math.max(value.lastIndexOf('.'), value.lastIndexOf(','));
        value = value.substring(0, lastDecimalIndex) + value.substring(lastDecimalIndex).replace(/[.,]/g, '');
      }
      
      this.value = value;
    });
  }

  showEditBalanceModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    modal.innerHTML = `
      <div class="modal-content">
        <h3>تعديل الرصيد</h3>
        <form id="edit-balance-form">
          <div class="form-group">
            <label for="usd-balance">رصيد الدولار (USDT)</label>
            <input type="text" inputmode="decimal" id="usd-balance" value="${this.capitalManager.usdBalance.toFixed(2)}" required>
          </div>
          <div class="form-group">
            <label for="dzd-balance">رصيد الدينار (DZD)</label>
            <input type="text" inputmode="decimal" id="dzd-balance" value="${this.capitalManager.dzdBalance.toFixed(2)}" required>
          </div>
          <div class="btn-group">
            <button type="button" class="btn btn-secondary" id="cancel-btn">إلغاء</button>
            <button type="submit" class="btn btn-primary">حفظ التغييرات</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const usdBalanceInput = document.getElementById('usd-balance');
    const dzdBalanceInput = document.getElementById('dzd-balance');
    
    this.setupDecimalInput(usdBalanceInput);
    this.setupDecimalInput(dzdBalanceInput);
    
    document.getElementById('cancel-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    document.getElementById('edit-balance-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const usdBalance = parseFloat(usdBalanceInput.value.replace(',', '.'));
      const dzdBalance = parseFloat(dzdBalanceInput.value.replace(',', '.'));
      
      if (isNaN(usdBalance) || isNaN(dzdBalance)) {
        alert('الرجاء إدخال قيم صحيحة');
        return;
      }
      
      this.capitalManager.usdBalance = usdBalance;
      this.capitalManager.dzdBalance = dzdBalance;
      this.capitalManager.saveToStorage();
      
      document.body.removeChild(modal);
      document.querySelector('.main-content').innerHTML = this.renderCurrentSection();
      this.setupSectionEventListeners();
    });
  }

  renderProfitsSection() {
    const totalProfit = this.calculateTotalProfit();
    const profitRate = this.calculateProfitRate();
    const dailyProfit = this.calculatePeriodProfit('day');
    const weeklyProfit = this.calculatePeriodProfit('week');
    const monthlyProfit = this.calculatePeriodProfit('month');
    
    return `
      <div class="section-header">
        <h2>تحليل الأرباح</h2>
      </div>
      
      <div class="${totalProfit >= 0 ? 'profit-card' : 'loss-card'}">
        <div>إجمالي الربح / الخسارة</div>
        <div class="profit-amount">${totalProfit.toFixed(2)} DZD</div>
        <div class="profit-percentage">${profitRate.toFixed(2)}%</div>
      </div>
      
      <div class="profit-period-card">
        <div class="period-item">
          <div class="period-label">اليوم</div>
          <div class="period-value ${dailyProfit >= 0 ? 'profit' : 'loss'}">${dailyProfit.toFixed(2)} DZD</div>
        </div>
        <div class="period-item">
          <div class="period-label">الأسبوع</div>
          <div class="period-value ${weeklyProfit >= 0 ? 'profit' : 'loss'}">${weeklyProfit.toFixed(2)} DZD</div>
        </div>
        <div class="period-item">
          <div class="period-label">الشهر</div>
          <div class="period-value ${monthlyProfit >= 0 ? 'profit' : 'loss'}">${monthlyProfit.toFixed(2)} DZD</div>
        </div>
        <div class="period-item">
          <div class="period-label">متوسط سعر الشراء</div>
          <div class="period-value">${this.capitalManager.calculateAvgBuyRate().toFixed(2)} DZD</div>
        </div>
      </div>
      
      <div class="card">
        <h4 class="section-title">أعلى المعاملات ربحاً</h4>
        <div class="transaction-list">
          ${this.renderTopProfitTransactions(5)}
        </div>
      </div>
    `;
  }

  calculateTotalProfit() {
    return this.capitalManager.transactions
      .filter(t => t.type === 'sell')
      .reduce((sum, t) => sum + t.profit, 0);
  }

  calculateProfitRate() {
    const totalCost = this.capitalManager.transactions
      .filter(t => t.type === 'buy')
      .reduce((sum, t) => sum + t.totalValue, 0);
    
    if (totalCost === 0) return 0;
    
    return (this.calculateTotalProfit() / totalCost) * 100;
  }

  calculatePeriodProfit(period) {
    const now = new Date();
    let startDate;
    
    switch(period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate = new Date(0);
    }
    
    return this.capitalManager.transactions
      .filter(t => t.type === 'sell' && new Date(t.date) >= startDate)
      .reduce((sum, t) => sum + t.profit, 0);
  }

  renderTopProfitTransactions(limit) {
    const profitTransactions = [...this.capitalManager.transactions]
      .filter(t => t.type === 'sell')
      .sort((a, b) => b.profit - a.profit)
      .slice(0, limit);
    
    if (profitTransactions.length === 0) {
      return '<div class="empty-state">لا توجد معاملات بيع حتى الآن</div>';
    }
    
    return profitTransactions.map(t => `
      <div class="transaction-item">
        <div class="transaction-icon transaction-type-sell">
          <i class="fas fa-upload"></i>
        </div>
        <div class="transaction-details">
          <div class="transaction-header">
            <span class="transaction-type-label">بيع ${t.amount.toFixed(2)} USDT</span>
            <span class="transaction-date">${new Date(t.date).toLocaleDateString('ar-DZ')}</span>
          </div>
          <div class="transaction-body">
            <div class="transaction-rate">سعر البيع: ${t.rate.toFixed(2)} DZD</div>
            <div class="transaction-value profit-value">الربح: ${t.profit.toFixed(2)} DZD</div>
          </div>
        </div>
      </div>
    `).join('');
  }
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', () => {
  new UI();
}); 