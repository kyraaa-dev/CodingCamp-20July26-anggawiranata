# Implementation Plan: Expense and Budget Visualizer

## Overview

Build a fully client-side SPA using plain HTML, CSS, and Vanilla JavaScript. The implementation proceeds in dependency order: scaffold the file structure and shell first, then layer in CSS theming, the JS module skeleton, domain logic, chart rendering, UI rendering, routing, event wiring, and finally polish. Each step produces runnable code that integrates cleanly with the previous step.

Tech stack: HTML, CSS, Vanilla JavaScript only. One CSS file (`css/style.css`), one JS file (`js/app.js`). Data persisted to `localStorage`.

---

## Tasks

- [ ] 1. Project scaffold — HTML shell, CSS base, JS skeleton
  - [ ] 1.1 Create `index.html` with semantic shell structure
    - Add `<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`
    - Include `<link rel="stylesheet" href="css/style.css">` and `<script src="js/app.js" defer>` (no inline styles or scripts)
    - Add `<nav>` with app title, `#dashboard` and `#monthly-summary` nav links, and `#theme-toggle` button
    - Add `<main id="view-root">` containing `<section id="dashboard" class="view">` and `<section id="monthly-summary" class="view hidden">`
    - Add all sub-containers inside `#dashboard`: `#balance-summary`, `#charts-area` (with `<canvas id="pie-chart">` and `<canvas id="bar-chart">`), `#budget-progress`, `#sort-controls`, `#transaction-list`, `#transaction-form`
    - Add all sub-containers inside `#monthly-summary`: `#month-selector`, `#summary-totals`, `#summary-budget-usage`, `#summary-category-table`
    - Add `<dialog id="category-modal">` for the category manager
    - Add `<div id="toast-container" aria-live="polite">` and a hidden `<div id="load-error">` for JS-failure fallback
    - Add `<noscript>` tag with a user-friendly message
    - _Requirements: 11.2, 11.3, 11.7_

  - [ ] 1.2 Create `css/style.css` with CSS custom properties and base layout
    - Define `:root` with all design tokens: `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-income`, `--color-expense`, `--color-warning-red`, `--color-warning-yellow`, spacing, radius, and font tokens
    - Define `[data-theme="dark"]` block overriding all colour tokens
    - Write base reset/normalize rules and body layout
    - Add utility classes: `.hidden`, `.error-msg`, `.sort-active`, `.budget-exceeded`, `.budget-near-limit`
    - Add nav bar styles (sticky, flex, space-between), view section styles, and responsive layout (flexbox/grid, narrow-screen hamburger or wrap)
    - Add chart area, balance card, budget progress row, transaction list item, and form field styles
    - Add modal (`<dialog>`) styles and toast notification styles
    - _Requirements: 9.2, 9.3, 11.2_

  - [ ] 1.3 Create `js/app.js` with IIFE skeleton, constants, and in-memory state
    - Wrap all code in a top-level IIFE `(function() { 'use strict'; … })();`
    - Define `STORAGE_KEYS` constant: `TRANSACTIONS`, `CATEGORIES`, `BUDGETS`, `THEME`
    - Define `DEFAULT_CATEGORIES` array (Food, Transport, Entertainment, Health, Shopping, Salary) with `isCustom: false`
    - Define `MAX_TITLE_LEN = 100`, `MAX_CATEGORY_LEN = 50`, `MAX_AMOUNT = 999_999_999.99`
    - Declare `let state = { transactions: [], categories: [], budgets: {}, theme: 'light', sortCriterion: 'date-desc', currentView: 'dashboard', summaryMonth: null, storageAvailable: true }`
    - Add stub function bodies for all modules (Storage, Domain Logic, Chart, UI/Renderer, Router, Event Controller, init) — stubs log a message and return safe defaults
    - Call `init()` inside a `DOMContentLoaded` listener at the bottom
    - _Requirements: 11.1, 11.3, 10.1_

