# Laal Global Advisory — UI/UX Design System & Redesign Specification

## 1. Design Direction

### Recommended design system: Restrained Skeuomorphic / Tactile Enterprise UI

Do **not** use full glassmorphism or neomorphism.

Recommended direction:

> **Modern enterprise UI with restrained skeuomorphic/tactile details**

The application is legal operations software. It should feel:

- Premium
- Serious
- Precise
- Information-dense
- Calm
- Professional
- Deliberately designed
- Easy to scan

It should **not** feel:

- Like an AI SaaS landing page
- Like a generic shadcn dashboard
- Futuristic
- Over-animated
- Glossy
- Decorative for the sake of decoration

### Why not glassmorphism?

Avoid it as the primary system.

Problems for this application:

- Reduces information clarity
- Often requires gradients and blur
- Creates visual noise
- Feels trendy rather than institutional
- Makes dense tables harder to read
- Quickly becomes "AI SaaS" visual language

Glass effects can be used very selectively for transient elements such as a command palette or floating popover, but not for the main application surfaces.

### Why not neomorphism?

Avoid it.

Neomorphism relies heavily on shadows and low-contrast surfaces. It is not ideal for:

- Tables
- Dense operational interfaces
- Accessibility
- Clear hierarchy
- Multiple states

It would also make the application look more like a concept UI than production software.

### Why restrained skeuomorphism?

Use very subtle tactile cues:

- Clear borders
- Slight surface elevation
- Pressed/hovered button states
- Small inset areas where appropriate
- Physical-feeling controls
- Strong distinction between interactive and informational elements

Do **not** imitate physical objects literally.

The goal is:

> "This feels like a serious piece of software."

Not:

> "This looks like a leather notebook."

---

# 2. Core Design Principles

## Principle 1 — Gold is the brand accent, not decoration

The current gold/navy palette is worth keeping.

Use gold for:

- Primary actions
- Active navigation
- Selected states
- Important highlights
- Focus states
- Small section accents

Do not use gold for:

- Every card border
- Every icon
- Decorative top borders
- Every heading
- Random chart elements

The less frequently gold appears, the more premium it feels.

---

## Principle 2 — Color must communicate meaning

Recommended semantic system:

| Color | Meaning |
|---|---|
| Gold | Brand / primary action / selected |
| Green | Positive / active / approved / present |
| Amber | Pending / warning |
| Red | Negative / overdue / rejected / critical |
| Blue | Informational / firm identity |
| Neutral | Default / inactive / structural |

Do not introduce colors simply to make cards visually interesting.

---

# 3. Recommended Design Tokens

Use these as the basis for the Tailwind/shadcn theme.

```text
Background:
#101114

Surface:
#17191D

Surface Hover:
#1C1F24

Elevated Surface:
#202329

Border:
#292C31

Border Strong:
#363A42

Primary Text:
#F3F1EA

Secondary Text:
#A5A29A

Muted Text:
#73716B

Gold / Primary:
#D4A94F

Gold Hover:
#E0B963

Success:
#5F9B79

Warning:
#C69A45

Danger:
#B85C5C

Info:
#6285B5
```

These values are a starting point, not mandatory literal values. Tune them against the actual application and accessibility requirements.

---

# 4. Radius System

The current application uses too many heavily rounded elements.

Reduce the radius.

Recommended:

```text
Small controls: 6px
Buttons:         8px
Inputs:          8px
Cards:           10px
Dialogs:         12px
Tables:          10–12px
Status pills:    full radius
```

Do not put rounded containers around every piece of information.

A legal operations application should have more structural edges and fewer floating "bubbles."

---

# 5. Shadows and Elevation

Remove large shadows and glow effects.

Use:

```text
Default surface:
border + flat background

Interactive surface:
border + slightly lighter background

Floating element:
subtle shadow

Dialog / Popover:
moderate shadow
```

Avoid:

- Gold glow
- Blue glow
- Large outer shadows
- Gradient shadows
- Neon borders

Elevation should communicate hierarchy, not decoration.

---

# 6. Global Application Shell

The application already has a persistent:

- Sidebar
- Page header
- Check In action
- Theme switcher
- Notification action

