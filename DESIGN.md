# Hearthly — Design System

> Specification for Hearthly's visual design. Describes what the design **is** — colors, typography, spacing, components, elevation, motion, voice — independent of implementation. Any framework that realizes this spec is valid.

## 1. Visual Theme & Atmosphere

Hearthly is a warm domestic space rendered as software — a family management app that feels like coming home to a well-lit kitchen where everything is in its place. Built on a warm off-white canvas (`#f8f7f5`) with a terracotta accent (`#c7724e`) — "hearth" is the warm center of a home. Where productivity apps lean into cool efficiency and fintech apps project confidence, Hearthly radiates familial calm — unhurried, grounded, and free of urgency.

Typography uses the platform's native system font stack. No custom web fonts, no loading overhead. The app should feel like a natural extension of the phone, not a foreign website.

Every neutral in the system carries a warm undertone — there are no cold blue-grays anywhere, light mode or dark. The result is one consistent brand voice on every device, not platform-adaptive.

### Signature Moves

Eight constitutional rules. Numbered for cross-reference (e.g., "see Move #3").

1. **Whisper Card** — cards are the only non-overlay surface with elevation: `1px` Warm Divider border + `rgba(0,0,0,0.03) 0px 2px 8px` shadow. Transient overlays use Modal level (§6).
2. **Hearth Ring** — `2px` Warm Divider ring on photo avatars (`box-sizing: border-box`). Blends user photos into the warm palette.
3. **Chromatic Rule** — warm-only neutrals everywhere, both modes. No cool blue-grays, ever. Constitutional.
4. **Terracotta Accent** — Hearth Terracotta is the single chromatic color in UI chrome. Rare by design.
5. **Tinted Badge** — badges, pills, and selection states use translucent `10-12%` tints — never solid fills. Powers active tab pills, selected sidenav rows, active segmented controls, and the tab-root empty-state hero.
6. **Title Case Always** — buttons, labels, nav items in Title Case. Never UPPERCASE.
7. **System Fonts Forever** — native stack only (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ...`). Zero web fonts.
8. **Single Breakpoint** — one switch at `993px` (mobile ↔ desktop). Content-width constraints (e.g., `360px` auth max) are a separate concern.

## 2. Color Palette & Roles

Colors implemented as CSS custom properties. Reference by semantic name; never hardcode hex in component styles.

### Primary

| Token                   | Light     | Dark      | Usage                                                                                |
| ----------------------- | --------- | --------- | ------------------------------------------------------------------------------------ |
| **Hearth Terracotta**   | `#c7724e` | `#d4885e` | Brand, primary buttons, active states, links — the only chromatic color in UI chrome |
| **Terracotta Shade**    | `#a3572e` | `#c7724e` | Pressed / hover on terracotta                                                        |
| **Terracotta Tint**     | `#d4885e` | `#e8a67a` | Light emphasis, background tints                                                     |
| **Terracotta Contrast** | `#ffffff` | `#ffffff` | Text on terracotta backgrounds                                                       |

### Surfaces

| Token             | Light     | Dark      | Usage                               |
| ----------------- | --------- | --------- | ----------------------------------- |
| **Warm Stone**    | `#f8f7f5` | `#0f0e0d` | Page canvas                         |
| **Clean Surface** | `#ffffff` | `#1c1a18` | Cards, headers, tab bar, list items |

### Text

| Token           | Light     | Dark      | Usage                                                           |
| --------------- | --------- | --------- | --------------------------------------------------------------- |
| **Warm Dark**   | `#1c1917` | `#f5f0eb` | Primary text                                                    |
| **Stone Muted** | `#78716c` | `#a39e98` | Secondary / UI only (labels, metadata, placeholders) — not body |
| **Deep Stone**  | `#65605b` | —         | Body-weight secondary (when AA on body text is required)        |

### Borders & Status

| Token            | Light     | Dark      | Usage                                                                           |
| ---------------- | --------- | --------- | ------------------------------------------------------------------------------- |
| **Warm Divider** | `#e5e2dc` | `#2a2725` | Card borders, list separators, rings                                            |
| **Warm Success** | `#2e7d32` | `#66bb6a` | Task completion, confirmations                                                  |
| **Warm Danger**  | `#b53333` | `#e57373` | Errors, destructive actions                                                     |
| **Warm Warning** | `#e65100` | `#ffb74d` | Attention, budget alerts — close to Terracotta, always paired with warning icon |

No `info` color. Informational content uses neutral tints (Stone Muted on Clean Surface) — a cool-blue info token would violate the Chromatic Rule (Move #3).

## 3. Typography

Font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`. No custom web fonts (Move #7).

| Role            | Size | Weight  | Line Height | Letter Spacing | Usage                                               |
| --------------- | ---- | ------- | ----------- | -------------- | --------------------------------------------------- |
| Display         | 40px | 700     | 1.10        | -0.75px        | Welcome hero, LargeTitle, major empty states        |
| Page Title      | 32px | 700     | 1.20        | -0.5px         | Major section / empty-state headlines               |
| Section Heading | 20px | 600     | 1.30        | normal         | Card headers, AppHeader title                       |
| Body            | 16px | 400     | 1.50        | normal         | Default content                                     |
| Body Emphasis   | 16px | 500     | 1.50        | normal         | Taglines, emphasized body                           |
| Button          | 16px | 600     | 1.00        | normal         | Button labels, active tab labels (Title Case)       |
| Link            | 16px | 500     | 1.50        | normal         | Inline Hearth Terracotta links (underline on hover) |
| Secondary       | 14px | 500     | 1.43        | normal         | Form labels, metadata                               |
| Caption         | 14px | 400     | 1.43        | normal         | Muted labels (Stone Muted)                          |
| Small           | 12px | 400-500 | 1.33        | normal         | Badges, tab bar labels, fine print                  |
| Avatar Large    | 20px | 600     | 1.00        | 0.5px          | Account avatar (64px circle)                        |
| Avatar Small    | 12px | 600     | 1.00        | 0.5px          | Header avatar (32px circle)                         |

**Tabular Numeric** — `font-variant-numeric: tabular-nums` applied at any size for budget amounts, counters, and tabular data where digits must align.

**Principles**: weight carries hierarchy (700 → 600 → 500 → 400), sizes stay compact. Negative tracking only on Display (40px) and Page Title (32px). Body line-height `1.50` is generous — browsing-at-home, not dashboard-scanning. All interactive labels in Title Case (Move #6).

## 4. Components

Organized into 7 subsections. Each component spec covers visual style, states, and the ARIA essentials for screen readers (VoiceOver, TalkBack).

### §4.1 Primitives

#### Iconography

- **Style**: stroke-based, `2px` uniform stroke. Never filled or dual-tone.
- **Sizes**: `16px` (inline in small text), `20px` (default UI), `24px` (tab bar, page headers, primary interactive), `32px` (empty-state inline), `48px` (tab-root empty-state hero only).
- **Color**: `currentColor`. Stone Muted default (passive); Hearth Terracotta active.
- **Placement**: leading in list rows, trailing chevrons for navigation rows, top-above-label in tab bar.
- **In buttons**: allowed for icon-only ghost, destructive (e.g., trash + "Delete"), and brand/social (Google Sign-In). Label-only otherwise.
- **No colored icon containers** (iOS Settings pattern). Single exception: tab-root empty-state hero (§4.5).
- Library-agnostic; Lucide-compatible.

#### Buttons

All buttons: `12px` radius, Button typography (16px/600), Title Case. Focus ring `2px` Hearth Terracotta outline with `2px` offset (`:focus-visible` only).

**Primary** — Hearth Terracotta bg, white text, `10px 20px` padding (48px min height). Hover: Terracotta Shade. Active (mobile): `scale(0.98)`.

**Secondary (Outline)** — transparent bg, Warm Dark text, `1px` Warm Divider border. Hover: Warm Divider at ~40% opacity.

**Ghost** — transparent, Stone Muted text (shifts to Warm Dark on hover). For tertiary and icon-only actions.

**Destructive** — Warm Danger bg, white text. Triggers warning-confirm haptic (§7) in alertdialogs.

**Vendor Auth Exception** (Google Sign-In, future Apple Sign-In) — follows vendor branding guidelines verbatim. Hearthly controls only the `:focus-visible` ring (`2px` Hearth Terracotta) and surrounding layout. This is the one place the design yields to external brand rules.

Google Sign-In:

- Light: `#ffffff` bg, `#3c4043` text (14px/500), `1px solid #dadce0` border
- Dark: `#131314` bg, `#e3e3e3` text, `1px solid #8e918f` border
- `14px 16px` padding, `12px` radius, `18×18px` Google "G" icon

#### Badges / Pills

Tinted Badge signature (Move #5). Same mechanic powers tab-pills, sidenav-selected, segmented-active, and tab-root empty-state.

- **Terracotta Badge** (default): `10%` Terracotta tint bg + Terracotta text
- **Neutral Badge**: `~6%` Warm Dark tint + Stone Muted text
- **Status Badge**: `~12%` status-color tint + status-color text
- Shape: `9999px` (full pill), `padding: 2px 10px`, Small (12px/500)
- **Never solid fills** (Move #5)

#### Inputs

- Clean Surface bg, `1px` Warm Divider border, `12px` radius, `12px 16px` padding
- Body text in Warm Dark; Stone Muted placeholder
- Focus: `1px` Hearth Terracotta border + `2px`/`2px` focus ring
- Error: Warm Danger border + message below in Warm Danger Caption text

#### Dividers

Hairline `1px` Warm Divider. Labeled dividers (e.g., "Or sign in with email"): center Stone Muted 13px label between two flex lines.

### §4.2 Atomics

#### Toggle, Checkbox, Radio

Shared pattern: Warm Divider border when off, Hearth Terracotta fill when on. All transition `150ms ease`.

| Control  | Size                                    | Off / Unselected                 | On / Selected                                                          | ARIA                                                                        |
| -------- | --------------------------------------- | -------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Toggle   | Track `44×24px`, `9999px` radius        | Transparent + border; thumb left | Terracotta fill; thumb right (`20px` Clean Surface, `2px` track inset) | `role="switch"` + `aria-checked`; Space/Enter toggles                       |
| Checkbox | `20×20px`, `6px` radius, `1.5px` border | Border only                      | Terracotta border+fill + white `check`. Indeterminate: `minus` icon    | `role="checkbox"` + `aria-checked` (supports `mixed`); Space toggles        |
| Radio    | `20×20px` circle, `1.5px` border        | Border only                      | Terracotta border + `10px` filled inner circle                         | `role="radio"` in `role="radiogroup"`; arrows navigate, Space/Enter selects |

#### Form anatomy

Stacked with `4px` gaps: Label → Input → Helper-or-Error. Field-to-field: `12px`. Section-to-section: `24px`.

- Label: Secondary in Warm Dark. Required marker: appended `*` in Warm Danger.
- Helper: Caption in Stone Muted.
- Error: replaces Helper; Warm Danger text + Warm Danger input border.
- Async validation: inline spinner inside input; `check` (Warm Success) on valid, `alert-circle` (Warm Danger) on invalid.

#### Progress Indicator (determinate)

Only for operations with a real progress signal (uploads, imports). Track `4px` tall, Warm Divider bg, `9999px` radius. Fill Hearth Terracotta, width `{progress}%`, transition `width 200ms ease-out`. Caption label above in Stone Muted. **Never fabricate percentages** — use Long-Wait Indicator (§4.5) for unknown duration. ARIA: `role="progressbar"` with `aria-valuenow` / `valuemin` / `valuemax` / `label`.

#### Amount / Numeric input

Variant of Input for currency. Leading `€` / `$` symbol inside input as Stone Muted decoration (`8px` from edge). Text Warm Dark, `tabular-nums`, right-aligned. `inputmode="decimal"` on mobile.

#### Table

Header row: Secondary typography + `1px` Warm Divider bottom. Data rows: Body text + `1px` Warm Divider separators. Numeric columns: `tabular-nums`, right-aligned. Row padding `12px 16px`; hover bg → Warm Divider at ~30% opacity. Semantic `<table>` preferred.

#### Link Contexts

All use Link typography in Hearth Terracotta.

- **Body-text** — inline in prose; underline on hover and `:focus-visible`
- **Nav** — AppHeader / SideNav / BottomTabBar; no underline; active via Tinted Badge (Move #5)
- **List-row** — entire row is tap target; trailing chevron signals navigability

#### Avatars

Always `border-radius: 50%`.

- Header: `32px`, Hearth Terracotta bg, Avatar Small initials (white, `0.5px` tracking)
- Account: `64px`, same, Avatar Large initials
- Photo variant: `object-fit: cover`, same dimensions, **Hearth Ring** (Move #2: `2px` Warm Divider ring, `box-sizing: border-box`). No filters or tints.
- Fallback: if photo fails, render initials variant (`600ms` delay before fallback to avoid flicker).
- Loading: skeleton circle; shimmer disabled under `prefers-reduced-motion`.

#### Cards (Whisper Card — Move #1)

Clean Surface, `1px` Warm Divider border, `14px` radius, `rgba(0,0,0,0.03) 0px 2px 8px` shadow, `16px` internal padding. The only non-overlay surface with elevation.

#### List Items

Clean Surface container (Flat). Rows: `12px 16px` padding, `1px` Warm Divider bottom separator (except last), min `48px` tall. Typical: leading icon (20px Stone Muted) + label (Body Warm Dark) + optional trailing chevron or value.

#### Settings-List pattern

The most-used surface in Account, Family, Notifications, Privacy.

> **Leading icon (20px Stone Muted) + Label (Body) + optional Value (Secondary Stone Muted, right-aligned) + Trailing (chevron / Toggle / none)** — row height `56px`.

### §4.3 Navigation & Shell

#### AppHeader

`56px` + `env(safe-area-inset-top)`. Clean Surface + `1px` Warm Divider bottom. Sticky at top of PageContainer, flat always (no scroll shadow — Move #1). `0 16px` padding.

3 slots: Leading (`40×40px`) / Title (Section Heading, left-aligned, ellipsis on overflow) / Trailing (`40×40px` each — up to 2 ghost icon buttons or one `32px` header avatar).

**Leading slot content** (one of, always filled on a rendered AppHeader):

- **Back-arrow** on stacked routes (ghost button).
- **Menu trigger** (optional) on flat routes where the app exposes a hamburger.
- **Compact brand mark** (`~28px` Hearthly house icon) on flat tab-root routes — fills the slot so the header reads as a cohesive bar rather than a left-empty 40px gap, and on mobile carries brand identity where no SideNav wordmark is visible.

**Title content:** per-route current page name ("Home", "Budget", "Lists", "Calendar", "Account"). Falls back to "Hearthly" when a route doesn't declare a title.

**LargeTitle variant** (optional, tab roots): Display (40/700) title in scroll content above the sticky header; scrolls away naturally, sticky header retains compact title. **Search** lives in-page at top of content — never in AppHeader.

#### BottomTabBar (`<993px`)

`80px` content + `env(safe-area-inset-bottom)`. Clean Surface + `1px` Warm Divider top. Flat. 4 tabs evenly distributed: Home, Budget, Lists, Calendar. Each tab: stacked icon (24px) + label (Small), full-cell touch target, min `48px` tall.

**Active**: `10%` Hearth Terracotta pill (`40×28px`, `14px` radius) centered behind icon; icon and label Terracotta (Move #5). **Inactive**: Stone Muted icon + label, no pill.

ARIA: `<nav aria-label="Primary">` + `<a aria-current="page">` on active. Not `role="tablist"`.

#### SideNav (`≥993px`)

`250px` wide, full height. Clean Surface + `1px` Warm Divider right. Flat. Vertical stack: optional wordmark top (`24px` padding) → nav items (middle) → optional avatar + name + "Account" link (bottom). Nav items: `16px` start padding, `4px` vertical margin, `8px` horizontal, `8px` radius.

**Active**: full-row `10%` Hearth Terracotta tint bg + Terracotta text/icon (Move #5). ARIA: `<nav aria-label="Primary">`, `<a aria-current="page">` on active.

#### PageContainer

Transparent bg (inherits Warm Stone). Vertical scroll only. Respects `env(safe-area-inset-*)`.

- **Standard mode** (tab pages): `24px` horizontal, `24px` vertical padding, full-width children
- **Constrained mode** (welcome/auth): `24px` horizontal, `32px` vertical padding, children max-width `360px` centered
- **Scroll restoration**: iOS-style preserve (switching tabs keeps scroll position)
- **Optional `onRefresh`**: pull-to-refresh → Terracotta spinner. Opt-in per tab (Home typically yes, others no).

#### PrimaryAction (Extended FAB)

Terracotta pill with icon + label — NOT circular. Explicit labels reduce ambiguity.

- Primary Button treatment: Hearth Terracotta bg, white text, `12px` radius
- Leading icon (e.g., Lucide `plus`) 20px + `8px` gap + Label (Button typography, Title Case, e.g., "Add Transaction")
- `12px 16px` padding
- Fixed position: `bottom: {16px + safe-area + BottomTabBar height}`, `right: 16px`
- Modal-level shadow (§6) so it floats above content
- Used by: Budget, Lists, Calendar. Home typically none. If a tab doesn't declare an action, not rendered.

#### ResponsiveShell

- **`<993px`**: `[AppHeader] / [PageContainer] / [BottomTabBar]`
- **`≥993px`**: `[SideNav | [AppHeader / PageContainer]]` — SideNav full-height left; AppHeader spans only the content area, NOT over SideNav (Notion/Slack pattern)
- Welcome / Account pages are outside ResponsiveShell (own full-screen layout with own header; avoids double-header)
- Edge-swipe-back on iOS: shell responsibility. Left-edge pan dismisses stacked routes.
- Tab-switch transition: subtle crossfade (`150ms ease`). Disabled under `prefers-reduced-motion`.

### §4.4 Overlays

All transient overlays use Modal elevation (§6: `rgba(0,0,0,0.08) 0px 8px 24px`). Modal scrim: `rgba(15, 14, 13, 0.5)`.

#### Modal / Dialog

Clean Surface, `14px` radius, Modal shadow + scrim. Mobile: centered, max-width `min(100vw - 32px, 400px)`. Desktop: max-width `500px`. `24px` padding. Title: Section Heading. Body: Body. Optional X-close top-right (ghost button).

**Actions**: ≤2 → right-aligned desktop (primary rightmost), stacked full-width mobile. ≥3 → stacked full-width always, primary on top, Cancel on bottom. `12px` gap.

#### Action Sheet / Bottom Sheet

Mobile-primary (desktop → Action Menu or Dialog). Clean Surface, `14px` top-rounded, Modal shadow + scrim. Slides up `200ms ease-out`; swipe-down to dismiss (light-impact haptic §7). `36×4px` Warm Divider drag handle at top center. Options stacked `48px` tall, `1px` Warm Divider separators. Destructive options in Warm Danger. Cancel at bottom, visually separated.

#### Action Menu

Anchored context actions (Edit, Delete, Share). Clean Surface, `14px` radius, Modal shadow, `1px solid` Warm Divider border. Max width `~320px`, options `40-48px` tall.

#### Selection Dropdown (listbox)

Value picker replacing native `<select>`. Same visual treatment as Action Menu. Selected option: leading `check` in Hearth Terracotta.

**When in doubt**: actions → Action Menu; choosing a value → Selection Dropdown.

#### Tooltip

Desktop-only. Warm Dark bg (inverted), Ivory text, Small typography, `6px` radius, `6px 10px` padding, max width `~240px`. `500ms` first-show delay, `300ms` skip-cluster between adjacent triggers. **Appears on focus too** (keyboard users).

#### Toast / Snackbar

Warm Dark bg (inverted), Ivory text, Body typography, `12px` radius, `12px 16px` padding, max width `400px`. Mobile: bottom-center `16px` above BottomTabBar+safe-area. Desktop: top-right with `24px` edge margin. Auto-dismiss `5s`, pause on hover/focus; close button always present. Optional leading status icon. Enter: slide+fade `200ms ease-out`. Exit: fade `150ms ease-in`. Error toasts trigger error-notification haptic (§7).

#### Banner

In-flow persistent message (not transient like Toast, not blocking like Modal). `10%` status-color tint bg on Clean Surface, leading status icon (20px), Body text, optional inline action link, optional X-dismiss. `12px` radius, `12px 16px` padding.

**Variants**: neutral / warning / error / success. No `info` (neutral covers informational). Warning variant always carries the warning icon (Move #3 — Warning vs Terracotta disambiguation, §8).

**Banner vs Toast vs Inline form error**: in-flow persistent / transient / field-scoped. Don't mix.

#### ARIA & keyboard summary

| Overlay                    | ARIA                                                                                    | Keyboard                                                  |
| -------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Modal / Dialog             | `role="dialog"` + `aria-modal="true"` + `aria-labelledby`; focus trap (CDK `FocusTrap`) | ESC closes, returns focus to invoker                      |
| Alert Dialog (destructive) | `role="alertdialog"` — focus defaults to least-destructive action                       | Same as Modal                                             |
| Action Sheet               | `role="dialog"` + `aria-modal="true"`, inner `role="menu"` with `menuitem`              | ESC closes, swipe-down dismisses                          |
| Action Menu                | `role="menu"`, items `role="menuitem"`                                                  | ↑/↓ cycle, Enter/Space activates, ESC/Tab closes          |
| Selection Dropdown         | `role="listbox"`, options `role="option"` + `aria-selected`                             | ↑/↓, Enter/Space commits, ESC reverts, Tab closes+commits |
| Tooltip                    | `role="tooltip"` + `aria-describedby` from trigger                                      | Appears on hover AND focus                                |
| Toast (default)            | `role="status"` + `aria-live="polite"`                                                  | —                                                         |
| Toast (error)              | `role="alert"` + `aria-live="assertive"`                                                | —                                                         |

### §4.5 Feedback

#### Empty State

**Inline** (e.g., filter returns nothing inside an existing view):

- Centered vertically, generous whitespace
- Optional `32px` Lucide icon (Stone Muted) above headline
- Headline: Page Title in Warm Dark
- Body: Body in Stone Muted, max-width `~320px`, centered
- Optional inline Primary Button

**Tab-root** (e.g., entire Calendar tab has no events):

- `48px` Lucide icon inside `64px` circle with `10%` Hearth Terracotta tint bg
- **Single permitted tinted icon container** — explicit exception to the no-colored-container rule. Justified by warmth needed in otherwise-sparse tab states. Don't reuse.
- Same headline / body / action as inline, centered

**First-run vs zero-data** (voice, §10):

- First-run: warm, inviting ("Add your first family list to get started")
- Zero-data: neutral, informational ("No transactions match these filters")

#### Loading Skeleton

Shimmer pattern. Warm Divider base + Clean Surface overlay animated left-to-right, `1.5s` per sweep.

- Variants: list row, card, avatar circle, text line (each matches the content it replaces)
- **Under `prefers-reduced-motion`**: static Warm Divider blocks, no shimmer.
- **Scope rules**:
  - `<1s` loads: no loader (flash is worse than silence)
  - `1-10s`: Loading Skeleton
  - `>10s` with real progress signal: determinate Progress Indicator (§4.2)
  - `>10s` without progress signal: Long-Wait Indicator (below)

#### Long-Wait Indicator

For unknown-duration fetches exceeding 10s.

- Centered Terracotta spinner: `20px`, `2px` stroke, 1 rotation per second
- Status message below: Body in Stone Muted (e.g., "Loading…" or "Getting your family's lists…")
- **Never fabricate percentages** when none is known
- Under `prefers-reduced-motion`: static `hourglass` icon instead of spinner

### §4.6 Controls

#### Segmented Control

For mutually-exclusive view switches (Budget: Income/Expense; Calendar: Day/Week/Month).

- Container: pill (`9999px` radius, `1px` Warm Divider border, `4px` internal padding, Clean Surface bg)
- Segments grow equally. Each a child pill with Button typography.
- **Active**: `10%` Hearth Terracotta tint bg + Terracotta text (Move #5)
- **Inactive**: transparent bg + Stone Muted text. Hover (desktop): text → Warm Dark.
- Transition: `background-color 150ms ease, color 150ms ease`
- ARIA: `role="radiogroup"`, segments `role="radio"` + `aria-checked`. Keyboard: arrows cycle.
- Intentionally diverges from Material 3's rounded-rect pattern — pill shape reuses Tinted Badge mechanic.

### §4.7 Imagery

Avatar photos specified in §4.2. This section covers other user-uploaded content photos.

- **Radius**: `12px` (nested feel inside `14px` cards)
- **Aspect ratios in feeds/lists**: `1:1`, `4:3`, or `16:9` only. Free-form allowed only in detail/lightbox views. Prevents layout shift.
- **Border**: none (Whisper Card border contains when nested)
- **Placement in cards**: photo fills top edge, respects card's top `14px` corners
- **Fallback**: if image fails → Warm Divider bg + `image-off` Lucide icon (Stone Muted) centered. `600ms` delay before fallback renders.
- **Loading**: LQIP dominant-color placeholder computed at upload, painted as CSS bg until image loads. Image fades in on load (`200ms ease-out`).
- **No filters or tints** on user photos. **No decorative imagery** (gradients, hero illustrations, patterns). User photos ARE content, not decoration.
- **Alt text**: user-provided caption at upload (optional). Fallback `alt="Photo uploaded by {name}"` or `alt="Photo from {event name}"`. Fallback/image-off state: `role="img"` + `aria-label="Image unavailable"`.
- **Taste rule**: no screenshots of chats, documents, or other apps as family content.

Implementation details (responsive delivery, EXIF stripping, upload processing, crop UX) are backend/pipeline concerns, not design. Addressed when the feature is built.

## 5. Layout

### Spacing scale

`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`.

### Section spacing

| Context                     | Gap                           |
| --------------------------- | ----------------------------- |
| Adjacent Whisper Cards      | `16px`                        |
| Between card groups         | `32px`                        |
| Section header → first card | `16px`                        |
| LargeTitle → content        | `24px`                        |
| List row gaps               | `0` (Warm Divider separators) |
| Form field gap              | `12px`                        |
| Welcome tagline → buttons   | `48px`                        |

### Whitespace rules

1. **Cards breathe, lists unify** — cards have gaps; list rows use separators, not gaps
2. **Mobile breathing room** — `24px` PageContainer padding is the floor
3. **Desktop restraint** — SideNav takes extra width; content area stays at comfortable mobile-era width

### Layout rules

- Mobile-first (`375px` viewport baseline)
- Centered constrained content: max-width `360px` (welcome/auth only)
- `24px` horizontal page padding; `24px` vertical (tab pages) or `32px` vertical (auth)
- No grid system — app is list-and-card based

### Radius scale

| Value    | Usage                                         |
| -------- | --------------------------------------------- |
| `6px`    | Checkboxes, small primitives                  |
| `8px`    | Sidenav nav items                             |
| `12px`   | Buttons, inputs, badges (small), Banner/Toast |
| `14px`   | Cards, modals, action sheets (top-only)       |
| `9999px` | Pills, tags, toggles, segmented control       |
| `50%`    | Avatars, circles                              |

## 6. Depth & Elevation

| Level     | Treatment                                           | Use                                                  |
| --------- | --------------------------------------------------- | ---------------------------------------------------- |
| Flat      | No shadow, no border                                | Page bg, lists, chrome surfaces (with their borders) |
| Contained | `1px solid` Warm Divider                            | Inline containers                                    |
| Whisper   | `1px` Warm Divider + `rgba(0,0,0,0.03) 0px 2px 8px` | **Cards** (Move #1)                                  |
| Modal     | `rgba(0,0,0,0.08) 0px 8px 24px`                     | All transient overlays                               |

### Surface Elevation Map

| Surface                                    | Level                                          |
| ------------------------------------------ | ---------------------------------------------- |
| Page background                            | Flat                                           |
| AppHeader                                  | Flat + `1px` Warm Divider bottom               |
| BottomTabBar                               | Flat + `1px` Warm Divider top                  |
| SideNav                                    | Flat + `1px` Warm Divider right                |
| List container                             | Flat (rows with `1px` Warm Divider separators) |
| Card                                       | Whisper                                        |
| Action Menu / Selection Dropdown / Tooltip | Modal                                          |
| Action Sheet / Bottom Sheet                | Modal + top-rounded `14px`                     |
| Dialog / Modal / Toast                     | Modal                                          |
| PrimaryAction (FAB)                        | Modal                                          |
| Long-Wait Indicator                        | Flat (in-flow)                                 |
| Modal Scrim                                | `rgba(15, 14, 13, 0.5)`                        |

**No scroll-triggered elevation.** Headers never gain shadow when content scrolls. Calm > spectacle.

Depth comes from: canvas/surface color difference + warm borders + whisper-soft card shadow + slightly stronger modal shadow. Paper on wood, not glass over a void.

## 7. Motion & Haptics

> **Motion in Hearthly is functional only — it communicates state change, never personality.**

### Durations

- `150ms` — micro (color, background, border, opacity)
- `200ms` — macro (modal fade+slide, sheet slide-in, tab transitions)

### Easings

- `ease-out` — entrances
- `ease-in` — exits
- `ease` — state changes
- **No springs, no bouncy cubic-béziers.**

### What animates

Allowed: `color`, `background-color`, `border-color`, `opacity`, `transform` (modal fade+slide, button press `scale(0.98)`, sheet slide).

Not animated: layout (`width`, `height`, `padding`, `margin`). No hover-wiggle, no pulse.

### Sanctioned ornamental motion

**Loading Skeleton shimmer** (`1.5s` sweep) is the one exception to functional-only motion. Progress signals read as broken without it. Under `prefers-reduced-motion`, shimmer disables (static blocks).

### Reduced motion

Under `prefers-reduced-motion: reduce`:

- Transforms disabled
- Transitions drop to `0.01ms`
- Shimmer disabled
- Haptics disabled
- Long-Wait spinner becomes a static `hourglass` icon

### Haptics (3 semantic triggers)

Via `@capacitor/haptics`. Respects `prefers-reduced-motion`.

| Trigger                    | Haptic               | Context                                    |
| -------------------------- | -------------------- | ------------------------------------------ |
| Destructive confirm        | Warning notification | Destructive Button press in an alertdialog |
| Toast error shown          | Error notification   | Non-blocking error via toast               |
| Bottom sheet swipe-dismiss | Light impact         | User-initiated close gesture               |

Intentionally not haptic: primary-button press, action-sheet option tap, toast-success. Visual feedback suffices; haptic would be cosmetic.

## 8. Do's and Don'ts

### Do

- Reference colors by semantic name — never hardcode hex in component styles
- Use tokens for every color, radius, shadow
- Keep neutrals warm in both modes (Move #3)
- Apply Whisper Card shadow to cards only (Move #1); transient overlays use Modal level
- Use Title Case on buttons and interactive labels (Move #6)
- Cross-reference Signature Moves by number in downstream specs
- Warning banners always carry the warning icon — differentiates from Terracotta tints

### Don't

- Don't use `#ffffff` for primary text (use Warm Dark or Warm Parchment `#f5f0eb` in dark mode)
- Don't use `#808080` or Material's `#e0e0e0` for borders (use Warm Divider)
- Don't use `#1976d2` or any cool-blue focus color (use Hearth Terracotta)
- Don't use pure black / pure white for page backgrounds
- Don't use UPPERCASE button labels
- Don't use solid-colored badge backgrounds (Move #5 — tinted only)
- Don't add decorative motion, gradients, hero illustrations, or background patterns
- Don't use screenshots of chats or other apps as family content
- Don't introduce a cool-blue info color (use neutral variant)
- Don't adopt platform-adaptive rendering (one unified brand voice everywhere)

## 9. Responsive Behavior & Accessibility Baseline

### Breakpoints

Single switch at `993px` (Move #8). Below: BottomTabBar visible, no SideNav, full-width content, header avatar for account access. Above: `250px` SideNav pinned, BottomTabBar hidden, avatar stays in header.

Content-width constraint (`360px` max for welcome/auth) is a content rule, not a breakpoint.

### Touch targets

- Minimum `44×44px`
- Buttons: `48px` total height
- List rows: `48px` tall; Settings-List rows `56px` for value-display comfort
- Tab bar cells: full-cell tap target

### Gestures (iOS)

- **Edge-swipe-back**: left-edge pan dismisses stacked routes (Account page, sub-pages). Shell responsibility.
- Swipe-to-dismiss on Action Sheets / Bottom Sheets
- Pull-to-refresh via PageContainer `onRefresh` (opt-in)

### Safe areas

Use `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`, etc. for PageContainer, AppHeader, BottomTabBar, PrimaryAction. Explicit handling only — no framework defaults.

### Accessibility baseline

Pragmatic scope for a family app — not enterprise compliance:

- **Contrast**: WCAG AA floor. Stone Muted is for secondary/UI only (fails AA on body text); use Deep Stone for body-weight secondary. Measure exact ratios during implementation.
- **Focus visibility**: `2px` Hearth Terracotta outline with `2px` offset, `:focus-visible` only.
- **Keyboard (desktop)**: Tab in visual order, Enter activates, Space toggles switches/checkboxes, ESC closes overlays, arrow keys within radio groups and segmented controls. Sensible defaults — not full APG compliance.
- **Screen readers**: VoiceOver (iOS) and TalkBack (Android) are primary. Every component declares appropriate ARIA role in its §4 spec; component authors use those.
- **Alt text**: user-supplied caption on upload; fallback `alt="Photo uploaded by {name}"`. Decorative images `alt=""`. Icon-only buttons require `aria-label`.
- **Reduced motion**: see §7.

If Hearthly grows into regulated territory (thousands of users, EU jurisdictions, etc.), this section expands. For now: baseline that works, not exhaustive compliance.

## 10. Voice & Copy

Voice reinforces the warm-domestic identity.

- **Empty states**: warm, not cheerful. _"Nothing here yet. Add your first list."_ not _"Oh no, empty!"_
- **Errors**: concrete, non-blaming. _"Couldn't save — check your connection"_ not _"Failure: network error"_
- **Destructive confirmation template**: `Delete [Specific Thing]? This can't be undone.` Always name the thing. One short second sentence. No "Are you sure?"
- **Button labels**: actions, not restatements. _"Save"_ not _"OK"_. _"Discard"_ not _"Cancel"_ for destructive dismissal. For non-destructive dialogs, _"Cancel"_ stays _"Cancel"_.
- **First-run vs zero-data**: first-run is warm and inviting; zero-data is neutral and informational.
- **Tone**: conversational, not cutesy. No exclamation points in errors. No emoji in UI copy.

## 11. Agent Prompt Guide

### Quick reference

```
Brand:       Hearth Terracotta  #c7724e (light) / #d4885e (dark)
Background:  Warm Stone         #f8f7f5 (light) / #0f0e0d (dark)
Surface:     Clean Surface      #ffffff (light) / #1c1a18 (dark)
Text:        Warm Dark          #1c1917 (light) / #f5f0eb (dark)
Muted:       Stone Muted        #78716c (light) / #a39e98 (dark) — secondary/UI only
Body-muted:  Deep Stone         #65605b (light)                  — body-weight secondary
Border:      Warm Divider       #e5e2dc (light) / #2a2725 (dark)
Success:     Warm Success       #2e7d32 (light) / #66bb6a (dark)
Danger:      Warm Danger        #b53333 (light) / #e57373 (dark)
Warning:     Warm Warning       #e65100 (light) / #ffb74d (dark)
```

### Composition prompts

Four high-level prompts matching how agents request UI.

**1. Build a tab root page.**

- PageContainer in standard mode, iOS-style scroll-preserve
- AppHeader with optional LargeTitle variant (Display 40/700 in scroll content, compact title in sticky header)
- Content: Whisper Cards (Move #1)
- Optional PrimaryAction (Extended FAB) for tabs with a primary constructive action
- Search lives in-page at top of content, NOT in AppHeader
- Applies Moves #1, #6, #8

**2. Build a destructive-confirm modal.**

- Modal with `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` on title, focus defaults to Cancel
- Destructive Button primary (right on desktop, stacked-top mobile); Cancel secondary
- Copy follows destructive template: `Delete [Specific Thing]? This can't be undone.`
- Primary press triggers warning-confirm haptic (§7)
- ESC closes, return focus to invoker
- Applies Move #6, §7 haptics, §10 voice

**3. Build a form section.**

- Form anatomy: Label → Input → Helper or Error, `4px` gap, `12px` between fields, `24px` between sections
- Required marker: appended `*` in Warm Danger
- Error state: Warm Danger border + Caption message below
- Submit: Primary Button bottom-right desktop, full-width mobile
- Optional async validation affordance (inline spinner → check / alert-circle)
- Applies Moves #4, #6

**4. Build a tab-root empty state.**

- Centered vertically in PageContainer
- `48px` Lucide icon in `64px` circle with `10%` Hearth Terracotta tint bg (the sanctioned exception; don't reuse)
- Page Title headline (first-run warm, zero-data neutral — §10 voice)
- Body text in Stone Muted, max-width `~320px`
- Optional inline Primary Button
- Applies Moves #4, #5