- [ ] 2. Storage Module
  - [ ] 2.1 Implement `loadAll()` and all `save*()` functions
    - Implement `loadAll()`: read each key with `try/catch`; on success parse JSON; on failure (missing or corrupt) reset to safe default (empty array, empty object, `'light'`); restore `DEFAULT_CATEGORIES` merged with any stored custom categories
    - Implement `saveTransactions()`, `saveCategories()`, `saveBudgets()`, `saveTheme()`: each wraps `localStorage.setItem` in `try/catch`; on failure sets `state.storageAvailable = false` and calls `showToast` with a non-blocking warning
    - Detect `localStorage` availability at init by attempting a test write; set `state.storageAvailable` accordingly
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 1.6_

  - [ ]* 2.2 Write property test for Storage Module — Property 10: Storage fallback
    - **Property 10: Storage fallback preserves in-memory state**
    - **Validates: Requirements 1.6, 10.4**
    - Use fast-check to simulate a sequence of add/delete operations while `localStorage` is stubbed to throw; assert that `state.transactions` after each operation matches expected in-memory state

  - [ ]* 2.3 Write property test for Storage Module — Property 1: Transaction persistence round-trip
    - **Property 1: Transaction persistence round-trip**
    - **Validates: Requirements 1.2, 10.1, 10.2**
    - Use fast-check to generate valid transaction objects; serialize via `saveTransactions()` then deserialize via `loadAll()`; assert the round-tripped list equals the original

- [ ] 3. Domain Logic Module
  - [ ] 3.1 Implement validation functions
    - Implement `validateTransaction(fields)`: check title (non-empty after trim, ≤100 chars), amount (numeric, 0.01–999,999,999.99), type (`'income'`|`'expense'`), category (non-empty, must exist in `state.categories`), date (valid ISO date, not in future); return `{ valid: boolean, errors: { [field]: string } }`
    - Implement `validateBudget(amount)`: numeric, 0.01–999,999,999.99; return `{ valid, error }`
    - Implement `validateCategory(name, existing)`: non-empty after trim, ≤50 chars, no case-insensitive duplicate in `existing`; return `{ valid, error }`
    - Implement `generateId()`: returns `Date.now().toString(36) + Math.random().toString(36).slice(2)`
    - _Requirements: 1.3, 4.6, 5.4, 5.5_

  - [ ]* 3.2 Write property test for validation — Property 3: Whitespace/empty title rejection
    - **Property 3: Whitespace/empty title rejection**
    - **Validates: Requirements 1.3**
    - Use fast-check to generate strings composed entirely of whitespace or empty strings; assert `validateTransaction` returns `valid: false` and transaction list is unchanged

  - [ ]* 3.3 Write property test for validation — Property 4: Future-date rejection
    - **Property 4: Future-date rejection**
    - **Validates: Requirements 1.1, 1.3**
    - Use fast-check to generate date strings strictly after today; assert `validateTransaction` returns `valid: false`

  - [ ]* 3.4 Write property test for validation — Property 7: Category uniqueness enforcement
    - **Property 7: Category uniqueness enforcement**
    - **Validates: Requirements 5.4**
    - Use fast-check to generate a category list plus a duplicate name (case-insensitive variant); assert `validateCategory` returns `valid: false` and category list is unchanged

  - [ ] 3.5 Implement aggregation and utility functions
    - Implement `calcBalance(transactions)`: sum income, sum expenses, compute balance; round all to 2 decimal places; return `{ balance, income, expenses }`
    - Implement `calcCategoryTotals(transactions)`: filter expense transactions; aggregate amounts per category; return `Map<string, number>`
    - Implement `calcMonthlyTotals(transactions, month, year)`: filter by month+year, then return `{ income, expenses, balance }` rounded to 2 decimal places
    - Implement `calcBudgetStatus(spent, budget)`: return `'exceeded'` if `spent >= budget`, `'near'` if `0.8 * budget <= spent < budget`, else `'ok'`
    - Implement `sortTransactions(list, criterion)`: support `'date-desc'`, `'date-asc'`, `'amount-desc'`, `'amount-asc'`, `'category-asc'`; tie-break by `createdAt` descending; return new sorted array without mutating input
    - Implement `filterByMonth(transactions, month, year)`: filter by matching `YYYY-MM` prefix of `transaction.date`; return new array
    - _Requirements: 2.1, 2.2, 2.3, 4.4, 7.1, 6.2, 6.3, 8.1, 8.2_

  - [ ]* 3.6 Write property test for aggregation — Property 2: Balance invariant
    - **Property 2: Balance invariant**
    - **Validates: Requirements 2.1, 2.2, 2.3**
    - Use fast-check to generate lists of valid transactions; assert `calcBalance` result equals sum(income) − sum(expenses) rounded to 2 decimal places

  - [ ]* 3.7 Write property test for aggregation — Property 6: Budget status classification
    - **Property 6: Budget status classification**
    - **Validates: Requirements 4.4, 8.1, 8.2**
    - Use fast-check to generate positive (spent, budget) pairs; assert `calcBudgetStatus` returns correct classification for all boundary regions

  - [ ]* 3.8 Write property test for aggregation — Property 8: Monthly filter correctness
    - **Property 8: Monthly filter correctness**
    - **Validates: Requirements 6.2, 6.3**
    - Use fast-check to generate transaction lists with random dates; for a random (month, year) assert `filterByMonth` returns exactly transactions in that month and no others

  - [ ]* 3.9 Write property test for aggregation — Property 9: Sort stability and completeness
    - **Property 9: Sort stability and completeness**
    - **Validates: Requirements 7.1, 7.2**
    - Use fast-check to generate transaction lists and random sort criteria; assert `sortTransactions` returns list with identical elements (same count, same ids) in deterministic order

