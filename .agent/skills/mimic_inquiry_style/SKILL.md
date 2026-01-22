---
name: mimic_inquiry_style
description: Apply the premium "Inquiry List" glassmorphism UI design to lists and forms.
---

# Mimic Inquiry Style Skill

This skill allows you to replicate the **Premium Inquiry List Design** (InquiryList.tsx) for any new table, list, or form page. This design is characterized by its hierarchical scrolling containers, glassmorphism effects, and distinct "Action Bar" styling.

## 1. Core Layout Structure (CRITICAL)

You **MUST** use this specific nesting structure to handle large datasets correctly:

```tsx
// Outer Container: Full height, fixed, no scroll
<div className="flex-1 flex flex-col p-6 max-w-[1600px] mx-auto overflow-hidden w-full min-h-0">
  
  {/* 1. Header Area (Static) */}
  <div className="flex-none space-y-4 pb-6 px-2">
     {/* Title & "Glass" Action Bar goes here */}
  </div>

  {/* 2. Content Card (Flex-1) */}
  <div className="flex-1 min-h-0 bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white flex flex-col overflow-hidden transition-all duration-500">
      
      {/* 3. Scrollable Table Area */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
          <table className="w-full text-sm text-left border-separate border-spacing-0">
              {/* Header MUST be sticky */}
              <thead className="sticky top-0 z-30">
                  <tr className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/95 backdrop-blur-sm shadow-sm ring-1 ring-slate-100">
                      {/* ... th ... */}
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                  {/* ... tr ... */}
              </tbody>
          </table>
      </div>

      {/* 4. Footer/Pagination Area (Static at bottom) */}
      <div className="flex-none px-8 py-5 bg-white border-t border-slate-100 flex ...">
          {/* Pagination controls */}
      </div>

  </div>
</div>
```

**Key Rules:**

* **Outer**: `overflow-hidden`, `min-h-0` (Prevents flex child overflow issues).
* **Card**: `rounded-[2.5rem]` (Extremely large rounded corners), `backdrop-blur-xl`.
* **Table Container**: `flex-1`, `overflow-auto`.
* **Table Header**: `sticky top-0`, `z-30`, `bg-slate-50/95`.

## 2. The "Glass" Action Bar (Toolbar)

Do not place search inputs or buttons directly on the background. They MUST be wrapped in a specific container:

```tsx
<div className="bg-[#f0f0f0]/50 backdrop-blur-md p-6 rounded-[1.5rem] border border-white shadow-sm">
   <div className="flex items-center gap-4">
      {/* Action Buttons, Search, Filters here */}
   </div>
</div>
```

* **Background**: `#f0f0f0` with `50%` opacity.
* **Rounding**: `rounded-[1.5rem]`.

## 3. Component Styles

### A. Action Buttons

* **Size**: Fixed `w-12 h-12`.
* **Style**: `rounded-xl`, `shadow-sm`.
* **Primary**: `bg-black text-white`.
* **Secondary**: `bg-white text-slate-400 border border-slate-100`.
* **Interactive**: `hover:scale-105` or `active:scale-95`.

### B. Status Filters

MUST be a row of buttons (Tabs), not a dropdown.

* **Container**: `div className="flex items-center gap-2"`
* **Active State**: `bg-black text-white shadow-lg`.
* **Inactive State**: `bg-white text-slate-400 hover:bg-slate-50 border border-slate-50`.
* **Badges**: Include a small pill badge for counts: `rounded-lg text-[10px] min-w-[20px]`.

### C. Search Input

* **Style**: `bg-white border border-slate-100 rounded-xl shadow-sm`.
* **Focus**: `focus:ring-4 focus:ring-blue-100/50`.
* **Size**: Generous padding, e.g., `py-3`.

## 4. Typography & Color System

* **Primary Text**: `text-slate-800`, `font-black` (Use heaviest weight for emphasis).
* **Secondary Text**: `text-slate-400`, `font-bold`.
* **Status Colors**:
  * **Completed/Success**: Emerald (`text-emerald-500`, `bg-emerald-50`).
  * **Pending/Processing**: Blue (`text-blue-500`, `bg-blue-50`).
  * **Warning/Attention**: Amber (`text-amber-500`, `bg-amber-50`).
  * **Failed/Danger**: Red (`text-red-500`, `bg-red-50`).
  * **Neutral/Terminated**: Slate (`text-slate-500`, `bg-slate-100`).

## 5. Table Interaction

* **Row Hover**: `hover:bg-slate-100/30`.
* **Selection**: If selectable, active row gets `bg-blue-50/50`.
* **Clickable**: Rows should be clickable if they lead to detail pages.

## Usage Checklist

1. Are you using the **Double Container** (Fixed Outer > Scrollable Inner)?
2. Is the Table Header **Sticky**?
3. Is the Toolbar wrapped in a **Gray Glass Container**?
4. Are buttons **12x12** (w-12 h-12)?
5. Are fonts set to **Black/Bold** weight?