Keep this architecture.

## Header

The header should remain consistent across all pages.

Current concept:

```text
PAGE NAME                                  Check In  Theme  Notifications
```

Keep this.

Refine it by:

- Reducing unnecessary visual weight
- Keeping controls compact
- Making `Check In` the only prominent global action
- Keeping theme and notification controls icon-based
- Avoiding excessive rounded containers

The page-specific content should begin underneath the global header.

---

# 7. Sidebar

Keep the current sidebar structure.

### Keep

- Firm logo
- Firm name
- Navigation groups
- Active page state
- Current user information

### Change

Reduce the sidebar's visual contrast with the main content.

Use:

```text
Sidebar background ≈ application background
Border-right = subtle
```

### Active navigation

The current gold active navigation is one of the stronger parts of the design.

Keep it.

However:

- Reduce its height slightly
- Use a moderate radius
- Avoid glow
- Use dark text on gold only if contrast remains strong
- Keep inactive items neutral

Gold should clearly mean:

> "You are here."

---

# 8. Global Page Layout

All operational pages currently follow:

```text
Page title
↓
Statistic cards
↓
Filters
↓
Table
```

Keep this basic information architecture.

Change the visual treatment.

Recommended:

```text
Page Header
    ↓
Compact Summary Strip
    ↓
Filter / Action Bar
    ↓
Data Table
```

The summary cards should become more compact.

---

# 9. Statistic Cards — REMOVE

The current large four-card pattern is the biggest visual issue.

Current:

```text
┌───────────────┐
│ TOTAL         │
│               │
│ 4             │
│          icon │
└───────────────┘

┌───────────────┐
│ ACTIVE        │
│               │
│ 2             │
│          icon │
└───────────────┘
```

Remove this treatment.

Problems:

- Too much vertical space
- Too decorative
- Too many rounded surfaces
- Too much icon decoration
- Makes every page look like a generic SaaS template

---

# 10. Statistic Cards — REPLACE WITH SUMMARY STRIP

Use a single surface containing multiple metrics.

Example:

```text
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  12                 8                 3                 1     │
│  TOTAL              ACTIVE            PENDING           CLOSED│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Use subtle vertical separators.

Each metric should have:

- Small label
- Large number
- Optional tiny contextual indicator

No giant icon circle.

Example:

```text
ACTIVE
8
↑ 2 this month
```

Only show a trend when the trend is actually useful.

---

# 11. When Separate Cards Are Appropriate

Do not ban cards entirely.

Use separate cards when the information is genuinely independent.

Good examples:

- Upcoming hearings
- Pending approvals
- Financial overview
- Important operational alerts

Bad examples:

- Total
- Active
- Closed
- Pending

when all four are simply different views of the same dataset.

---

# 12. Icons

The current Lucide/shadcn icon approach is good.

Keep Lucide.

Change how icons are presented.

### Remove

```text
large icon
inside
large colored circle
inside
card
```

### Replace with

```text
small icon + heading
```

Example:

```text
◷ Upcoming Hearings
```

or:

```text
Users
Total Associates
4
```

Icons should communicate function.

They should not be decoration.

---

# 13. Filters

The filter area should be treated as a **control bar**, not a collection of giant pills.

Current style:

```text
[ Search ] [ All Statuses ] [ All Types ]
```

Keep the concept, change the treatment.

Recommended:

```text
┌─────────────────────────────────────────────────────────────┐
│ Search matters, clients, CNR...    Status   Type   More ▾  │
└─────────────────────────────────────────────────────────────┘
```

Use:

- shadcn `Input`
- shadcn `Select`
- shadcn `Popover`
- shadcn `Command`
- shadcn `DropdownMenu`

where appropriate.

---

# 14. Filter Button Rules

### Primary filter

Neutral surface with border.

### Active filter

Gold border or subtle gold background.

### More filters

Use a single `More filters` control instead of displaying every possible filter.

### Clear filters

Only show it when filters are actually active.

Example:

```text
Search...
Status: Active
Type: Criminal
More filters
Clear
```

Do not make every filter a gold button.

Gold should indicate selected/active state.

---

# 15. Page Actions

Every page should have one clear primary action.

Examples:

### Associates

```text
+ Add Associate
```

### Staff

```text
+ Add Staff
```

### Expenses

```text
+ Record Expense
```

### Leave Requests

```text
+ Request Leave
```

### Matters

```text
+ New Matter
```

### Attendance

Usually no primary creation action. Use:

```text
Export
```

or contextual attendance actions if needed.

Primary actions should use the gold button style.

Secondary actions should use outlined/neutral buttons.

---

# 16. Tables — Overall Design

The table is the most important component in the application.

It should feel like an **enterprise data table**, not a collection of cards.

### Remove

- Excessive rounded row containers
- Heavy shadows
- Excessive colored badges
- Huge row heights
- Decorative icons
- Strong borders around every cell

### Use

- One table surface
- Subtle header background
- Horizontal row separators
- Compact but comfortable row height
- Strong typography hierarchy
- Hover state
- Row actions
- Sticky header when useful
- Pagination

---

# 17. Table Header

Use a quiet header.

Example:

```text
MATTER              CLIENT             TYPE       STAGE       STATUS       FILED
```

Header typography:

- Small
- Medium weight
- Slightly muted
- Optional uppercase
- No excessive letter spacing

Sorting icons should appear only on sortable columns.

Do not display a sorting icon on every column if it is not actually sortable.

---

# 18. Table Rows

Use hierarchy inside the row.

Example:

```text
LGA-2026-CR-02
FIR No. 234/2026