- [ ] 4. Checkpoint — Verify core logic before building UI
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Chart Module
  - [ ] 5.1 Implement `drawPieChart(canvas, data)` and chart utilities
    - Read `--color-surface` and `--color-text` via `getComputedStyle` at draw-time for theme awareness
    - Implement slice computation: total expenses → per-category fraction → start/sweep angles using `ctx.arc()`
    - Draw doughnut hole by filling a central circle with `--color-surface` color
    - Draw percentage labels at `outerRadius * 0.75` using `ctx.fillText()` (category name + rounded-to-1-decimal %)
    - Handle single-slice case (full circle + center label) and no-data case (clear canvas, render centered placeholder text)
    - Define `CHART_COLORS` array of 12 colours cycling for > 12 categories
    - Implement `clearCanvas(canvas)`: resets width/height to clear and prevent ghosting
    - _Requirements: 3.1, 3.4, 3.5_

  - [ ]* 5.2 Write property test for Chart Module — Property 5: Pie chart percentages sum to 100
    - **Property 5: Pie chart percentages sum to 100**
    - **Validates: Requirements 3.1**
    - Use fast-check to generate non-empty collections of expense transactions across categories; compute per-category percentages from `calcCategoryTotals`; assert their sum equals 100.0 within ±0.1 tolerance

  - [ ] 5.3 Implement `drawBarChart(canvas, data)`
    - Compute 6-month window: current month and 5 preceding months from `new Date()`
    - For each month call `calcMonthlyTotals` to get income and expenses
    - Derive `maxValue`; scale bar heights to canvas height minus axis space
    - Draw X-axis (month labels "MMM YY") and Y-axis (~5 value ticks) using `ctx.fillText()` and `ctx.strokeStyle`
    - Draw paired bars per month: income (`--color-income`) and expense (`--color-expense`) using `ctx.fillRect()`; draw value labels above bars if space allows
    - Set `canvas.width = canvas.parentElement.clientWidth` before each draw; attach a `ResizeObserver` on the chart container to re-draw on resize
    - Handle no-data case: clear canvas and render centered placeholder text
    - _Requirements: 3.2, 3.3, 3.4_

