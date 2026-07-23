# Requirements Document

## Introduction

The Expense and Budget Visualizer is a client-side web application built with HTML, CSS, and Vanilla JavaScript. It enables users to track their personal income and expenses, set budget limits per category, and visualize spending trends through charts and summaries — all without a backend server. All data is persisted locally via the browser's Local Storage API. The application supports optional enhancements including custom categories, a monthly summary view, transaction sorting, spending limit highlights, and a dark/light mode toggle.

## Glossary

- **App**: The Expense and Budget Visualizer web application.
- **Transaction**: A single record of income or expense entered by the user, consisting of a title, amount, type (income or expense), category, and date.
- **Category**: A label grouping related transactions (e.g., Food, Transport, Salary). Categories may be predefined or user-defined.
- **Budget**: A spending limit set by the user for a specific category within a time period.
- **Local_Storage**: The browser's Web Storage API used to persist all application data client-side.
- **Dashboard**: The primary view of the App displaying balance summary, charts, and recent transactions.
- **Monthly_Summary**: A view aggregating all transactions and budget usage within a selected calendar month.
- **Chart**: A visual representation (e.g., bar or pie chart) rendered in the browser using the Canvas or SVG API.
- **Dark_Mode**: A visual theme applying a dark background with light-colored text and UI elements.
- **Light_Mode**: The default visual theme applying a light background with dark-colored text and UI elements.

---

## Requirements

### Requirement 1: Transaction Management

**User Story:** As a user, I want to add, view, and delete income and expense transactions, so that I can maintain an accurate record of my finances.

#### Acceptance Criteria

1. THE App SHALL provide a form allowing the user to enter a transaction title (1–100 characters), amount (0.01–999,999,999.99), type (income or expense), category (selected from the defined category list), and date (not in the future).
2. WHEN the user submits a valid transaction form, THE App SHALL save the transaction to Local_Storage and display it in the transaction list immediately.
3. IF the user submits a transaction form with an empty title, a title exceeding 100 characters, a zero or negative amount, a non-numeric amount, a missing type, or a missing category, THEN THE App SHALL display an inline validation error message adjacent to each invalid field and prevent the transaction from being saved.
4. WHEN the user confirms deletion of a transaction, THE App SHALL remove it from Local_Storage and update the transaction list and Dashboard summary totals within the same user interaction.
5. THE App SHALL display all saved transactions in a list ordered by date descending, with ties broken by insertion order (most recently inserted first).
6. IF Local_Storage is unavailable or a write operation fails, THEN THE App SHALL display an error message to the user and preserve the existing in-memory data without data loss.

---

### Requirement 2: Balance Summary

**User Story:** As a user, I want to see my current total balance, total income, and total expenses at a glance, so that I can quickly understand my financial position.

#### Acceptance Criteria

1. THE Dashboard SHALL display the total balance calculated as the sum of all income transaction amounts minus the sum of all expense transaction amounts, rounded to 2 decimal places.
2. THE Dashboard SHALL display the total income as the sum of all income transaction amounts, rounded to 2 decimal places.
3. THE Dashboard SHALL display the total expenses as the sum of all expense transaction amounts, rounded to 2 decimal places.
4. WHEN a transaction is added or deleted, THE Dashboard SHALL recalculate and update the balance, total income, and total expenses within 1 second without requiring a page reload.
5. IF no transactions exist, THEN THE Dashboard SHALL display 0.00 for total balance, total income, and total expenses.

---

### Requirement 3: Expense Visualization (Charts)

**User Story:** As a user, I want to see visual charts of my spending, so that I can quickly identify where my money is going.

#### Acceptance Criteria

1. THE Dashboard SHALL display a pie or doughnut chart showing the proportion of total expenses per category, with each slice labeled with the category name and its percentage of total expenses rounded to one decimal place.
2. THE Dashboard SHALL display a bar chart showing income vs. expenses grouped by month for the current calendar month and the 5 preceding calendar months (6 months total).
3. WHEN the transaction list changes, THE App SHALL re-render all charts to reflect the updated data within 1 second.
4. IF there are no expense transactions for the selected period, THEN THE App SHALL display a placeholder message in the chart area instead of an empty chart.
5. IF all expenses belong to a single category, THEN THE App SHALL render the pie or doughnut chart with one slice occupying 100% and labeled with the category name and "100.0%".

