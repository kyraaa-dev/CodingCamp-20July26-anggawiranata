# Design Document — Expense and Budget Visualizer

## Overview

The Expense and Budget Visualizer is a fully client-side single-page application (SPA) built with plain HTML, CSS, and Vanilla JavaScript. There is no build step, no package manager, and no external dependencies. All state lives in an in-memory object that is synchronised to `localStorage` on every mutation. The UI is composed of two logical views — **Dashboard** and **Monthly Summary** — rendered into a fixed shell by a lightweight view-router implemented inside the single JS file.

The application targets Chrome, Firefox, Edge, and Safari (current stable versions) and must render the Dashboard under 2 seconds on a 25 Mbps / ≤50 ms connection.

---

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│  index.html  (shell: nav, main#view-root, modals)           │
│                                                             │
│  css/style.css  (all visual rules, CSS custom properties    │
│                  for light/dark theme, utility classes)     │
│                                                             │
│  js/app.js                                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  State (in-memory)                                    │  │
│  │    transactions[], categories[], budgets{}, theme     │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  Storage Module  (localStorage read/write + fallback) │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  Domain Logic Module                                  │  │
│  │    (validation, aggregation, sorting, budget calc.)   │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  Chart Module  (Canvas API pie/doughnut + bar)        │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  UI / Renderer Module                                 │  │
│  │    (DOM builders for each view component)             │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  Router  (hash-based view switching)                  │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  Event Controller  (all event listeners, glues above) │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Interaction
      │
      ▼
Event Controller
      │  calls Domain Logic (validate, compute)
      ▼
State mutation (in-memory)
      │  synced to Storage Module
      ▼
Storage Module ──► localStorage  (or in-memory fallback)
      │
      ▼ (mutation complete)
Event Controller calls UI Renderer
      │
      ▼
DOM updated  ◄──  Chart Module (Canvas redrawn)
```

### View Routing

A simple hash-based router toggles visibility between `#dashboard` and `#monthly-summary` without page reloads. Navigating stores the active section id; the router calls the appropriate render function.

---

## File / Folder Structure

```
expense-budget-visualizer/
├── index.html          # Single HTML page — shell structure only
├── css/
│   └── style.css       # All styles (single file requirement)
└── js/
    └── app.js          # All JavaScript (single file requirement)
```

No other CSS or JS files are created. All external font or icon needs are handled via Unicode characters or SVG inline in HTML to avoid CDN dependencies.

---

## Components and Interfaces

### index.html — Shell Structure

```html
<nav>                            <!-- Top navigation bar -->
  <span class="app-title">…</span>
  <nav-links>                    <!-- Dashboard | Monthly Summary links -->
  <button id="theme-toggle">    <!-- Dark/Light toggle -->
</nav>

<main id="view-root">
  <!-- View: Dashboard -->
  <section id="dashboard" class="view">
    <div id="balance-summary">   <!-- Balance, Income, Expense cards -->
    <div id="charts-area">
      <canvas id="pie-chart">
      <canvas id="bar-chart">
    </div>
    <div id="budget-progress">   <!-- Per-category budget rows -->
    <div id="transaction-panel">
      <div id="sort-controls">
      <ul id="transaction-list">
      <form id="transaction-form">
    </div>
  </section>

  <!-- View: Monthly Summary -->
  <section id="monthly-summary" class="view hidden">
    <div id="month-selector">    <!-- Month/Year picker controls -->
    <div id="summary-totals">
    <div id="summary-budget-usage">
    <div id="summary-category-table">
  </section>
</main>

<!-- Modal: Category Manager -->
<dialog id="category-modal"> … </dialog>

<!-- Toast / inline error area -->
<div id="toast-container" aria-live="polite">
```

### CSS Architecture (`css/style.css`)

The stylesheet uses CSS Custom Properties (variables) for theming. Switching themes applies a `data-theme="dark"` attribute on `<html>`, toggling a separate set of variable values.

```css
:root {
  --color-bg: #ffffff;
  --color-surface: #f5f5f5;
  --color-text: #111111;
  --color-accent: #3b82f6;
  --color-income: #22c55e;
  --color-expense: #ef4444;
  --color-warning-red: #dc2626;
  --color-warning-yellow: #f59e0b;
  /* … spacing, radius, font tokens … */
}

[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-text: #f1f5f9;
  /* … overrides … */
}
```

Key utility classes:
- `.budget-exceeded` — applies `--color-warning-red` background
- `.budget-near-limit` — applies `--color-warning-yellow` background
- `.hidden` — `display: none`
- `.sort-active` — highlights active sort control
- `.error-msg` — inline validation error styling

### JS Module Boundaries (`js/app.js`)

All code is inside one file, organised into immediately-invoked or exported-via-closure "modules" using the **Revealing Module Pattern** inside a top-level IIFE or ES Module structure:

```
app.js
│
├── /* ── CONSTANTS ── */
│     STORAGE_KEYS, DEFAULT_CATEGORIES, MAX_TITLE_LEN, etc.
│
├── /* ── STATE ── */
│     let state = { transactions, categories, budgets, theme }
│
├── /* ── STORAGE MODULE ── */
│     loadAll(), saveTransactions(), saveCategories(),
│     saveBudgets(), saveTheme()
│
├── /* ── DOMAIN LOGIC MODULE ── */
│     validateTransaction(fields)      → { valid, errors }
│     validateBudget(amount)           → { valid, error }
│     validateCategory(name, existing) → { valid, error }
│     calcBalance(transactions)        → { balance, income, expenses }
│     calcCategoryTotals(transactions) → Map<category, amount>
│     calcMonthlyTotals(transactions, month, year)
│     calcBudgetStatus(spent, budget)  → 'ok' | 'near' | 'exceeded'
│     sortTransactions(list, criterion) → sorted list
│     filterByMonth(transactions, month, year) → filtered list
│     generateId()                     → unique string
│
├── /* ── CHART MODULE ── */
│     drawPieChart(canvas, data)       → void
│     drawBarChart(canvas, data)       → void
│     clearCanvas(canvas)              → void
│     CHART_COLORS[]                   (palette array)
│
├── /* ── UI / RENDERER MODULE ── */
│     renderBalanceSummary(totals)
│     renderTransactionList(transactions)
│     renderBudgetProgress(categoryTotals, budgets)
│     renderCharts(transactions)
│     renderMonthlySummary(month, year)
│     renderCategoryManager(categories)
│     showInlineError(fieldId, message)
│     clearFormErrors()
│     showToast(message, type)
│
├── /* ── ROUTER ── */
│     navigate(viewId)
│     initRouter()
│
├── /* ── EVENT CONTROLLER ── */
│     bindTransactionForm()
│     bindDeleteTransaction()
│     bindSortControls()
│     bindBudgetForm()
│     bindCategoryManager()
│     bindThemeToggle()
│     bindMonthSelector()
│
└── /* ── INIT ── */
      init()   ← called on DOMContentLoaded
```

---

## Data Models

All data is serialised as JSON and stored under fixed `localStorage` keys.

### Storage Keys

```js
const STORAGE_KEYS = {
  TRANSACTIONS: 'ebv_transactions',
  CATEGORIES:   'ebv_categories',
  BUDGETS:      'ebv_budgets',
  THEME:        'ebv_theme',
};
```

### Transaction Object

```js
/**
 * @typedef {Object} Transaction
 * @property {string}  id        - UUID-like unique identifier (Date.now() + random suffix)
 * @property {string}  title     - 1–100 characters
 * @property {number}  amount    - Positive number, max 999_999_999.99, stored as float
 * @property {'income'|'expense'} type
 * @property {string}  category  - References a category name in categories[]
 * @property {string}  date      - ISO 8601 date string "YYYY-MM-DD", not future
 * @property {number}  createdAt - Unix timestamp ms, used for tie-breaking sort
 */
```

Stored as: `localStorage['ebv_transactions'] = JSON.stringify(Transaction[])`

### Category Object

```js
/**
 * @typedef {Object} Category
 * @property {string}  name     - Unique (case-insensitive), 1–50 characters
 * @property {boolean} isCustom - false for predefined, true for user-created
 */
```

Default categories array (always present):
```js
const DEFAULT_CATEGORIES = [
  { name: 'Food',          isCustom: false },
  { name: 'Transport',     isCustom: false },
  { name: 'Entertainment', isCustom: false },
  { name: 'Health',        isCustom: false },
  { name: 'Shopping',      isCustom: false },
  { name: 'Salary',        isCustom: false },
];
```

Stored as: `localStorage['ebv_categories'] = JSON.stringify(Category[])`

### Budget Object

```js
/**
 * @typedef {Object} Budgets
 * A flat key-value map: category name → budget amount.
 * Example: { "Food": 500, "Transport": 150.00 }
 */
```

Stored as: `localStorage['ebv_budgets'] = JSON.stringify({ [categoryName]: number })`

### Theme Value

Stored as: `localStorage['ebv_theme'] = '"dark"'` or `'"light"'` (JSON string)

### In-Memory State Shape

```js
let state = {
  transactions: [],   // Transaction[]
  categories:   [],   // Category[]  — includes defaults + custom
  budgets:      {},   // { [name]: number }
  theme:        'light', // 'light' | 'dark'
  sortCriterion: 'date-desc', // current sort
  currentView:  'dashboard',
  summaryMonth: null, // { month: number, year: number } | null
  storageAvailable: true, // false if localStorage unavailable
};
```

---

## Chart Rendering — Canvas API

Both charts are rendered onto `<canvas>` elements using the 2D Canvas API. No external chart library is used.

### Pie / Doughnut Chart (`drawPieChart`)

**Algorithm:**
1. Compute total expenses; calculate each category's fraction.
2. Iterate slices: for each, compute start angle and sweep angle (`fraction * 2π`).
3. Draw slice using `ctx.arc()` with `ctx.fill()` and a stroke for separation.
4. Doughnut hole: fill a central circle with `--color-surface` background color (read via `getComputedStyle`).
5. Draw labels: place category name + percentage at the midpoint angle, at radius `outerRadius * 0.75` for outer labels, using `ctx.fillText()`.
6. If only one slice: render full circle and center label.
7. If no data: clear canvas and render a centered "No expense data" text message.

**Colour palette:**  A predefined array of 12 visually distinct colours, cycling when there are more than 12 categories.

```
CHART_COLORS = ['#3b82f6','#ef4444','#22c55e','#f59e0b',
                '#8b5cf6','#ec4899','#06b6d4','#84cc16',
                '#f97316','#6366f1','#14b8a6','#e11d48']
```

### Bar Chart (`drawBarChart`)

**Algorithm:**
1. Determine the 6-month window: current month and 5 preceding months (computed from today's date).
2. For each month, compute `totalIncome` and `totalExpenses` by filtering `state.transactions`.
3. Determine `maxValue = max of all income and expense values`; derive bar height scale.
4. Draw axes: X-axis (month labels "Jan 25") and Y-axis (value labels, ~5 ticks).
5. For each month, draw two adjacent bars (income = `--color-income`, expense = `--color-expense`) using `ctx.fillRect()`.
6. Draw value labels above each bar if they fit.

**Responsiveness:** Canvas width is set to the container's `clientWidth` before each draw (via `canvas.width = canvas.parentElement.clientWidth`). A `ResizeObserver` triggers a redraw on container resize.

### Theme Awareness

Chart colours for backgrounds (doughnut hole, text) are read at draw-time from CSS custom properties via `getComputedStyle(document.documentElement)`, so they automatically reflect the active theme.

---

## State Management Pattern

### Principle

Single source of truth: the `state` object in memory. `localStorage` is a persistence layer, not the working copy.

### Mutation Lifecycle

Every state-changing operation follows this sequence:

```
1. Validate inputs          (Domain Logic)
2. Mutate state object      (direct property assignment)
3. Persist to localStorage  (Storage Module — may fail gracefully)
4. Re-render affected UI    (UI/Renderer Module)
```

### localStorage Sync Functions

```js
function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(state.transactions));
  } catch (e) {
    state.storageAvailable = false;
    showStorageWarning();
  }
}
// similar pattern for saveCategories(), saveBudgets(), saveTheme()
```

### Load on Init

```js
function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    state.transactions = raw ? JSON.parse(raw) : [];
  } catch (e) {
    state.transactions = []; // corrupted → safe default
  }
  // … repeat for categories, budgets, theme …
}
```

Corrupted JSON (throws on `JSON.parse`) is silently reset to the safe default — no error is displayed to the user (per Requirement 10.3).

---

## UI Layout Structure

### Navigation Bar

Sticky top bar containing:
- App name/logo (left)
- View links: "Dashboard" | "Monthly Summary" (centre, or hamburger on narrow screens)
- Theme toggle button with sun/moon icon (right)

### Dashboard View

```
┌──────────────────────────────────────────────────────┐
│  Balance Card   │  Income Card   │  Expense Card     │
├─────────────────┴────────────────┴───────────────────┤
│  Pie/Doughnut Chart (left)  │  Bar Chart (right)     │
├──────────────────────────────────────────────────────┤
│  Budget Progress Section                             │
│  [Category] [Progress Bar] [Spent / Limit] [%]      │
├──────────────────────────────────────────────────────┤
│  Sort Controls: [Date ▲▼] [Amount ▲▼] [Category A-Z]│
├──────────────────────────────────────────────────────┤
│  Transaction List (scrollable)                       │
│  [Title] [Category] [Date] [Amount] [Delete btn]     │
├──────────────────────────────────────────────────────┤
│  Add Transaction Form                                │
│  [Title] [Amount] [Type] [Category] [Date] [Add btn] │
└──────────────────────────────────────────────────────┘
```

### Monthly Summary View

```
┌──────────────────────────────────────────────────────┐
│  Month/Year selector  [◄ Prev]  [Jan 2025]  [Next ►] │
├──────────────────────────────────────────────────────┤
│  Summary Cards: Total Income | Total Expense | Net   │
├──────────────────────────────────────────────────────┤
│  Per-Category Table                                  │
│  [Category] [Spent] [Budget] [Usage %] [Status bar]  │
├──────────────────────────────────────────────────────┤
│  (if no budget defined: shows spending total only)   │
└──────────────────────────────────────────────────────┘
```

---

## Error Handling Strategy

| Scenario | Handling |
|---|---|
| Invalid transaction form field | Inline error message below the field; form submission blocked |
| Invalid budget value | Inline error below budget input; previous value preserved |
| Duplicate or invalid category name | Inline error in category manager modal |
| Category deletion with associated transactions | Error message in modal; deletion blocked |
| `localStorage` write failure | Non-blocking toast warning: "Data cannot be saved this session"; in-memory operation continues |
| `localStorage` read / parse failure | Silent reset to safe default; no user-visible error |
| Missing required file (HTML/CSS/JS) | The `<noscript>` tag and a `<div id="load-error">` (initially hidden, shown by inline HTML if JS fails) display a user-friendly message |
| No data for chart | Placeholder text rendered inside canvas area |
| No transactions for selected month | "No data available for this period." message in Monthly Summary |

All inline validation errors are cleared when the user begins correcting the associated field (`input` or `change` event).

Toast notifications auto-dismiss after 4 seconds and are announced via `aria-live="polite"` for screen readers.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Transaction persistence round-trip

*For any* valid transaction object added to the app, serialising the current state to localStorage and then deserialising it must produce a transaction list that contains an item equal to the original transaction in all fields.

**Validates: Requirements 1.2, 10.1, 10.2**

---

### Property 2: Balance invariant

*For any* non-empty list of transactions, the computed balance must equal the sum of all income amounts minus the sum of all expense amounts, rounded to 2 decimal places.

**Validates: Requirements 2.1, 2.2, 2.3**

---

### Property 3: Whitespace/empty title rejection

*For any* string composed entirely of whitespace characters (including the empty string), submitting it as a transaction title must be rejected, and the transaction list must remain unchanged.

**Validates: Requirements 1.3**

---

### Property 4: Future-date rejection

*For any* date string representing a date strictly after today, submitting it as a transaction date must be rejected, and the transaction list must remain unchanged.

**Validates: Requirements 1.1, 1.3**

---

### Property 5: Pie chart percentages sum to 100

*For any* non-empty collection of expense transactions, the sum of all per-category percentages computed for the pie chart must equal 100.0 (within a floating-point tolerance of ±0.1).

**Validates: Requirements 3.1**

---

### Property 6: Budget status classification

*For any* (spent, budget) pair where both are positive numbers, `calcBudgetStatus` must return `'exceeded'` when `spent ≥ budget`, `'near'` when `0.8 × budget ≤ spent < budget`, and `'ok'` otherwise.

**Validates: Requirements 4.4, 8.1, 8.2**

---

### Property 7: Category uniqueness enforcement

*For any* existing list of categories, attempting to add a category whose name matches an existing name (case-insensitive) must be rejected, and the category list must remain unchanged.

**Validates: Requirements 5.4**

---

### Property 8: Monthly filter correctness

*For any* list of transactions and any (month, year) pair, `filterByMonth` must return exactly the transactions whose date falls within that calendar month and no others.

**Validates: Requirements 6.2, 6.3**

---

### Property 9: Sort stability and completeness

*For any* list of transactions and any sort criterion, `sortTransactions` must return a list containing exactly the same transactions (no additions, no removals) in a deterministic order consistent with the criterion.

**Validates: Requirements 7.1, 7.2**

---

### Property 10: Storage fallback preserves in-memory state

*For any* sequence of add/delete operations performed while localStorage is unavailable, the in-memory state after each operation must reflect the mutation correctly (same result as if storage were available), and no previously added transaction must be lost within the same session.

**Validates: Requirements 1.6, 10.4**

---

## Testing Strategy

### Dual Testing Approach

Unit tests and property-based tests work together. Unit tests verify specific examples and edge cases; property-based tests verify universal invariants across large randomised input spaces.

### Property-Based Testing

The feature involves substantial pure-function logic (balance calculations, validation, sorting, filtering, chart data preparation, budget status classification) that benefits strongly from property-based testing.

**Library:** [fast-check](https://github.com/dubzzz/fast-check) (JavaScript property-based testing library).

**Configuration:** Each property-based test runs a minimum of **100 iterations**.

**Tag format per test:**
```
// Feature: expense-budget-visualizer, Property {N}: {property_text}
```

Property tests to implement (one test per property):

| # | Property | Module Under Test |
|---|---|---|
| 1 | Transaction persistence round-trip | Storage Module + Domain Logic |
| 2 | Balance invariant | `calcBalance` |
| 3 | Whitespace/empty title rejection | `validateTransaction` |
| 4 | Future-date rejection | `validateTransaction` |
| 5 | Pie chart percentages sum to 100 | `calcCategoryTotals` + percentage calc |
| 6 | Budget status classification | `calcBudgetStatus` |
| 7 | Category uniqueness enforcement | `validateCategory` |
| 8 | Monthly filter correctness | `filterByMonth` |
| 9 | Sort stability and completeness | `sortTransactions` |
| 10 | Storage fallback preserves in-memory state | Storage Module |

### Unit / Example-Based Tests

Unit tests target:
- Specific valid and invalid transaction inputs
- Edge cases: single transaction, max-value amounts, boundary dates
- Category deletion blocked when transactions exist
- Theme load: stored "dark"/"light" value applied on init
- Theme fallback: `prefers-color-scheme` used when no stored value
- `localStorage` corruption: safe defaults initialised without error
- No-data states: empty charts render placeholder text

### Integration Tests

- Full add-transaction flow: form submit → state mutation → DOM update → localStorage write
- Full delete-transaction flow: confirm → state mutation → balance recalc → DOM update
- View navigation: Dashboard ↔ Monthly Summary without page reload
- Theme toggle: DOM attribute updated, colour variables applied, value persisted

### Browser Compatibility

All acceptance criteria from Requirements 1–10 must pass in the current stable versions of Chrome, Firefox, Edge, and Safari. Canvas 2D API, CSS Custom Properties, `localStorage`, `dialog` element, and `ResizeObserver` all have full support in these browsers.