- [ ] 6. UI / Renderer Module
  - [ ] 6.1 Implement balance summary and budget progress renderers
    - Implement `renderBalanceSummary(totals)`: update `#balance-summary` inner HTML with balance, income, and expenses cards showing values rounded to 2 decimal places; handle zero-state per Requirement 2.5
    - Implement `renderBudgetProgress(categoryTotals, budgets)`: for each category with a defined budget, render a progress row showing category name, progress bar (width = `min(spent/budget, 1) * 100%`), spent/limit amounts, and percentage; apply `.budget-exceeded` or `.budget-near-limit` classes via `calcBudgetStatus`; omit categories without a budget
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 4.3, 4.4, 4.5, 8.1, 8.2, 8.4, 8.5_

  - [ ] 6.2 Implement transaction list renderer and form error helpers
    - Implement `renderTransactionList(transactions)`: build and insert `<li>` elements for each transaction showing title, category, date, formatted amount (income green / expense red), and a delete button with `data-id` attribute; show empty-state message if list is empty; respect current `state.sortCriterion`
    - Implement `showInlineError(fieldId, message)`: insert or update an `.error-msg` element adjacent to the field; clear on next `input`/`change` event
    - Implement `clearFormErrors()`: remove all `.error-msg` elements from the transaction form
    - Implement `showToast(message, type)`: append a toast div to `#toast-container` with the message and type class; auto-remove after 4 seconds; accessible via `aria-live="polite"` on the container
    - _Requirements: 1.3, 1.5, 10.4_

  - [ ] 6.3 Implement chart render orchestrator and sort control renderer
    - Implement `renderCharts(transactions)`: call `clearCanvas` then `drawPieChart` with expense category totals, and `drawBarChart` with the full transaction list
    - Implement sort control renderer (called from `renderTransactionList`): highlight active sort button with `.sort-active`; render controls in default state when list is empty
    - _Requirements: 3.1, 3.2, 3.3, 7.4, 7.5_

  - [ ] 6.4 Implement Monthly Summary renderer
    - Implement `renderMonthlySummary(month, year)`: call `filterByMonth`, then `calcMonthlyTotals`; update `#summary-totals` cards; build per-category table in `#summary-category-table` with spent, budget (if set), and usage % (rounded to whole number); show "no data" message if no transactions; omit budget usage section if no budgets defined
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ] 6.5 Implement Category Manager renderer
    - Implement `renderCategoryManager(categories)`: populate `<dialog id="category-modal">` with list of all categories; mark predefined ones as non-deletable; add delete buttons for custom categories; wire add-category form inside modal
    - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.7_

- [ ] 7. Router and Theme Module
  - [ ] 7.1 Implement hash-based router and theme initialisation
    - Implement `navigate(viewId)`: add `.hidden` to the currently active view section, remove `.hidden` from the target section, update `state.currentView`, update `aria-current` on nav links
    - Implement `initRouter()`: read `location.hash` on load; default to `#dashboard`; attach `hashchange` listener calling `navigate`
    - Implement theme init: in `loadAll()`, after reading the stored theme value, set `document.documentElement.setAttribute('data-theme', theme)` before any rendering to prevent flash of unstyled content; fall back to `window.matchMedia('(prefers-color-scheme: dark)')` when no stored value or invalid value
    - _Requirements: 6.1, 9.5, 9.6, 9.7_