---

### Requirement 4: Budget Management

**User Story:** As a user, I want to set spending limits per category, so that I can control how much I spend in each area.

#### Acceptance Criteria

1. THE App SHALL allow the user to set a budget amount (0.01–999,999,999.99) for each category.
2. WHEN the user saves a category budget, THE App SHALL persist the budget value to Local_Storage within 1 second.
3. THE Dashboard SHALL display each category's budget limit alongside the actual amount spent in that category.
4. WHILE the total expenses for a category equal or exceed the budget set for that category, THE App SHALL apply a CSS class that changes the category's budget indicator background to a red-family color distinct from the normal state.
5. IF no budget has been set for a category, THEN THE App SHALL omit that category from the budget progress display.
6. IF the user enters a budget amount that is non-numeric, zero, negative, or exceeds 999,999,999.99, THEN THE App SHALL display an inline validation error and prevent saving, preserving the previously stored budget value.
7. WHEN the user saves a valid budget, THE App SHALL update the Dashboard budget progress display within 1 second without requiring a page reload.

---

### Requirement 5: Custom Categories

**User Story:** As a user, I want to create my own expense categories, so that I can organize my transactions in a way that fits my lifestyle.

#### Acceptance Criteria

1. THE App SHALL provide predefined categories including at minimum: Food, Transport, Entertainment, Health, Shopping, and Salary.
2. THE App SHALL allow the user to add a new custom category by entering a unique category name between 1 and 50 characters.
3. WHEN the user saves a custom category, THE App SHALL add it to the category list in Local_Storage and make it immediately available in the transaction form's category selector.
4. IF the user attempts to add a category with a name that already exists (case-insensitive), THEN THE App SHALL display an error message identifying the duplicate name and prevent the duplicate from being saved.
5. IF the user attempts to save a category with an empty name or a name exceeding 50 characters, THEN THE App SHALL display an inline validation error and prevent saving.
6. WHEN the user deletes a custom category that has no associated transactions, THE App SHALL remove it from Local_Storage and from the category selector immediately.
7. IF the user attempts to delete a custom category that has one or more associated transactions, THEN THE App SHALL display an error message stating the category cannot be deleted while transactions are associated with it, and prevent the deletion.

---

### Requirement 6: Monthly Summary View

**User Story:** As a user, I want to view a summary of my income, expenses, and budget usage for a specific month, so that I can review my financial performance over time.

#### Acceptance Criteria

1. THE App SHALL provide a Monthly_Summary view accessible from the main navigation within 1 tap or click.
2. THE Monthly_Summary SHALL allow the user to select any month and year between January 2000 and the current calendar month (inclusive) to filter displayed data.
3. WHEN the user selects a month and year, THE Monthly_Summary SHALL display the total income, total expenses, and net balance (total income minus total expenses) for that period, each rounded to 2 decimal places.
4. THE Monthly_Summary SHALL display per-category spending totals and each category's budget usage expressed as a percentage of its defined budget limit for the selected month, rounded to the nearest whole number.
5. IF a category has transactions but no defined budget for the selected month, THEN THE Monthly_Summary SHALL display the spending total for that category without a budget usage percentage.
6. IF no transactions exist for the selected month, THEN THE Monthly_Summary SHALL display 0.00 for total income, total expenses, and net balance, and a message indicating no data is available for that period.
7. IF no budget definitions exist for the selected month, THEN THE Monthly_Summary SHALL omit the budget usage section from the display.

---

### Requirement 7: Transaction Sorting

**User Story:** As a user, I want to sort my transaction list, so that I can find and analyze transactions more easily.

#### Acceptance Criteria

1. THE App SHALL provide sort controls allowing the user to sort the transaction list by date (ascending or descending), amount (ascending or descending), or by category (alphabetical A–Z).
2. WHEN the user selects a sort option, THE App SHALL re-render the transaction list in the chosen order within 300 milliseconds.
3. THE App SHALL apply date-descending order as the default sort state on page load.
4. WHEN the transaction list is sorted by a non-default order, THE App SHALL visually distinguish the active sort control from inactive sort controls (e.g., by highlight color, bold weight, or underline).
5. IF the transaction list is empty, THE App SHALL display the sort controls in their default state without rendering any list items.

