# Design Guidelines: Financial Investment Platform with Admin Chat

## Design Approach: Reference-Based (Financial Services)

**Primary References:** Coinbase, Robinhood, Wise (TransferWise)
**Rationale:** Professional financial platforms that balance trust, clarity, and user-friendly transaction flows

## Core Design Principles

1. **Trust & Credibility:** Clean, professional aesthetic with clear hierarchy
2. **Transaction Clarity:** Every withdrawal step is explicit and traceable
3. **Real-time Communication:** Integrated chat feels native, not bolted-on
4. **Data Transparency:** Dashboard-first approach showing balances, history, status

## Typography

**Font Families:**
- Primary: Inter (UI, body text, data)
- Accent: SF Pro Display (headings, financial figures)

**Scale:**
- Headings: text-3xl to text-5xl, font-semibold
- Subheadings: text-xl, font-medium
- Body: text-base, font-normal
- Financial Data: text-2xl to text-4xl, font-bold, tabular-nums
- Labels: text-sm, font-medium, uppercase tracking-wide

## Layout System

**Spacing Units:** Tailwind 4, 6, 8, 12, 16, 24 (p-4, mb-6, gap-8, etc.)

**Grid Structure:**
- Dashboard: Sidebar (w-64) + Main content area
- Mobile: Single column stack, hamburger menu
- Cards: Consistent p-6 spacing, rounded-xl borders

## Component Library

### Navigation
- Fixed top bar with logo, main nav, user avatar/balance
- Sidebar navigation for dashboard sections (Overview, Transactions, Withdrawal, Chat)
- Mobile: Collapsible bottom nav + slide-out menu

### Dashboard Cards
- Balance card: Large prominent display with currency symbol
- Quick actions: Grid of 2x2 action buttons (Deposit, Withdraw, Transfer, History)
- Transaction history: Table with date, type, amount, status badges
- Account summary: Stats grid showing total invested, returns, pending

### Withdrawal Flow
**Multi-step process:**
1. **Notice Screen:** Alert banner explaining withdrawal process, estimated time
2. **Amount Input:** Large numeric input with balance display, conversion rates
3. **Verification:** Security questions, 2FA code input
4. **Admin Review:** Status card showing "Pending Admin Approval" with chat prompt
5. **Confirmation:** Success state with transaction ID, estimated completion

### Admin Chat Component
**Placement:** Persistent floating button (bottom-right), expandable panel

**Chat Interface:**
- Header: "Admin Support" with online status indicator
- Message list: Alternating sender/receiver bubbles with timestamps
- Input area: Text field + send button, file upload capability
- System messages: Centered, gray text for status updates ("Admin typing...", "Request submitted")
- Transaction context: Embedded card showing withdrawal details when chatting about specific request

**States:**
- Collapsed: Floating icon with notification badge
- Expanded: 400px width panel, max-h-[600px] scrollable
- Mobile: Full-screen overlay when active

### Forms & Inputs
- Large touch targets (min-h-12)
- Clear labels above inputs
- Helper text below for guidance
- Error states with inline validation
- Success states with checkmark icons

### Status Indicators
- Badge system: Pending (yellow), Approved (green), Rejected (red), Processing (blue)
- Progress bars for multi-step processes
- Loading states with skeleton screens

### Data Tables
- Striped rows for readability
- Sortable columns with arrow indicators
- Hover states showing additional details
- Action buttons in final column
- Responsive: Cards on mobile, table on desktop

## Page Structures

### Dashboard (Home)
- Hero stats: Large balance display with growth percentage
- 4-column quick stats grid
- Recent transactions table (last 10)
- Investment portfolio visualization
- Quick withdrawal button with badge if pending

### Withdrawal Page
- Prominent withdrawal notice at top
- Available balance card
- Withdrawal form (amount, method, account details)
- Fee breakdown display
- Submit button triggering admin chat prompt
- Withdrawal history list below

### Chat/Support Page
- Full-width chat interface (no sidebar distraction)
- Persistent conversation history
- File attachment preview
- Quick replies for common questions
- Transaction reference capability

## Images

**Hero Image:** NO large hero image. This is a dashboard-focused application.

**Supporting Images:**
- Security badges/trust seals in footer
- Avatar placeholders for admin chat
- Icon illustrations for empty states (no transactions, no messages)

## Animations

**Minimal & Purposeful:**
- Smooth height transitions for expandable chat (transition-all duration-300)
- Fade-in for notification toasts
- Pulse animation for pending status badges
- Gentle scale on button hover (hover:scale-105)

## Critical Features

1. **Live Chat Integration:** Real-time messaging with admin, typing indicators
2. **Withdrawal Notice System:** Clear prominent alerts before withdrawal initiation
3. **Transaction Tracking:** Every withdrawal has unique ID, visible status
4. **Security Elements:** Verification steps clearly marked, lockdown indicators
5. **Responsive Dashboard:** Full functionality on mobile with adapted layouts

## Accessibility

- ARIA labels for all interactive elements
- Keyboard navigation for chat and forms
- Screen reader announcements for status changes
- High contrast for financial figures (WCAG AAA)
- Focus indicators on all inputs