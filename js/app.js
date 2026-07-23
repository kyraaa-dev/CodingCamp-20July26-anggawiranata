// ============================================================
//  EXPENSE & BUDGET VISUALIZER — Full Application
//  Bug fix: no confirm() / prompt() calls (blocked on file://)
//  UI: sidebar layout, inline budget inputs, trash-icon delete
// ============================================================

(function() {
  'use strict';

  // ============================================================
  //  STATE
  // ============================================================
  const STORAGE_KEY = 'budget_visualizer_data';

  let state = {
    transactions: [],
    categories: ['Food', 'Transport', 'Housing', 'Utilities', 'Entertainment', 'Health', 'Education', 'Shopping', 'Other'],
    budgets: {},
    theme: 'light',
    currentView: 'dashboard',
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    sortCriterion: 'date-desc'
  };

  // ============================================================
  //  DOM REFS
  // ============================================================
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const dom = {
    balanceSummary:   $('#balance-summary'),
    transactionList:  $('#transaction-list'),
    budgetProgress:   $('#budget-progress'),
    pieChart:         $('#pie-chart'),
    barChart:         $('#bar-chart'),
    navDashboard:     $('#nav-dashboard'),
    navMonthly:       $('#nav-monthly'),
    dashboardView:    $('#dashboard'),
    monthlyView:      $('#monthly-summary'),
    monthDisplay:     $('#month-display'),
    monthPrev:        $('#month-prev'),
    monthNext:        $('#month-next'),
    summaryTotals:    $('#summary-totals'),
    summaryBudget:    $('#summary-budget-usage'),
    summaryTable:     $('#summary-category-table'),
    txForm:           $('#transaction-form'),
    txTitle:          $('#tx-title'),
    txAmount:         $('#tx-amount'),
    txType:           $('#tx-type'),
    txCategory:       $('#tx-category'),
    txDate:           $('#tx-date'),
    txTitleErr:       $('#tx-title-error'),
    txAmountErr:      $('#tx-amount-error'),
    txTypeErr:        $('#tx-type-error'),
    txCategoryErr:    $('#tx-category-error'),
    txDateErr:        $('#tx-date-error'),
    sortBtns:         $$('.sort-btn'),
    categoryModal:    $('#category-modal'),
    categoryModalBtn: $('#category-modal-btn'),
    categoryModalBtnMobile: $('#category-modal-btn-mobile'),
    categoryModalClose: $('#category-modal-close'),
    categoryList:     $('#category-list'),
    addCategoryForm:  $('#add-category-form'),
    newCategoryName:  $('#new-category-name'),
    newCategoryErr:   $('#new-category-error'),
    themeToggle:      $('#theme-toggle'),
    themeToggleMobile: $('#theme-toggle-mobile'),
    toastContainer:   $('#toast-container'),
    loadError:        $('#load-error'),
    sidebarToggle:    $('#sidebar-toggle'),
    sidebar:          $('#sidebar'),
    sidebarOverlay:   $('#sidebar-overlay'),
  };

  // Chart instances
  let pieChartInstance = null;
  let barChartInstance = null;

  // ============================================================
  //  PERSISTENCE
  // ============================================================
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        state.transactions  = saved.transactions  || [];
        state.categories    = saved.categories    || ['Food', 'Transport', 'Housing', 'Utilities', 'Entertainment', 'Health', 'Education', 'Shopping', 'Other'];
        state.budgets       = saved.budgets       || {};
        state.theme         = saved.theme         || 'light';
        state.sortCriterion = saved.sortCriterion || 'date-desc';
        state.transactions.forEach(tx => {
          if (!tx.id) tx.id = generateId();
        });
      }
    } catch (_) { /* ignore parse errors */ }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        transactions:  state.transactions,
        categories:    state.categories,
        budgets:       state.budgets,
        theme:         state.theme,
        sortCriterion: state.sortCriterion
      }));
    } catch (_) { /* ignore quota errors */ }
  }

  // ============================================================
  //  HELPERS
  // ============================================================
  function generateId() {
    return Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getMonthName(m, y) {
    return new Date(y, m).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function getTodayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function isInMonth(isoDate, month, year) {
    if (!isoDate) return false;
    const d = new Date(isoDate + 'T00:00:00');
    return d.getMonth() === month && d.getFullYear() === year;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return str.replace(/[&<>"']/g, m => map[m]);
  }

  function getSortedTransactions() {
    const copy = [...state.transactions];
    switch (state.sortCriterion) {
      case 'date-desc':     return copy.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      case 'date-asc':      return copy.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      case 'amount-desc':   return copy.sort((a, b) => b.amount - a.amount);
      case 'amount-asc':    return copy.sort((a, b) => a.amount - b.amount);
      case 'category-asc':  return copy.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
      default:              return copy;
    }
  }

  function getCategoryTotals(transactions) {
    const map = {};
    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        const cat = tx.category || 'Uncategorized';
        map[cat] = (map[cat] || 0) + tx.amount;
      }
    });
    return map;
  }

  function getMonthlyTotals(month, year) {
    const filtered = state.transactions.filter(tx => isInMonth(tx.date, month, year));
    let income = 0, expense = 0;
    filtered.forEach(tx => {
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'expense') expense += tx.amount;
    });
    return { income, expense, balance: income - expense, count: filtered.length };
  }

  function getCategorySpending(month, year) {
    const filtered = state.transactions.filter(tx => isInMonth(tx.date, month, year) && tx.type === 'expense');
    const map = {};
    filtered.forEach(tx => {
      const cat = tx.category || 'Uncategorized';
      map[cat] = (map[cat] || 0) + tx.amount;
    });
    return map;
  }

  // ============================================================
  //  TOAST
  // ============================================================
  function showToast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = message;
    dom.toastContainer.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 3200);
  }

  // ============================================================
  //  RENDER — BALANCE SUMMARY
  // ============================================================
  function renderBalanceSummary() {
    const totalIncome  = state.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = state.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance      = totalIncome - totalExpense;
    const balClass     = balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'accent';

    dom.balanceSummary.innerHTML = `
      <div class="balance-card">
        <span class="card-icon">💚</span>
        <div class="label">Total Income</div>
        <div class="value positive">${formatCurrency(totalIncome)}</div>
      </div>
      <div class="balance-card">
        <span class="card-icon">🔴</span>
        <div class="label">Total Expenses</div>
        <div class="value negative">${formatCurrency(totalExpense)}</div>
      </div>
      <div class="balance-card card-balance">
        <span class="card-icon">⚖️</span>
        <div class="label">Net Balance</div>
        <div class="value ${balClass}">${formatCurrency(balance)}</div>
      </div>
      <div class="balance-card">
        <span class="card-icon">🗂️</span>
        <div class="label">Transactions</div>
        <div class="value neutral">${state.transactions.length}</div>
      </div>
    `;
  }

  // ============================================================
  //  RENDER — TRANSACTION LIST
  //  No confirm() — delete directly on click
  // ============================================================
  function renderTransactionList() {
    const sorted = getSortedTransactions();
    if (sorted.length === 0) {
      dom.transactionList.innerHTML = '';
      return;
    }
    let html = '';
    sorted.forEach(tx => {
      const isIncome = tx.type === 'income';
      const amtClass = isIncome ? 'income' : 'expense';
      const sign     = isIncome ? '+' : '−';
      const avatar   = isIncome ? '💰' : '💸';
      const avatarCls = isIncome ? 'income-avatar' : 'expense-avatar';

      html += `
        <li class="tx-item" data-id="${escapeHtml(tx.id)}">
          <div class="tx-avatar ${avatarCls}" aria-hidden="true">${avatar}</div>
          <div class="tx-info">
            <div class="tx-title">${escapeHtml(tx.title || 'Untitled')}</div>
            <div class="tx-meta">
              <span class="tx-date">${formatDate(tx.date)}</span>
              <span class="tx-category">${escapeHtml(tx.category || 'Uncategorized')}</span>
            </div>
          </div>
          <span class="tx-amount ${amtClass}">${sign}${formatCurrency(tx.amount)}</span>
          <button class="tx-delete" data-id="${escapeHtml(tx.id)}" type="button" aria-label="Delete transaction: ${escapeHtml(tx.title || 'Untitled')}">🗑</button>
        </li>
      `;
    });
    dom.transactionList.innerHTML = html;
  }

  // ============================================================
  //  RENDER — BUDGET PROGRESS
  // ============================================================
  function renderBudgetProgress() {
    const hasBudget = Object.keys(state.budgets).some(k => state.budgets[k] > 0);
    if (!hasBudget) {
      dom.budgetProgress.innerHTML = `
        <h3>📊 Budget Progress</h3>
        <p style="color:var(--text-muted);font-size:0.875rem;padding:0.5rem 0;">
          Set category budgets in the <strong>Categories</strong> manager.
        </p>`;
      return;
    }

    const spending = getCategoryTotals(state.transactions);
    let html = `<h3>📊 Budget Progress</h3>`;
    let hasAny = false;

    state.categories.forEach(cat => {
      const limit = state.budgets[cat];
      if (!limit || limit <= 0) return;
      hasAny = true;
      const spent   = spending[cat] || 0;
      const pct     = Math.min(100, (spent / limit) * 100);
      const fillCls = pct > 95 ? 'over' : pct > 75 ? 'warn' : '';
      html += `
        <div class="budget-item">
          <span class="cat-name">${escapeHtml(cat)}</span>
          <div class="bar-track"><div class="bar-fill ${fillCls}" style="width:${pct.toFixed(1)}%;"></div></div>
          <span class="budget-text">${formatCurrency(spent)} / ${formatCurrency(limit)}</span>
        </div>
      `;
    });

    if (!hasAny) {
      html += `<p style="color:var(--text-muted);font-size:0.875rem;">No budgets set. Add budgets in the Categories manager.</p>`;
    }
    dom.budgetProgress.innerHTML = html;
  }

  // ============================================================
  //  RENDER — CHARTS
  // ============================================================
  function renderCharts() {
    renderPieChart();
    renderBarChart();
  }

  function getChartTextColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#475569';
  }

  function renderPieChart() {
    const ctx      = dom.pieChart.getContext('2d');
    const spending = getCategoryTotals(state.transactions);
    const labels   = Object.keys(spending);
    const data     = Object.values(spending);

    if (pieChartInstance) { pieChartInstance.destroy(); pieChartInstance = null; }

    const textColor = getChartTextColor();

    if (data.length === 0 || data.every(v => v === 0)) {
      pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['No expenses'],
          datasets: [{ data: [1], backgroundColor: ['#e2e8f0'], borderWidth: 0 }]
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: () => 'No data' } }
          }
        }
      });
      return;
    }

    const colors = ['#6366f1','#ef4444','#22c55e','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316','#3b82f6','#84cc16'];
    pieChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: labels.map((_, i) => colors[i % colors.length]),
          borderWidth: 2,
          borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#fff'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 10, padding: 8, font: { size: 11 }, color: textColor }
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct   = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                return `${ctx.label}: ${formatCurrency(ctx.parsed)} (${pct}%)`;
              }
            }
          }
        },
        cutout: '60%'
      }
    });
  }

  function renderBarChart() {
    const ctx = dom.barChart.getContext('2d');
    const now = new Date();
    const months = [], incomeData = [], expenseData = [];

    for (let i = 5; i >= 0; i--) {
      const rawM = now.getMonth() - i;
      const yr   = now.getFullYear() + Math.floor(rawM / 12);
      const mo   = ((rawM % 12) + 12) % 12;
      const year = rawM < 0 ? yr - 1 : yr;
      months.push(getMonthName(mo, year));
      const totals = getMonthlyTotals(mo, year);
      incomeData.push(totals.income);
      expenseData.push(totals.expense);
    }

    if (barChartInstance) { barChartInstance.destroy(); barChartInstance = null; }
    const textColor = getChartTextColor();

    barChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label: 'Income',   data: incomeData,  backgroundColor: 'rgba(34,197,94,0.65)',  borderColor: '#22c55e', borderWidth: 1, borderRadius: 5 },
          { label: 'Expenses', data: expenseData, backgroundColor: 'rgba(239,68,68,0.65)',  borderColor: '#ef4444', borderWidth: 1, borderRadius: 5 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 10, padding: 8, font: { size: 11 }, color: textColor } },
          tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + formatCurrency(ctx.parsed.y) } }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => formatCurrency(v), font: { size: 10 }, color: textColor },
            grid: { color: 'rgba(148,163,184,0.12)' }
          },
          x: {
            ticks: { font: { size: 10 }, color: textColor },
            grid: { color: 'rgba(148,163,184,0.06)' }
          }
        }
      }
    });
  }

  // ============================================================
  //  RENDER — MONTHLY SUMMARY
  // ============================================================
  function renderMonthlySummary() {
    const { currentMonth, currentYear } = state;
    dom.monthDisplay.textContent = getMonthName(currentMonth, currentYear);

    const totals    = getMonthlyTotals(currentMonth, currentYear);
    const balClass  = totals.balance > 0 ? 'positive' : totals.balance < 0 ? 'negative' : 'accent';

    dom.summaryTotals.innerHTML = `
      <div class="balance-card">
        <span class="card-icon">💚</span>
        <div class="label">Income</div>
        <div class="value positive">${formatCurrency(totals.income)}</div>
      </div>
      <div class="balance-card">
        <span class="card-icon">🔴</span>
        <div class="label">Expenses</div>
        <div class="value negative">${formatCurrency(totals.expense)}</div>
      </div>
      <div class="balance-card card-balance">
        <span class="card-icon">⚖️</span>
        <div class="label">Balance</div>
        <div class="value ${balClass}">${formatCurrency(totals.balance)}</div>
      </div>
      <div class="balance-card">
        <span class="card-icon">🗂️</span>
        <div class="label">Transactions</div>
        <div class="value neutral">${totals.count}</div>
      </div>
    `;

    // Budget usage
    const spending  = getCategorySpending(currentMonth, currentYear);
    const hasBudget = Object.keys(state.budgets).some(k => state.budgets[k] > 0);
    if (hasBudget) {
      let html = `<h3>📊 Monthly Budget Usage</h3>`;
      let any  = false;
      state.categories.forEach(cat => {
        const limit = state.budgets[cat];
        if (!limit || limit <= 0) return;
        any = true;
        const spent   = spending[cat] || 0;
        const pct     = Math.min(100, (spent / limit) * 100);
        const cls     = pct > 95 ? 'over' : pct > 75 ? 'warn' : '';
        html += `
          <div class="budget-item">
            <span class="cat-name">${escapeHtml(cat)}</span>
            <div class="bar-track"><div class="bar-fill ${cls}" style="width:${pct.toFixed(1)}%;"></div></div>
            <span class="budget-text">${formatCurrency(spent)} / ${formatCurrency(limit)}</span>
          </div>`;
      });
      if (!any) html += `<p style="color:var(--text-muted);font-size:0.875rem;">No budgets set for this month.</p>`;
      dom.summaryBudget.innerHTML = html;
    } else {
      dom.summaryBudget.innerHTML = `<h3>📊 Monthly Budget Usage</h3><p style="color:var(--text-muted);font-size:0.875rem;">Set budgets in the Categories manager.</p>`;
    }

    // Category table
    const catSpending = getCategorySpending(currentMonth, currentYear);
    const sortedCats  = Object.keys(catSpending).sort((a, b) => catSpending[b] - catSpending[a]);
    if (sortedCats.length === 0) {
      dom.summaryTable.innerHTML = `<h3>📋 Spending by Category</h3><p style="color:var(--text-muted);font-size:0.875rem;">No expenses recorded for this month.</p>`;
    } else {
      const total = Object.values(catSpending).reduce((a, b) => a + b, 0);
      let tableHtml = `
        <h3>📋 Spending by Category</h3>
        <table>
          <thead>
            <tr><th>Category</th><th>Amount</th><th>% of Total</th></tr>
          </thead>
          <tbody>`;
      sortedCats.forEach(cat => {
        const amt = catSpending[cat];
        const pct = total > 0 ? ((amt / total) * 100).toFixed(1) : '0.0';
        tableHtml += `<tr><td>${escapeHtml(cat)}</td><td>${formatCurrency(amt)}</td><td>${pct}%</td></tr>`;
      });
      tableHtml += `</tbody></table>`;
      dom.summaryTable.innerHTML = tableHtml;
    }
  }

  // ============================================================
  //  RENDER — CATEGORY MANAGER
  //  No prompt() — inline number input + Save button per row
  // ============================================================
  function renderCategoryManager() {
    if (state.categories.length === 0) {
      dom.categoryList.innerHTML = `<li style="padding:1.25rem;color:var(--text-muted);text-align:center;font-size:0.875rem;">No categories yet.</li>`;
      return;
    }
    let html = '';
    state.categories.forEach(cat => {
      const currentBudget = state.budgets[cat] || '';
      const budgetLabel   = state.budgets[cat] > 0 ? formatCurrency(state.budgets[cat]) : 'No budget';
      html += `
        <li class="cat-item" data-category="${escapeHtml(cat)}">
          <span class="cat-name">${escapeHtml(cat)}</span>
          <div class="cat-budget-controls">
            <span class="cat-budget-current">${escapeHtml(budgetLabel)}</span>
            <input
              class="cat-budget-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value="${escapeHtml(String(currentBudget))}"
              data-budget-for="${escapeHtml(cat)}"
              aria-label="Budget for ${escapeHtml(cat)}"
            />
            <button class="btn-save" data-save-budget="${escapeHtml(cat)}" type="button">Save</button>
          </div>
          <button class="cat-delete" data-category="${escapeHtml(cat)}" type="button" aria-label="Delete category ${escapeHtml(cat)}">✕</button>
        </li>
      `;
    });
    dom.categoryList.innerHTML = html;
  }

  function populateCategorySelect() {
    const sel      = dom.txCategory;
    const currentVal = sel.value;
    sel.innerHTML  = '<option value="">-- Select category --</option>';
    state.categories.forEach(cat => {
      const opt    = document.createElement('option');
      opt.value    = cat;
      opt.textContent = cat;
      sel.appendChild(opt);
    });
    if (currentVal && state.categories.includes(currentVal)) {
      sel.value = currentVal;
    }
  }

  // ============================================================
  //  CRUD OPERATIONS
  // ============================================================
  function addTransaction(title, amount, type, category, date) {
    const tx = {
      id:       generateId(),
      title:    title.trim(),
      amount:   Number(amount),
      type:     type,
      category: category.trim() || 'Uncategorized',
      date:     date || getTodayISO()
    };
    state.transactions.push(tx);
    saveState();
    renderAll();
    showToast('Transaction added.', 'success');
    return tx;
  }

  function deleteTransaction(id) {
    const index = state.transactions.findIndex(tx => tx.id === id);
    if (index === -1) { showToast('Transaction not found.', 'error'); return false; }
    state.transactions.splice(index, 1);
    saveState();
    renderAll();
    showToast('Transaction deleted.', 'warning');
    return true;
  }

  function addCategory(name) {
    const trimmed = name.trim();
    if (!trimmed) { showToast('Category name cannot be empty.', 'error'); return false; }
    if (state.categories.includes(trimmed)) { showToast('Category already exists.', 'warning'); return false; }
    state.categories.push(trimmed);
    saveState();
    renderAll();
    renderCategoryManager();
    populateCategorySelect();
    showToast(`Category "${trimmed}" added.`, 'success');
    return true;
  }

  function deleteCategory(name) {
    if (state.categories.length <= 1) { showToast('Cannot delete the last category.', 'error'); return false; }
    const idx = state.categories.indexOf(name);
    if (idx === -1) { showToast('Category not found.', 'error'); return false; }
    state.categories.splice(idx, 1);
    if (state.budgets[name] != null) delete state.budgets[name];
    state.transactions.forEach(tx => { if (tx.category === name) tx.category = 'Uncategorized'; });
    saveState();
    renderAll();
    renderCategoryManager();
    populateCategorySelect();
    showToast(`Category "${name}" deleted.`, 'warning');
    return true;
  }

  function setBudget(category, amount) {
    const num = Number(amount);
    if (isNaN(num) || num < 0) { showToast('Budget must be a positive number.', 'error'); return false; }
    if (num === 0) {
      delete state.budgets[category];
    } else {
      state.budgets[category] = num;
    }
    saveState();
    renderAll();
    renderCategoryManager();
    showToast(`Budget for "${category}" set to ${formatCurrency(num)}.`, 'success');
    return true;
  }

  // ============================================================
  //  RENDER ALL
  // ============================================================
  function renderAll() {
    renderBalanceSummary();
    renderTransactionList();
    renderBudgetProgress();
    renderCharts();
    if (!dom.monthlyView.classList.contains('hidden')) {
      renderMonthlySummary();
    }
    updateSortButtons();
  }

  function updateSortButtons() {
    dom.sortBtns.forEach(btn => {
      btn.classList.toggle('sort-active', btn.dataset.criterion === state.sortCriterion);
    });
  }

  // ============================================================
  //  NAVIGATION & THEME
  // ============================================================
  function navigateTo(view) {
    state.currentView = view;
    dom.dashboardView.classList.toggle('hidden', view !== 'dashboard');
    dom.monthlyView.classList.toggle('hidden',   view !== 'monthly');

    // Update sidebar nav active states
    dom.navDashboard.classList.toggle('active', view === 'dashboard');
    dom.navMonthly.classList.toggle('active',   view === 'monthly');
    dom.navDashboard.setAttribute('aria-current', view === 'dashboard' ? 'page' : 'false');
    dom.navMonthly.setAttribute('aria-current',   view === 'monthly'   ? 'page' : 'false');

    if (view === 'monthly') {
      renderMonthlySummary();
    } else {
      renderAll();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const isDark = theme === 'dark';
    const icon   = isDark ? '☀️' : '🌙';
    const label  = isDark ? 'Light Mode' : 'Dark Mode';
    if (dom.themeToggle) {
      dom.themeToggle.querySelector('.nav-icon').textContent = icon;
      dom.themeToggle.querySelector('span:last-child').textContent = label;
    }
    if (dom.themeToggleMobile) {
      dom.themeToggleMobile.textContent = icon;
    }
  }

  function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    state.theme = next;
    applyTheme(next);
    saveState();
  }

  // ============================================================
  //  MOBILE SIDEBAR
  // ============================================================
  function openSidebar() {
    dom.sidebar.classList.add('open');
    dom.sidebarOverlay.classList.add('visible');
    dom.sidebarOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    dom.sidebar.classList.remove('open');
    dom.sidebarOverlay.classList.remove('visible');
    dom.sidebarOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // ============================================================
  //  EVENT DELEGATION & BINDING
  // ============================================================
  function setupEventDelegation() {

    // ---- Transaction delete (no confirm) ----
    dom.transactionList.addEventListener('click', function(e) {
      const btn = e.target.closest('.tx-delete');
      if (!btn) return;
      e.preventDefault();
      const id = btn.dataset.id;
      if (id) deleteTransaction(id);
    });

    // ---- Category delete (no confirm) ----
    dom.categoryList.addEventListener('click', function(e) {
      const btn = e.target.closest('.cat-delete');
      if (!btn) return;
      e.preventDefault();
      const cat = btn.dataset.category;
      if (cat) deleteCategory(cat);
    });

    // ---- Set budget via inline Save button (no prompt) ----
    dom.categoryList.addEventListener('click', function(e) {
      const btn = e.target.closest('[data-save-budget]');
      if (!btn) return;
      e.preventDefault();
      const cat = btn.dataset.saveBudget;
      if (!cat) return;
      // Find the paired input in the same list item
      const li    = btn.closest('.cat-item');
      const input = li ? li.querySelector('.cat-budget-input') : null;
      if (!input) return;
      const val = parseFloat(input.value);
      if (isNaN(val) || val < 0) {
        showToast('Please enter a valid positive number.', 'error');
        return;
      }
      setBudget(cat, val);
    });

    // Allow pressing Enter on the budget input to save
    dom.categoryList.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter') return;
      const input = e.target.closest('.cat-budget-input');
      if (!input) return;
      e.preventDefault();
      const cat = input.dataset.budgetFor;
      if (!cat) return;
      const val = parseFloat(input.value);
      if (isNaN(val) || val < 0) {
        showToast('Please enter a valid positive number.', 'error');
        return;
      }
      setBudget(cat, val);
    });

    // ---- Sort buttons ----
    dom.sortBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const crit = this.dataset.criterion;
        if (crit) {
          state.sortCriterion = crit;
          saveState();
          renderTransactionList();
          updateSortButtons();
        }
      });
    });

    // ---- Theme toggle (sidebar + mobile) ----
    if (dom.themeToggle) dom.themeToggle.addEventListener('click', toggleTheme);
    if (dom.themeToggleMobile) dom.themeToggleMobile.addEventListener('click', toggleTheme);

    // ---- Navigation (sidebar links) ----
    dom.navDashboard.addEventListener('click', function(e) { e.preventDefault(); navigateTo('dashboard'); closeSidebar(); });
    dom.navMonthly.addEventListener('click',   function(e) { e.preventDefault(); navigateTo('monthly');   closeSidebar(); });

    // ---- Month navigation ----
    dom.monthPrev.addEventListener('click', function() {
      state.currentMonth--;
      if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
      renderMonthlySummary();
    });
    dom.monthNext.addEventListener('click', function() {
      state.currentMonth++;
      if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
      renderMonthlySummary();
    });

    // ---- Category modal ----
    function openCategoryModal() {
      renderCategoryManager();
      dom.categoryModal.showModal();
    }
    if (dom.categoryModalBtn)       dom.categoryModalBtn.addEventListener('click', openCategoryModal);
    if (dom.categoryModalBtnMobile) dom.categoryModalBtnMobile.addEventListener('click', openCategoryModal);
    dom.categoryModalClose.addEventListener('click', () => dom.categoryModal.close());
    dom.categoryModal.addEventListener('click', function(e) { if (e.target === this) this.close(); });

    // ---- Add category form ----
    dom.addCategoryForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const name = dom.newCategoryName.value.trim();
      if (!name) { dom.newCategoryErr.textContent = 'Please enter a category name.'; return; }
      dom.newCategoryErr.textContent = '';
      if (addCategory(name)) {
        dom.newCategoryName.value = '';
        dom.newCategoryName.focus();
      }
    });

    // ---- Add transaction form ----
    dom.txForm.addEventListener('submit', function(e) {
      e.preventDefault();
      let valid = true;

      const title = dom.txTitle.value.trim();
      if (!title) { dom.txTitleErr.textContent = 'Title is required.'; valid = false; }
      else         { dom.txTitleErr.textContent = ''; }

      const amount = parseFloat(dom.txAmount.value);
      if (isNaN(amount) || amount <= 0) { dom.txAmountErr.textContent = 'Please enter a valid amount (> 0).'; valid = false; }
      else                               { dom.txAmountErr.textContent = ''; }

      const type = dom.txType.value;
      if (!type) { dom.txTypeErr.textContent = 'Please select a type.'; valid = false; }
      else        { dom.txTypeErr.textContent = ''; }

      const category = dom.txCategory.value;
      if (!category) { dom.txCategoryErr.textContent = 'Please select a category.'; valid = false; }
      else            { dom.txCategoryErr.textContent = ''; }

      const date = dom.txDate.value;
      if (!date) { dom.txDateErr.textContent = 'Please select a date.'; valid = false; }
      else        { dom.txDateErr.textContent = ''; }

      if (!valid) return;

      addTransaction(title, amount, type, category, date);
      dom.txForm.reset();
      dom.txDate.value = getTodayISO();
      dom.txTitle.focus();
    });

    // ---- Mobile sidebar toggle ----
    if (dom.sidebarToggle) dom.sidebarToggle.addEventListener('click', openSidebar);
    if (dom.sidebarOverlay) dom.sidebarOverlay.addEventListener('click', closeSidebar);

    // ---- Keyboard: Escape closes modal / sidebar ----
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (dom.categoryModal.open) dom.categoryModal.close();
        closeSidebar();
      }
    });
  }

  // ============================================================
  //  INIT
  // ============================================================
  function init() {
    try {
      loadState();
      applyTheme(state.theme);
      populateCategorySelect();
      dom.txDate.value = getTodayISO();
      setupEventDelegation();

      // Ensure all transactions have an id (migration guard)
      let needsSave = false;
      state.transactions.forEach(tx => { if (!tx.id) { tx.id = generateId(); needsSave = true; } });
      if (needsSave) saveState();

      renderAll();
      navigateTo('dashboard');
      dom.loadError.hidden = true;
    } catch (err) {
      console.error('Init error:', err);
      dom.loadError.hidden = false;
      showToast('Failed to load application. Please refresh.', 'error');
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