Muhammad Kamran

Criminal

Registration of FIR / Complaint

● Active

05 Feb 2026
```

The reference number should be the strongest text.

Secondary case information should be smaller and muted.

---

# 19. Table Hover

Use a very subtle hover:

```text
#1C1F24
```

Do not use:

- gold glow
- animated background
- scale transforms
- dramatic shadow

The row can expose a contextual action:

```text
···
```

on hover.

Actions:

```text
Open
Edit
Documents
Timeline
Delete
```

Only show actions that actually exist.

---

# 20. Table Status

Reserve badges for semantic states.

Good:

```text
● Active
● Pending
● Closed
● Approved
● Rejected
```

Avoid badges for every piece of information.

For example, this:

```text
[ CRIMINAL ]
```

does not necessarily need a pill.

Use:

```text
Criminal
```

or:

```text
⚖ Criminal
```

with neutral styling.

---

# 21. Table Density

For an enterprise legal application, support a comfortable dense table.

Recommended:

```text
Row height: 64–76px
Header:     42–48px
```

Do not make every row 100+ pixels tall.

The application should allow lawyers to scan many records quickly.

---

# 22. Table Empty State

Do not allow an empty table to occupy most of the viewport.

Instead:

```text
No matters found

Try changing your filters or create a new matter.

[ + New Matter ]
```

For search results:

```text
No matching matters

Try a different search term or clear your filters.

[ Clear filters ]
```

The action should depend on the reason for the empty state.

---

# 23. Pagination

Keep pagination minimal.

Recommended:

```text
Showing 1–20 of 84

‹   1  2  3  ...  5   ›
```

Use shadcn pagination primitives.

Do not use oversized pagination buttons.

---

# 24. Associates & Staff Page

### Keep

- Summary statistics
- Search
- Status filters
- Department/role filters if applicable
- Data table

### Replace summary cards with

```text
TOTAL
ACTIVE
ON LEAVE
INACTIVE
```

as a compact strip.

### Table

Recommended columns:

```text
ASSOCIATE
ROLE
CONTACT
STATUS
JOINED
ATTENDANCE
ACTIONS
```

The person column should contain:

```text
Avatar
Name
Email
```

The role should be plain text.

Status can use a semantic badge.

Avoid putting every field into its own colored badge.

---

# 25. Expenses & Billing Page

This page should feel more like financial software.

### Remove

Four large KPI cards.

### Replace with

A financial summary strip:

```text
THIS MONTH       FIXED TOTAL       MANUAL TOTAL       ACTIVE TEMPLATES
Rs 0             Rs 0              Rs 0                1
```

### Main sections

```text
Financial Summary

