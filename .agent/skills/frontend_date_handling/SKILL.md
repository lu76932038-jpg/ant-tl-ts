---
name: Frontend Date Handling Best Practices
description: Guidelines for handling local dates correctly in frontend applications, specifically avoiding UTC offsets issues when determining "Today" or formatting dates.
---

# Frontend Date Handling Best Practices

## Problem Context

When developing frontend applications (especially Dashboards, Reports, or Stock Management systems), a common bug is **Date Shift** caused by Timezone differences.

Example:

- User is in Beijing (UTC+8).
- Current Time: `2026-02-05 02:00:00` (Morning).
- Code uses: `new Date().toISOString().split('T')[0]`.
- Result: `2026-02-04` (because UTC time is -8h, i.e., `2026-02-04 18:00:00`).
- **Impact**: "Today" logic fails, charts highlight the wrong column, or default date ranges start from yesterday.

## Best Practice: Local Date Formatting

**Do NOT use** `toISOString()` for local date logic unless you specifically strictly need UTC.

### 1. Reusable Helper Function

Use a robust helper function that extracts Year, Month, Day based on the browser's local time.

```typescript
/**
 * Formats a Date object to 'YYYY-MM-DD' string based on LOCAL time.
 * Avoids the UTC offset issues common with toISOString().
 * 
 * @param date - The Date object to format
 * @returns string - 'YYYY-MM-DD'
 */
export const toLocalDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};
```

### 2. Implementation Usage

#### Bad ❌

```typescript
const today = new Date();
const todayStr = today.toISOString().split('T')[0]; // Risk: Returns yesterday if UTC Time < 00:00
```

#### Good ✅

```typescript
const today = new Date();
const todayStr = toLocalDateString(today); // Always returns local YYYY-MM-DD
```

### 3. "Today" Comparison Logic (Hybrid Logic)

When building charts that need to distinguish between Past, Present, and Future (e.g., for Inventory Forecasts):

```typescript
const dateStr = toLocalDateString(targetDate);
const todayStr = toLocalDateString(new Date());

if (dateStr < todayStr) {
    // PAST: Use Actual Real Data
    return actualValue;
} else if (dateStr > todayStr) {
    // FUTURE: Use Forecast Data
    return forecastValue;
} else {
    // TODAY: Use Hybrid Logic (Max of Actual vs Forecast)
    // Ensures real-time sales spikes are captured immediately
    return Math.max(actualValue, forecastValue);
}
```

## Checklist for Reviewing Date Logic

- [ ] Are we using `toISOString()`? If yes, is it intentional (backend requires UTC)?
- [ ] If the UI displays "Today", does it match the user's wall clock even at 1 AM?
- [ ] Are we comparing dates as strings? Ensure formats match (YYYY-MM-DD vs Y/M/D).