---

### Requirement 8: Spending Limit Highlights

**User Story:** As a user, I want to be visually alerted when I exceed a spending limit, so that I can take corrective action before my finances get out of control.

#### Acceptance Criteria

1. WHILE the expenses for a category meet or exceed the budget set for that category, THE App SHALL display a red-family visual warning indicator on the Dashboard for that category.
2. WHILE the expenses for a category are between 80% and 99% (inclusive) of its budget, THE App SHALL display a yellow-family visual warning indicator on the Dashboard for that category as a near-limit warning.
3. WHEN a transaction is added that causes a category's expenses to meet or exceed its budget, THE App SHALL update the visual warning indicator within 2 seconds without requiring a page reload.
4. THE App SHALL display the percentage of budget consumed for each category with a set budget, calculated as (total expenses / budget) × 100 rounded to the nearest whole number.
5. IF a category has no defined budget, THE App SHALL not display any warning indicator or budget percentage for that category.

---

### Requirement 9: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light display modes, so that I can use the app comfortably in different lighting environments.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control that is visible and accessible on all pages to switch between Dark_Mode and Light_Mode.
2. WHEN the user activates Dark_Mode, THE App SHALL apply a dark background color and light foreground colors to all UI elements within 200 milliseconds.
3. WHEN the user activates Light_Mode, THE App SHALL apply a light background color and dark foreground colors to all UI elements within 200 milliseconds.
4. WHEN the user toggles the display mode, THE App SHALL save the selected mode as the string "dark" or "light" under a single designated Local_Storage key.
5. WHEN the App loads, THE App SHALL read the saved display mode from Local_Storage and apply it before rendering visible content, preventing a flash of unstyled content.
6. IF no display mode is saved in Local_Storage, THEN THE App SHALL detect the OS color scheme preference via the prefers-color-scheme media query and apply the matching mode as the default.
7. IF Local_Storage is unavailable or the stored value is neither "dark" nor "light", THEN THE App SHALL fall back to the OS color scheme preference and continue operating without displaying an error.

---

### Requirement 10: Data Persistence

**User Story:** As a user, I want my data to be automatically saved in my browser, so that I don't lose my records when I close or refresh the page.

#### Acceptance Criteria

1. THE App SHALL persist all transactions, categories, budgets, and theme preferences to Local_Storage upon each change, each stored under a distinct, predefined key.
2. WHEN the App loads, THE App SHALL read and restore all transactions, categories, budgets, and theme preferences from Local_Storage before rendering any data-dependent UI.
3. IF Local_Storage data is missing or corrupted for any key, THEN THE App SHALL initialize that key with its defined safe default (empty array for transactions and categories, empty object for budgets, system default for theme) and continue loading without displaying an error to the user.
4. IF Local_Storage is unavailable or a write operation fails, THEN THE App SHALL operate in-memory for that session, display a non-blocking warning to the user indicating data will not be saved, and not crash or lose already-loaded data.

---

### Requirement 11: Technical Constraints

**User Story:** As a developer, I want the application to follow defined technical constraints, so that it remains maintainable, performant, and broadly compatible.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no third-party JavaScript frameworks, libraries, or CDN/package-manager-loaded external scripts.
2. THE App SHALL use exactly one CSS file located in the `css/` directory, with no inline styles or `<style>` blocks in HTML files.
3. THE App SHALL use exactly one JavaScript file located in the `js/` directory, with no inline `<script>` blocks in HTML files.
4. THE App SHALL function correctly in the current stable versions of Chrome, Firefox, Edge, and Safari — defined as passing all acceptance criteria from Requirements 1–10 — without requiring browser plugins.
5. WHEN the App loads for the first time on a device with uncached assets over a connection of at least 25 Mbps download and ≤50 ms RTT, THE App SHALL render the Dashboard in under 2 seconds.
6. WHEN the user performs any UI interaction (adding a transaction, toggling theme, switching view), THE App SHALL reflect the change in the DOM within 100 milliseconds, measured from the input event firing to the DOM update being visible.
7. IF any required resource (HTML, CSS, or JS file) fails to load, THEN THE App SHALL display a user-friendly error message indicating the app could not load, rather than a blank page or a JavaScript error.
