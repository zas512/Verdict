---
name: LGA — Laal Global Advisory
description: Internal firm-management terminal (matters, tasks, attendance, leave, expenses)
colors:
  primary: "#2563EB"
  canvas: "#F0F4F9"
  card: "#FFFFFF"
  foreground: "#0F172A"
  muted-foreground: "#475569"
  border: "#DBE3EF"
  sidebar: "#E5ECF6"
  secondary: "#E2EDF8"
  accent: "#DBEAFE"
  success: "#047857"
  warning: "#B45309"
  destructive: "#DC2626"
  canvas-dark: "#0B1320"
  card-dark: "#111C2E"
  foreground-dark: "#F8FAFC"
  sidebar-dark: "#0D1525"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  label:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.04em"
    textTransform: "uppercase"
  micro:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.04em"
    textTransform: "uppercase"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
rounded:
  sm: "0.6em"
  md: "0.8em"
  lg: "0.875rem"
  xl: "1.4em"
  "2xl": "1.8em"
  "4xl": "2.6em"
spacing:
  card-pad: "1.25rem"
  section-gap: "1.5rem"
  page-pad-sm: "1rem"
  page-pad-md: "1.5rem"
  page-pad-lg: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "1rem"
    padding: "0.75rem 1rem"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "1rem"
    padding: "0.75rem 1rem"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "1.5rem"
    padding: "1.25rem"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "0.875rem"
    padding: "0.5rem 0.75rem"
  sidebar-item-active:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "0.875rem"
  sidebar-item-idle:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    rounded: "0.875rem"
---

# Design System: LGA Terminal

## Overview

**Creative North Star: "The Counsel's Desk"**

LGA is the internal operations terminal for a Pakistani law firm — the professional desktop where partners, associates, and staff run the business of the firm: matters, hearings, attendance, leave, and expenses. It must feel like a trustworthy, calm command center: trustworthy enough to hold the firm's daily operation, calm enough to work in for eight hours. The visual voice is corporate-operations with a light touch — generous white cards on a soft blue-grey canvas, a single confident royal-blue accent, and type that reads instantly at a glance. Nothing decorative, nothing playful; every pixel either carries information or makes information easier to scan.

The system is shadcn/New-York on Tailwind v4 (CSS-first tokens). Surface treatment is a **soft skeuomorphism**: cards are elevated, gently shadowed panels floating on the canvas, with 1px `ring-foreground/5` hairlines and rounded corners capped at 24px. Depth comes from layering (canvas → card → ring → shadow), not from heavy shadows. The accent is used sparingly and purposefully: primary actions, the active nav state, and one highlight color per data point.

**Key Characteristics:**

- Soft-light "studio" canvas (`#F0F4F9`) under pure-white cards; deep obsidian-slate inverse in dark mode.
- Single royal-blue accent (`#2563EB`) that stays identical across light and dark.
- Generous rounded geometry (14px base radius, 24px cap) — never pill-heavy, never harsh.
- Editorial-ish type split: Inter for headings/titles, DM Sans for body, Geist Mono for timecodes and IDs.
- Soft skeuomorphic cards: 1px hairline ring + quiet diffuse shadow, lifting slightly on hover.

## Colors

The palette is a cool, slate-and-royal-blue corporate system. Light mode is a pale-blue canvas with pure-white surfaces; dark mode is high-contrast obsidian slate with the same royal-blue accent held constant. Blue carries all "live/action/active" meaning; green/amber/red are reserved strictly for status (success, warning, destructive).

### Primary