Expenses Ledger

Recurring Templates
```

The ledger should be the primary content.

### Expense table

Recommended:

```text
DATE
DESCRIPTION
CATEGORY
TYPE
AMOUNT
RECORDED BY
STATUS
ACTIONS
```

Currency should be right-aligned.

Example:

```text
Rs 70,000
```

should visually align with other monetary values.

### Recurring templates

Keep this section.

Make it more compact.

Example:

```text
Salaries (HR)                         Rs 70,000 / month
salary for associate 1               Next run: 25 Aug

Active                                [toggle]  ···
```

Do not make each recurring template look like a large card unless the number of templates is very small.

---

# 26. Leave Requests Page

This page is workflow-oriented.

Primary information:

```text
EMPLOYEE
LEAVE TYPE
FROM
TO
DURATION
REASON
STATUS
REQUESTED
ACTIONS
```

Summary strip:

```text
TOTAL REQUESTS
PENDING
APPROVED
REJECTED
```

The most important visual distinction should be:

```text
Pending
Approved
Rejected
```

Use semantic colors only for these statuses.

### Pending requests

Make the action obvious:

```text
Approve
Reject
View
```

Do not hide important approval actions behind unnecessary menus.

---

# 27. Matters & Cases Page

This should be the most information-rich operational table.

Summary strip:

```text
TOTAL MATTERS
ACTIVE
DECIDED
CLOSED
```

Then:

```text
Search...
Status
Case Type
Stage
Filing Date
More filters
```

Primary action:

```text
+ New Matter
```

Secondary:

```text
Sync Ledger
```

### Table

Recommended:

```text
MATTER
CLIENT
CASE TYPE
CURRENT STAGE
STATUS
NEXT HEARING
FILING DATE
ACTIONS
```

Matter:

```text
LGA-2026-CR-02
FIR No. 234/2026
```

Client:

```text
Muhammad Kamran
```

Stage:

```text
Registration of FIR / Complaint
```

Status:

```text
● Active
```

This is more useful than making case type/status consume excessive visual space.

---

# 28. Attendance Page

Attendance is time-sensitive operational data.

Summary strip:

```text
PRESENT
ABSENT
ON LEAVE
REMOTE
```

Filters:

```text
Date
Employee
Status
Department
```

Table:

```text
EMPLOYEE
DATE
CHECK IN
CHECK OUT
WORK HOURS
STATUS
LOCATION
ACTIONS
```

Use strong alignment for time values.

Example:

```text
09:02 AM
06:11 PM
8h 09m
```

Avoid decorative cards.

The table should feel like a professional attendance ledger.

---

# 29. Dashboard — Different Treatment

The dashboard should not follow the standard CRUD page structure.

It should be an **operational overview**.

Recommended hierarchy:

```text
Firm Operational Dashboard
Short contextual subtitle

Operational Summary

Upcoming Hearings       Pending Approvals

Financial Overview
```

---

# 30. Dashboard — Associates

Instead of a giant card:

```text
TOTAL ASSOCIATES
4
[Present] [Absent] [Leave] [Remote]
```

Use:

```text
TOTAL ASSOCIATES
4
Firm-wide headcount

────────────────────────────────────────

PRESENT     ABSENT      ON LEAVE      REMOTE
0           4           0             0
```

This is denser and more professional.

---

# 31. Dashboard — Financial Overview

Use:

```text
EXPENSES & BILLING

Rs 0
Monthly operational expenses

Fixed salaries       Rs 0
Manual expenses      Rs 0
```

Avoid large decorative icons.

---

# 32. Dashboard — Upcoming Hearings

This is a strong component and should become more prominent.

Recommended row:

```text
15 AUG
SAT

Framing of Issues (Tanqeehat)
M/S Pakistan Trade House
Civil Court, Lahore · Civil Bench Class-I

IN 2 DAYS
2:00 PM
›
```

Make the date visually distinct but compact.

The hearing title should be the strongest text.

The court and matter should be secondary.

---

# 33. Dashboard — Pending Approvals

If empty:

```text
All caught up