- [ ] 8. Event Controller — wiring all interactions
  - [ ] 8.1 Implement `bindTransactionForm()` and `bindDeleteTransaction()`
    - `bindTransactionForm()`: listen to `submit` on `#transaction-form`; call `validateTransaction`; on failure call `showInlineError` per field; on success call `generateId`, push to `state.transactions`, call `saveTransactions()`, then call `renderTransactionList`, `renderBalanceSummary`, `renderBudgetProgress`, `renderCharts`, and `clearFormErrors()`; clear `input`/`change` errors on each field
    - `bindDeleteTransaction()`: use event delegation on `#transaction-list` for clicks on delete buttons; show a `window.confirm` prompt; on confirm splice transaction from `state.transactions`, call `saveTransactions()`, then re-render list, summary, budget progress, and charts
    - _Requirements: 1.2, 1.3, 1.4, 2.4, 3.3, 4.3, 8.3_

  - [ ] 8.2 Implement `bindSortControls()` and `bindBudgetForm()`
    - `bindSortControls()`: listen to clicks on sort buttons in `#sort-controls`; update `state.sortCriterion`; call `sortTransactions` and `renderTransactionList` within 300 ms
    - `bindBudgetForm()`: listen to budget amount inputs per category (either a dedicated form or inline inputs in `#budget-progress`); call `validateBudget`; on failure call `showInlineError` and restore previous value; on success update `state.budgets[category]`, call `saveBudgets()`, and call `renderBudgetProgress` within 1 second
    - _Requirements: 4.1, 4.2, 4.6, 4.7, 7.1, 7.2, 7.3, 7.4_

  - [ ] 8.3 Implement `bindCategoryManager()`, `bindThemeToggle()`, and `bindMonthSelector()`
    - `bindCategoryManager()`: open/close `<dialog id="category-modal">` via its show/close methods; inside modal handle add-category submit (call `validateCategory`, on success push to `state.categories`, call `saveCategories()`, update transaction form's `<select>`, and `renderCategoryManager`); handle delete-category click (check for associated transactions, if any show error via `showToast` or inline modal error, else splice from `state.categories`, call `saveCategories()`, and `renderCategoryManager`)
    - `bindThemeToggle()`: listen to click on `#theme-toggle`; toggle `state.theme` between `'light'` and `'dark'`; update `document.documentElement` `data-theme` attribute; call `saveTheme()`; re-draw charts so they pick up new theme colours within 200 ms
    - `bindMonthSelector()`: listen to prev/next buttons in `#month-selector`; update `state.summaryMonth`; call `renderMonthlySummary` with new month/year; prevent navigating beyond January 2000 or current month
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.2, 9.1, 9.2, 9.3, 9.4_

- [ ] 9. Checkpoint — Verify full interaction flows
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. `init()` — wiring everything together
  - [ ] 10.1 Implement `init()` and final DOM wiring
    - Implement `init()`: call `loadAll()`; populate the transaction form's category `<select>` from `state.categories`; call `initRouter()`; call `renderBalanceSummary`, `renderTransactionList`, `renderBudgetProgress`, `renderCharts` for the dashboard initial render; initialise `state.summaryMonth` to current month/year; call `bindTransactionForm`, `bindDeleteTransaction`, `bindSortControls`, `bindBudgetForm`, `bindCategoryManager`, `bindThemeToggle`, `bindMonthSelector`
    - Show/hide `#load-error` div: if `init()` throws, catch the error and set `document.getElementById('load-error').hidden = false`
    - Verify the Dashboard renders from cold start (empty localStorage) showing all zero-state cards and placeholder charts
    - _Requirements: 10.2, 11.6, 11.7, 2.5, 3.4_

- [ ] 11. Accessibility and polish
  - [ ] 11.1 Add ARIA attributes, keyboard navigation, and responsive final pass
    - Add `aria-label` attributes to all interactive controls (form fields, buttons, nav links, sort buttons, theme toggle, delete buttons, month navigation)
    - Add `aria-current="page"` to the active nav link (updated by the router)
    - Ensure `<dialog>` modal has a focus-trap: on open, move focus to first focusable element inside; on close, return focus to the trigger button
    - Verify tab order is logical throughout the page
    - Add `<label for="…">` associations for all form inputs
    - Add responsive media query breakpoints in `css/style.css` for narrow (≤ 480 px), medium (481–768 px), and wide layouts
    - Verify charts resize correctly via `ResizeObserver` on narrow screens
    - Verify no inline styles or `<style>` blocks exist in `index.html`
    - _Requirements: 11.2, 11.4, 6.1_

- [ ] 12. Final checkpoint — All requirements verified
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests require [fast-check](https://github.com/dubzzz/fast-check) — add via a `<script type="module">` in a separate test HTML file or run via Node.js; the main `app.js` and `index.html` must remain CDN-free
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness invariants; unit tests validate specific examples and edge cases
- The single-file constraint (one CSS, one JS) means all code lives in `css/style.css` and `js/app.js` respectively — no splitting

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.4", "3.5"] },
    { "id": 3, "tasks": ["3.6", "3.7", "3.8", "3.9", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "7.1"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 7, "tasks": ["10.1"] },
    { "id": 8, "tasks": ["11.1"] }
  ]
}
```