- **Royal Blue** (#2563EB): The one and only accent. Primary buttons, active sidebar pill, focus rings, info status, chart-series leader, links. Identical value in light and dark — it is the constant of the system. Never duplicated into a second accent.

### Neutral

- **Very Light Blue Canvas** (#F0F4F9): App background. Cooler and slightly deeper than white so white cards read as raised panels.
- **Pure White Card** (#FFFFFF): Card / popover / input surface in light mode.
- **Slate Ink** (#0F172A): Primary text and headings in light mode.
- **Soft Blue-Grey Muted** (#475569): Secondary text, captions, muted labels.
- **Hairline Border** (#DBE3EF): Borders, dividers, input strokes.
- **Ice-Blue Sidebar** (#E5ECF6): Sidebar surface — one step deeper than the canvas so the content column reads as the active plane.
- **Obsidian Slate** (#0B1320): Dark-mode canvas; **Elevated Slate** (#111C2E) its cards; **Midnight Slate** (#0D1525) its sidebar.
- **Secondary Tint** (#E2EDF8) and **Accent Tint** (#DBEAFE): soft blue fills for hover states, secondary buttons, and selected backgrounds.

### Status (semantic, not decorative)

- **Success Green** (#047857), **Warning Amber** (#B45309), **Destructive Red** (#DC2626): status badges, check-in/check-out, error states only. The light-mode values are one step darker than the classic emerald/amber so white text on a solid fill clears 4.5:1 (AA). Dark-mode variants brighten (#34D399 / #FBBF24 / #EF4444) against dark foreground text.

### Named Rules

**The One-Accent Rule.** Royal Blue is the only hue that carries "action/active." Everything else is neutral or semantic. A screen with blue on blue fills and colorful cards has lost the accent.

**The Go/Stop Exception.** Check-in and check-out are the one sanctioned use of semantic color as an _action_ fill: green = start the shift (go), red = end it (stop). They read as universal transport affordances, not decoration. Any new green/red action button must be cleared against this exception.

**The Status-Only Rule.** Green, amber, and red mean approved/pending/rejected, in/out, success/error — never decoration. If a color isn't telling the user something, it shouldn't be on screen.

## Typography

**Display/Headings Font:** Inter (with ui-sans-serif, system-ui fallback)
**Body Font:** DM Sans (with ui-sans-serif, system-ui fallback)
**Label/Mono Font:** Geist Mono (with ui-monospace fallback)

**Character:** An editorial-for-operations pairing — Inter carries the titles with tight tracking and strong weights, while DM Sans handles body text with a slightly wider, airier cut that keeps long tables and lists comfortable. Mono appears only where a value wants to feel machine-precise: timecodes, case IDs, check-in clocks.

### Hierarchy

- **Display** (Inter, black 900, `text-2xl`, tracking `-0.025em`): Page titles in the header. One per screen, loud and short.
- **Title** (Inter, medium 500, `text-base`, `font-heading`): Card titles and section headers.
- **Body** (DM Sans, regular 400, `text-sm`, `text-muted-foreground` for secondary): Card body, descriptions, table cells.
- **Label** (DM Sans, semibold 600, `text-xs`, uppercase tracking `0.04em`): Field labels, column headers, breadcrumb prefix.
- **Micro** (DM Sans, semibold 600, 11px, uppercase tracking `0.04em`): stat-tile captions, group counts, section overlines. The one permitted sub-12px step — uppercase + tracking keeps it legible. Never body copy.
- **Mono** (Geist Mono, `text-xs`): Check-in/out times, IDs, timecodes.

### Named Rules

**The Heading Voice Rule.** `h1`–`h6` always use `--font-heading` (Inter); body always uses `--font-sans` (DM Sans). The split is load-bearing — never run headings in DM Sans or body in Inter.

## Layout

The dashboard shell is a two-pane application frame: a **fixed sidebar** (navigation, brand, profile) on the left and a **full-width content column** on the right that owns all remaining width — no max-width container; the content plane always fills the viewport. The frame is `h-screen overflow-hidden`; only the content column scrolls vertically.

- **Page padding:** `p-4` on mobile → `sm:p-6` → `lg:p-8`.
- **Vertical rhythm:** content stacks in `space-y-6` sections (24px); cards space their internals with `--card-spacing` (20px, 16px for `size="sm"`).
- **Breakpoints:** Tailwind defaults — `sm` 640, `md` 768, `lg` 1024 (sidebar toggles to icon-only / off-canvas), `xl` 1280, `2xl` 1536.
- **Responsive behavior:** below `lg` the sidebar becomes an off-canvas overlay drawer revealed by a hamburger in the header (fixed, does not shift content). Cards and grids collapse to a single column on mobile; the header wraps.
- **Density:** comfortable-to-compact. Tables are dense (`text-sm`, tight rows) because they hold firm operations; cards are roomy.

## Elevation & Depth

A **soft-skeuomorphic** system: depth is communicated by layering raised white panels over the tinted canvas, each panel wearing a 1px `ring-foreground/5` hairline plus a diffuse drop shadow. Shadows are ambient, not structural — nothing floats hard or casts deep casts.

### Shadow Vocabulary

- **Rest** (`0 4px 12px -2px rgba(15,23,42,0.04), 0 1px 3px 0 rgba(15,23,42,0.02)`): default card surface.
- **Hover** (`0 10px 25px -4px rgba(15,23,42,0.08), 0 4px 6px -1px rgba(15,23,42,0.03)`): a card lifts on interaction; the hairline warms to the ring color.
- **Accent** (primary-tinted): only the active sidebar pill and primary buttons, which read as the one raised, live element of a screen.

### Named Rules

**The Raise-on-Touch Rule.** Cards rest flat and lift on hover; buttons press down 1px on active. Depth is a response to the cursor, never a permanent state.

## Shapes

Rounded, friendly, never pill-shaped at scale. Base radius is 14px (`--radius: 0.875rem`); every radius step derives from it (`sm` 0.6×, `md` 0.8×, `lg` 1×, `xl` 1.4×, `2xl` 1.8×, up to `4xl` capped at **24px**). Cards use the 24px cap; buttons `rounded-2xl` (16px); inputs and nav items `rounded-xl` (14px); small chips and check-in pills `rounded-lg` (12px). The sidebar's active pill and check-in/out buttons round fully when icon-only.

## Components

### Buttons

- **Shape:** `rounded-2xl` (16px), `text-sm font-medium`, tight padding, `gap-1.5` with icons.
- **Primary:** Royal Blue fill, white text, `hover:bg-primary/80`. Reserved for the single main action on a surface.
- **Outline:** white/`bg-background` fill, hairline border, `hover:bg-muted`. Secondary actions.
- **Secondary / Ghost:** soft blue tint (`bg-secondary`) for low-emphasis, and borderless ghost for table-row actions.
- **Destructive:** not a red block — a tinted red (`bg-destructive/10` text-destructive) that escalates on hover, used for leave rejections and removal.
- **Go/Stop (header check-in/out):** the one place a solid semantic fill carries an action — green Check In, red Check Out (see The Go/Stop Exception). Check-out is two-step: the first tap arms it, and the armed button strengthens with a `ring-destructive/40` before the second tap commits.
- **Sizes:** `h-7` (xs) → `h-8` (sm/default) → `h-10` (lg); icon buttons `size-8/9/10`. Focus = 3px `ring-ring/30`; active presses down 1px.

### Cards / Containers

- **Corner Style:** 24px rounded cap (`min(var(--radius-4xl), 24px)`).
- **Background:** Pure white (light) / Elevated Slate (dark); the app canvas never appears inside a card.
- **Shadow Strategy:** 1px `ring-foreground/5` hairline + ambient rest shadow; lifts on hover (see Elevation).
- **Internal Padding:** `--card-spacing` = 20px (default), 16px (`size="sm"`), with matching `px-(--card-spacing)` content.
- **Titles:** Inter `text-base font-medium`; descriptions `text-sm text-muted-foreground`; optional action slot top-right.
- **Signature accent bar:** executive metric cards may wear a 1px royal-blue gradient hairline across their top edge (`from-primary via-primary/80 to-chart-2`). It is the one sanctioned decorative gradient; it stays inside the blue family so it never reads as a second accent hue.

### Inputs / Fields

- **Style:** pure-white fill, hairline `--border` stroke, `rounded-xl` (14px), `text-xs`–`text-sm` with `placeholder:text-muted-foreground`.
- **Focus:** `ring-primary/40` + `focus-visible:ring`; search fields carry a leading icon inside the field.
- **Error:** destructive hairline + soft red ring (`ring-destructive/20`).

### Navigation (Sidebar)

- **Style:** Ice-blue (light) / Midnight Slate (dark) surface, hairline right border. Collapses to an icon rail on desktop (`lg`, 4.5rem) with a floating chevron toggle; becomes an off-canvas overlay drawer below `lg`.
- **Items:** `text-xs font-semibold`, `rounded-xl`, idle = muted-foreground; hover = soft `sidebar-accent` pill with a spring `motion.div`; active = Royal Blue pill (`sidebar-primary`) with white text — the single raised element in the rail.
- **Brand:** LGA wordmark (light/dark variants) at top; profile block pinned at bottom with initials avatar and role caption.

### Status Badges / Pills

- **Shape:** `rounded-lg`/`rounded-full`, `text-xs font-semibold`/`font-mono`, tinted fills (`bg-warning/10 text-warning`, `bg-success/10 text-success`, `bg-destructive/10 text-destructive`).
- **Live clock pill:** the header's check-in status renders as an amber-mono pill (`bg-warning/10 border-warning/20 text-warning`) with a pulsing dot — the one persistent status read on every screen.

## Do's and Don'ts

### Do:

- **Do** keep one accent (Royal Blue) per screen, used for the active nav pill and primary actions.
- **Do** use Inter for every heading and DM Sans for every body line — the split is the brand.
- **Do** rest cards on the tinted canvas with a 1px hairline + quiet shadow; raise them on hover only.
- **Do** reserve green/amber/red for status meaning (approved/pending/rejected, in/out).
- **Do** use green go / red stop fills for check-in and check-out — the one sanctioned semantic action pair.
- **Do** fill the full content column width — no fixed max-width container inside the app frame.
- **Do** collapse the sidebar to an icon rail on desktop and an overlay drawer on mobile.

### Don't:

- **Don't** add a second accent hue, gradient fills outside the primary button and the card's blue accent hairline, or colorful card fills — the blue loses its authority.
- **Don't** set headings in DM Sans or body in Inter.
- **Don't** use sharp corners (0 radius) or pill everything; stay inside the 14→24px radius ladder.
- **Don't** layer heavy drop shadows or floating elements — depth is a 1px ring + ambient shadow.
- **Don't** push content around when the mobile sidebar opens — it must appear as a fixed overlay.
- **Don't** add horizontal scroll to the content column; wrap or stack instead.