No leave requests are waiting for your decision.
```

Do not create a huge empty area.

If there are approvals:

```text
Pending approvals                              3

Hammad Rohila
Annual Leave · 18–20 Aug

[Review]
```

The user should understand what needs attention immediately.

---

# 34. Dashboard — Monthly Financial Overhead

If there is data, this is where a chart belongs.

Do not create a chart just because dashboards usually have charts.

Use a chart only when enough data exists to make it useful.

Recommended:

```text
Monthly Financial Overhead

Fixed payroll
Manual operational expenses

[chart]
```

Keep the chart restrained.

No gradient fills.

No glowing lines.

No unnecessary animation.

If there is no data:

```text
No financial data yet

Record expenses to begin tracking monthly overhead.

[ Record Expense ]
```

---

# 35. Buttons

## Primary

Gold filled:

```text
+ New Matter
+ Add Associate
+ Record Expense
```

## Secondary

Outlined:

```text
Sync Ledger
Run Recurring
Export
```

## Tertiary

Text/icon button:

```text
View
More
Clear
```

## Destructive

Muted red.

Do not make destructive buttons bright red unless the action is highly consequential.

---

# 36. Dialogs and Forms

Because the application uses shadcn, standardize dialogs.

Use:

- `Dialog`
- `Sheet`
- `Form`
- `Input`
- `Select`
- `Textarea`
- `Calendar`
- `Popover`

### Forms should be compact.

Use a two-column layout where fields naturally belong together.

Example:

```text
Matter Reference        Case Type
Client                  Filing Date

Court                   Current Stage

Description
[................................]

                         Cancel   Create Matter
```

Do not create enormous modal windows for simple forms.

Use `Sheet` for complex record details when appropriate.

---

# 37. Detail Views

Every major table should eventually have a detail experience.

Recommended pattern:

```text
Matter
────────────────────────────

Matter information

Client

Court details

Current stage

Timeline

Documents

Activity
```

Use tabs where there are genuinely distinct sections:

```text
Overview | Timeline | Documents | Activity
```

Do not use tabs simply to split a small amount of information.

---

# 38. Loading States

Avoid large generic spinners.

Use skeletons that match the actual layout.

For tables:

```text
████████████
██████
████████████████
```

For summary strips, skeleton the number and label.

For empty states, don't show a spinner after the request has finished.

---

# 39. Animation

Use animation sparingly.

Recommended:

```text
150–200ms
ease-out
```

Use for:

- Dropdowns
- Dialogs
- Hover transitions
- Sidebar collapse
- Row action reveal

Avoid:

- Floating elements
- Continuous motion
- Pulsing cards
- Gradient animations
- Bouncing icons
- Page-wide entrance animations

The interface should feel fast, not theatrical.

---

# 40. Shadcn + Custom Components

The application already uses shadcn and custom components.

Do not replace shadcn.

Instead, create a design layer on top of it.

### Keep shadcn primitives

```text
Button
Input
Select
Dialog
Sheet
Popover
DropdownMenu
Tooltip
Tabs
Calendar
Badge
Avatar
Separator
Command
```

### Create custom application components

```text
<AppShell />
<AppHeader />
<AppSidebar />

<PageHeader />
<SummaryStrip />
<SummaryMetric />

<FilterBar />
<FilterControl />

<DataTable />
<TableEmptyState />
<TableRowActions />

<StatusBadge />
<SectionHeader />

<EmptyState />
<ConfirmDialog />
```

The custom components should control the visual language.

This is important.

Do not individually style every page.

---

# 41. Create a Reusable Page Template

All CRUD pages should share one layout.

Example:

```text
<OperationalPage>
    <PageHeader />

    <SummaryStrip />

    <FilterBar />

    <DataTable />
</OperationalPage>
```

Then:

```text
<AssociatesPage />
<ExpensesPage />
<LeaveRequestsPage />
<MattersPage />
<AttendancePage />
```

provide the data/configuration.

This ensures every page feels like part of the same product.

---

# 42. Recommended Component Architecture

A reasonable structure:

```text
components/
  layout/
    app-shell.tsx
    app-sidebar.tsx
    app-header.tsx

  page/
    page-header.tsx
    summary-strip.tsx
    summary-metric.tsx
    filter-bar.tsx

  table/
    data-table.tsx
    table-empty-state.tsx
    table-pagination.tsx
    table-row-actions.tsx

  status/
    status-badge.tsx
    matter-status.tsx
    leave-status.tsx
    attendance-status.tsx

  dialogs/
    confirm-dialog.tsx
    matter-dialog.tsx
    expense-dialog.tsx
    leave-dialog.tsx

  dashboard/
    upcoming-hearings.tsx
    pending-approvals.tsx
    financial-overview.tsx
```

Use shadcn primitives underneath these components.

---

# 43. Avoid "AI Slop" Specifically

The following should be treated as banned by default:

- Gradients everywhere
- Glass cards
- Neon borders
- Glowing icons
- Huge circular icon backgrounds
- Excessive rounded corners
- Floating blobs
- Gradient text
- Giant numbers with decorative illustrations
- "AI" sparkles
- Excessive badges
- Excessive pill buttons
- Animated backgrounds
- Generic dashboard illustrations
- Random charts with no operational value
- Excessive use of blue/purple
- Huge empty cards
- Every section being a separate floating card

A strong design should still look good when all animation is disabled.

---

# 44. What Should Make This Application Feel Special?

Not visual effects.

The differentiation should come from:

### Information hierarchy

Users immediately understand what matters.

### Operational context

Upcoming hearings, pending approvals, attendance, expenses and case states are surfaced intelligently.

### Excellent tables

Users can scan and act quickly.

### Excellent details

Hover, click, keyboard and contextual actions feel deliberate.

### Consistency

Every page feels like the same application.

### Restraint

The design does not constantly ask for attention.

---

# 45. Final Visual Formula

The target should approximately be:

```text
70% Neutral surfaces
15% Typography / whitespace
10% Gold brand accent
5% Semantic colors
```

Not literal pixel percentages, but a visual guideline.

The current application is closer to:

```text
Too many surfaces
+
Too many accent colors
+
Too many decorative icons
+
Too many rounded containers
```

The redesign should simplify rather than add.

---

# 46. Page-by-Page Summary

| Page | Remove | Replace With |
|---|---|---|
| Dashboard | Large KPI cards, decorative card borders | Compact operational summary + focused content sections |
| Associates & Staff | Large stat cards, excessive badges | Summary strip + dense people table |
| Expenses | Four large KPI cards | Financial summary strip + ledger + compact recurring templates |
| Leave Requests | Large cards | Leave summary strip + approval-focused table |
| Matters | Blue-heavy cards/buttons | Gold primary action + matter-focused table |
| Attendance | Decorative statistics | Attendance summary strip + time-focused ledger |

---

# 47. Implementation Priority

Do not redesign everything simultaneously.

### Phase 1 — Design system

- Update colors
- Update radius
- Remove heavy shadows
- Standardize typography
- Standardize buttons
- Standardize badges
- Standardize borders

### Phase 2 — Shared components

- App header
- Sidebar
- Summary strip
- Filter bar
- Table
- Empty states
- Pagination

### Phase 3 — CRUD pages

Apply the shared system to:

1. Matters
2. Associates & Staff
3. Attendance
4. Leave Requests
5. Expenses

### Phase 4 — Dashboard

Give the dashboard its own composition using the same design language.

### Phase 5 — Interaction polish

- Hover states
- Loading states
- Keyboard navigation
- Dialog transitions
- Row actions
- Responsive behavior

---

# 48. Final Recommendation

Do **not** switch to another trendy design system.

The strongest direction for this product is:

> **Restrained tactile enterprise UI with a dark legal-operations aesthetic and controlled gold branding.**

Keep the Claude color direction.

Keep shadcn.

Keep Lucide.

Keep the persistent application shell.

Keep the basic information architecture.

But remove the visual excess:

```text
Less card
Less color
Less radius
Less glow
Less decoration
Less empty space
```

and replace it with:

```text
Better hierarchy
Better tables
Better spacing
Better typography
Better states
Better actions
Better information density
Better consistency
```

The result should look like software that a real law firm could use every day—not a design showcase.

