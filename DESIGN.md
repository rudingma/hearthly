# Hearthly — Design System

## 1. Visual Theme & Atmosphere

Hearthly's interface is a warm domestic space rendered as software — a family management app that feels like coming home to a well-lit kitchen where everything is in its place. The design is built on a warm off-white canvas (`#f8f7f5`) with a terracotta accent (`#c7724e`) that directly references the brand name: "hearth" means fireplace, the warm center of a home. Where productivity apps lean into cool efficiency and fintech apps project confidence, Hearthly radiates familial calm — unhurried, grounded, and free of urgency.

The typography uses the platform's native system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`) — no custom web fonts, no loading overhead, no visual friction between the app and the device it runs on. This isn't a compromise; it's a deliberate choice. A family app should feel like a natural extension of the phone, not a foreign website. Headings run at 32px/700 with slight negative letter-spacing (`-0.5px`), creating titles that feel substantial without shouting. Body text at 16px/400 is the workhorse — clean, readable, unremarkable in the best way.

What makes Hearthly's visual language distinctive is its commitment to warm neutrals. Every gray in the system carries a stone or beige undertone — there are no cold blue-grays anywhere. The background (`#f8f7f5`) has a barely perceptible yellow warmth. The muted text color (`#78716c`) is a warm stone, not a sterile gray. Even in dark mode, the near-black (`#0f0e0d`) and surface (`#1c1a18`) carry olive-brown warmth rather than the blue-black of typical dark themes. Combined with Ionic's platform-adaptive rendering (iOS-style on iOS, Material-style on Android), the result is an app that feels native, warm, and quietly domestic on every device.

**Key Characteristics:**

- Warm off-white canvas (`#f8f7f5`) — not pure white, not cream, a subtle stone warmth
- Terracotta accent (`#c7724e`) as the singular brand color — earthy, deliberate, un-tech
- System font stack only — zero web fonts, native feel on every platform
- Exclusively warm-toned neutrals — every gray has a stone/beige undertone, never blue-gray
- Ionic 8 component framework — platform-adaptive rendering, CSS variable theming
- Flat by default — depth comes from surface color contrast, not shadows
- Mobile-first with `ion-split-pane` for desktop — bottom tabs on mobile, sidebar at 993px+
- Comfortable density — generous padding, breathing room, not data-dense
- No decorative motion — transitions are `0.15s` for background/color, Ionic handles page transitions natively

## 2. Color Palette & Roles

All colors are defined as CSS custom properties in `apps/hearthly-app/src/theme/variables.scss`. Ionic components inherit theme via `--ion-color-*` variables. Custom elements use `--hearthly-*` tokens.

### Primary (Terracotta)

- **Hearth Terracotta** (`#c7724e` light / `#d4885e` dark): `--ion-color-primary`. The core brand color — a burnt orange-brown that says "home" without saying "kitchen app." Used for primary buttons, active tab icons, avatar backgrounds, and links. The only chromatic color in the UI chrome. In dark mode it lightens to maintain vibrancy against dark surfaces.
- **Terracotta Shade** (`#a3572e` light / `#c7724e` dark): `--ion-color-primary-shade`. Pressed and hover states on terracotta elements — darker, more saturated, providing tactile feedback.
- **Terracotta Tint** (`#d4885e` light / `#e8a67a` dark): `--ion-color-primary-tint`. Subtle accents, light emphasis, background tints at low opacity. The gentler end of the terracotta range.
- **Terracotta Contrast** (`#ffffff`): `--ion-color-primary-contrast`. Text on terracotta backgrounds — always pure white for maximum legibility.

### Background & Surfaces

- **Warm Stone** (`#f8f7f5` light / `#0f0e0d` dark): `--ion-background-color`. The page canvas — a warm off-white with a barely perceptible yellow-stone tint that's gentler than pure white. In dark mode, a near-black with olive warmth rather than blue-black. The emotional foundation of the entire design.
- **Clean Surface** (`#ffffff` light / `#1c1a18` dark): `--hearthly-surface`, `--ion-item-background`, `--ion-card-background`, `--ion-toolbar-background`, `--ion-tab-bar-background`. Cards, headers, tab bar, list items — one step brighter than the canvas, creating subtle layering. The distinction between canvas and surface is the primary depth mechanism.

### Text

- **Warm Dark** (`#1c1917` light / `#f5f0eb` dark): `--ion-text-color`. Primary text — not pure black but a warm near-black with brown undertones. In dark mode, not pure white but a warm parchment tone (`#f5f0eb`) that prevents eye strain on dark surfaces.
- **Stone Muted** (`#78716c` light / `#a39e98` dark): `--hearthly-text-muted`, `--ion-color-medium`. Secondary text, labels, timestamps, placeholders, taglines — a warm stone gray. The most-used text color after primary, providing hierarchy without coldness.
- **Deep Stone** (`#65605b`): `--ion-color-medium-shade`. De-emphasized text, darker variant of muted.
- **Light Stone** (`#867f7b`): `--ion-color-medium-tint`. Slightly lighter muted text for gentler de-emphasis.

### Borders

- **Warm Divider** (`#e5e2dc` light / `#2a2725` dark): `--ion-border-color`. Card borders, list separators, dividers — a warm cream-gray that creates the gentlest possible containment. In dark mode, a warm charcoal that maintains the stone undertone.

### Status Colors

Status colors are warm-tinted to blend with the palette rather than fight it. Defined via Ionic's semantic color system (`--ion-color-success`, `--ion-color-danger`, `--ion-color-warning`).

- **Warm Success** (`#2e7d32` light / `#66bb6a` dark): `--ion-color-success`. Task completion, positive confirmations — a grounded forest green, not a neon lime. Warm enough to sit alongside terracotta without clashing.
- **Warm Danger** (`#b53333` light / `#e57373` dark): `--ion-color-danger`. Form validation errors, destructive actions — a deep, serious red that doesn't scream. Inspired by Claude's Error Crimson.
- **Warm Warning** (`#e65100` light / `#ffb74d` dark): `--ion-color-warning`. Attention needed, budget alerts — a burnt orange that feels like a natural extension of the terracotta family.

### Chromatic Rule

All neutrals are warm-tinted with stone or beige undertones. There are no cool blue-grays anywhere in the system — not in light mode, not in dark mode, not in borders, not in shadows. If a new gray is needed, it must carry warmth. This is the single most important visual rule in the system.

## 3. Typography Rules

### Font Family

- **Primary:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif` — set via `--ion-font-family`
- **No custom web fonts.** The system font stack renders San Francisco on Apple devices, Segoe UI on Windows, Roboto on Android — each platform's native typeface. A family app should feel like it belongs on your phone, not like a branded experience fighting the OS. Zero loading overhead, zero flash of unstyled text, zero visual friction.

### Hierarchy

| Role | Size | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|
| Page Title | 32px (2.00rem) | 700 | 1.20 (tight) | -0.5px | Welcome headline, major section titles — substantial without shouting |
| Section Heading | 20px (1.25rem) | 600 | 1.30 | normal | Card headers, profile name, feature titles |
| Body | 16px (1.00rem) | 400 | 1.50 (relaxed) | normal | Default content, descriptions, navigation labels — the workhorse |
| Body Emphasis | 16px (1.00rem) | 500 | 1.50 (relaxed) | normal | Taglines, welcome messages, slightly emphasized body |
| Secondary | 14px (0.88rem) | 500 | 1.43 | normal | Buttons, email addresses, metadata, form labels |
| Caption | 14px (0.88rem) | 400 | 1.43 | normal | Muted labels, secondary info in Stone Muted color |
| Small | 12px (0.75rem) | 400–500 | 1.33 | normal | Badges, timestamps, fine print |
| Avatar Initials (large) | 20px (1.25rem) | 600 | 1.00 | 0.5px | Account page avatar (64px circle) — wider tracking for legibility |
| Avatar Initials (small) | 12px (0.75rem) | 600 | 1.00 | 0.5px | Header avatar (32px circle) — compact but legible |

### Principles

- **System fonts as identity:** The native font stack isn't a fallback — it's the design. San Francisco on iOS, Roboto on Android, Segoe UI on Windows. Each user sees their platform's typeface, making the app feel like a natural part of the device rather than a foreign brand.
- **Weight for hierarchy, not size:** The range is compact (12px–32px) because a family app doesn't need billboard headlines. Hierarchy comes from weight transitions: 700 (titles) → 600 (section heads) → 500 (emphasis) → 400 (body). Size differences are subtle; weight differences are clear.
- **Negative tracking on titles only:** Page titles at 32px use `-0.5px` letter-spacing for a compact, grounded feel. All other text uses default tracking — tight headings and relaxed body create natural rhythm.
- **Relaxed body line-height:** Body text at `1.50` line-height is more generous than typical app UI (1.3–1.4). A family app is for browsing at home, not scanning dashboards at work. The extra breathing room supports comfortable reading.

## 4. Component Stylings

All components use Ionic 8 standalone elements, themed via CSS variables. Custom styling is scoped per-component in SCSS and kept minimal — Ionic handles most visual concerns through its variable system.

### Buttons

**Primary (Ionic)**

- Component: `ion-button`
- Background: Hearth Terracotta (`--ion-color-primary`)
- Text: Pure White (`--ion-color-primary-contrast`)
- Padding: Ionic default (`10px 20px` equivalent — managed by the framework, do not override)
- Radius: 12px (`--hearthly-radius-button`)
- Hover: Terracotta Shade (`--ion-color-primary-shade`)
- Focus: `outline: 2px solid var(--ion-color-primary); outline-offset: 2px`
- Disabled: `opacity: 0.5; pointer-events: none` (Ionic default)
- The only chromatic button — reserved for primary actions

**Secondary (Ionic)**

- Component: `ion-button` with `fill="outline"`
- Background: transparent
- Text: Warm Dark (`--ion-text-color`)
- Border: `1px solid var(--ion-border-color)` (Warm Divider)
- Padding: Ionic default
- Radius: 12px (`--hearthly-radius-button`)
- Hover: background `rgba(var(--ion-text-color-rgb), 0.05)` — a barely-visible warm tint
- Use: Cancel, Skip, secondary actions — any action that's available but not encouraged

**Ghost (Ionic)**

- Component: `ion-button` with `fill="clear"`
- Background: transparent
- Text: Stone Muted (`--ion-color-medium`)
- Border: none
- Padding: Ionic default
- Radius: 12px (`--hearthly-radius-button`)
- Use: Tertiary actions, inline text-like buttons — "Show more", "Edit", "Remove"

**Google Sign-In** (custom, follows [Google Branding Guidelines](https://developers.google.com/identity/branding-guidelines))

- Background: `#ffffff` (light) / `#131314` (dark)
- Text: `#3c4043` (light) / `#e3e3e3` (dark), 14px weight 500
- Border: 1px solid `#dadce0` (light) / `#8e918f` (dark)
- Padding: 14px 16px
- Radius: 12px (`--hearthly-radius-button`)
- Icon: Google "G" at 18x18px, flex-shrink 0
- Hover: background `#f7f8f8`, border `#c4c7c5` / background `#1f1f20`, border `#a1a3a0`
- Active: background `#e8eaed` / `#2a2a2b`
- Focus: `outline: 2px solid var(--ion-color-primary); outline-offset: 2px`
- Transition: `background 0.15s, border-color 0.15s` — subtle, not bouncy

### Cards

- Component: `ion-card`
- Background: Clean Surface (`--ion-card-background`) — white / `#1c1a18`
- Border: `1px solid var(--ion-border-color)` — warm containment replacing heavy shadow
- Radius: 14px (`--hearthly-radius-card`)
- Shadow: `rgba(0,0,0,0.03) 0px 2px 8px` — a whisper-soft lift, barely visible. Replaces Ionic's default Material shadow which is too heavy and cold for the warm palette. Inspired by Notion's sub-0.05 opacity approach.
- Content padding: Ionic defaults via `ion-card-content`
- Cards are the primary content container — they sit on the Warm Stone canvas, creating depth through warm border + surface/canvas color difference + whisper shadow

### Navigation Items (Sidebar)

- Component: `ion-item` inside `ion-menu`
- Padding: 16px start (`--padding-start`)
- Radius: 8px (`--border-radius`)
- Margin: 4px vertical, 8px horizontal (inside menu)
- Cursor: pointer
- **Default state:** Ionic default item appearance
- **Selected state:** `background: rgba(var(--ion-color-primary-rgb), 0.1); color: var(--ion-color-primary)` — a 10% terracotta tint that's visible but not heavy, with terracotta text for the label and icon

### Avatars

- **Header avatar:** 32px circle, terracotta background (`--ion-color-primary`), white initials at 12px/600 with `0.5px` letter-spacing
- **Account page avatar:** 64px circle, same treatment, 20px/600 initials with `0.5px` letter-spacing
- **Photo variant:** `object-fit: cover`, same circle dimensions, replaces initials when available. Photos get a `2px solid var(--ion-border-color)` ring to blend warmly into the UI — without it, profile photos with white or dark edges look disconnected from the warm palette.
- Shape: always `border-radius: 50%` — never rounded-square, never square

### Badges & Pills

Pill badges are used for member roles ("Parent", "Kid"), categories, status labels, and tags. Inspired by Notion's tinted-background pill pattern.

- **Terracotta Badge** (default): `background: rgba(var(--ion-color-primary-rgb), 0.1); color: var(--ion-color-primary)` — a 10% terracotta tint with terracotta text. The primary badge for most labels.
- **Neutral Badge:** `background: rgba(var(--ion-text-color-rgb), 0.06); color: var(--hearthly-text-muted)` — a subtle warm gray for de-emphasized tags.
- **Status Badges:** Same pattern with status colors — e.g., `rgba(var(--ion-color-success-rgb), 0.12)` background with `var(--ion-color-success)` text.
- Shape: `border-radius: 9999px` (full pill), `padding: 2px 10px`, `font-size: 12px`, `font-weight: 500`
- Never use solid-colored backgrounds for badges — always tinted/translucent to maintain the soft, warm feel

### Lists & Items

- Component: `ion-list`, `ion-item`
- Background: `--ion-item-background` (Clean Surface)
- Borders: Ionic default separators using `--ion-border-color`
- No custom list styling — Ionic's native list rendering is the design

### Inputs & Forms

- Components: `ion-input`, `ion-select`, `ion-textarea`
- Radius: 12px (`--hearthly-radius-button`)
- Focus: primary color outline ring
- Styling: Ionic defaults with CSS variable theming — no custom input chrome

## 5. Layout Principles

### Spacing Scale

| Value | Usage |
|---|---|
| 4px | Tight gaps — name to email, icon to label when compact |
| 8px | Compact spacing — tag gaps, icon margins, sidebar item vertical margin |
| 12px | Default element gaps — button stacks, avatar to text, form field gaps |
| 16px | Section internal padding — sidebar item padding, card content margins |
| 24px | Container horizontal padding — page edges, section breaks, vertical rhythm between groups |
| 32px | Major section separation — profile section to content, sign-out section top margin |
| 48px | Hero spacing — welcome tagline to sign-in buttons, largest standard gap |

### Layout Rules

- **Mobile-first.** Design for 375px viewport width. Ionic handles scaling to larger screens.
- **Centered action areas:** max-width 320px (sign-in buttons, welcome content only). Tab and list pages are full-width with no container cap.
- **Centering:** Flexbox column + center alignment for standalone pages (welcome, account profile).
- **Page padding:** 24px horizontal, 32px vertical for full-screen pages (welcome-style).
- **Desktop breakpoint:** 993px — `ion-split-pane` pins a 250px sidebar, tab bar hides.
- **No explicit grid system.** Ionic's layout utilities (`ion-grid`, `ion-row`, `ion-col`) are available but most layouts are simple vertical stacks. The app is list-and-card based, not grid-based.

### Whitespace Philosophy

Hearthly uses comfortable, domestic spacing — not the vast breathing room of a marketing site, not the tight compression of a data dashboard. The spacing says "take your time" without wasting screen real estate on a mobile device. Sections feel grouped but not cramped. The 24px container padding is generous enough to feel airy on a phone screen without pushing content unnecessarily small.

### Border Radius Scale

| Value | Token | Usage |
|---|---|---|
| 8px | — | Sidebar navigation items, small interactive elements |
| 12px | `--hearthly-radius-button` | Buttons, inputs, form elements |
| 14px | `--hearthly-radius-card` | Cards, content containers |
| 9999px | — | Pill badges, tags, status labels — full pill shape |
| 50% | — | Avatars, circular elements — always perfect circles |

The radius scale is deliberately narrow. Four values plus circles cover the entire app. This isn't a limitation — it's consistency. Every rounded corner feels like it belongs to the same family.

## 6. Depth & Elevation

| Level | Treatment | Usage |
|---|---|---|
| Flat (Level 0) | No shadow, no border | Most surfaces — list items, toolbars, tab bar, page background |
| Contained (Level 1) | `1px solid var(--ion-border-color)` | Warm border containment — the default for cards and containers |
| Whisper (Level 2) | `1px solid var(--ion-border-color)` + `rgba(0,0,0,0.03) 0px 2px 8px` | Cards (`ion-card`) — warm border plus a barely-visible lift |
| Modal (Level 3) | Ionic default modal/popover shadow | Action sheets, dialogs, popovers — framework-managed elevation |

**Shadow Philosophy:** Hearthly's depth comes from three mechanisms layered together: the canvas/surface color difference (Warm Stone vs Clean Surface), warm borders (`--ion-border-color`), and whisper-soft shadows at 0.03 opacity. This replaces Ionic's default Material card shadow — which uses cold-tinted rgba at up to 0.2 opacity — with something warmer and subtler, inspired by Notion's sub-0.05 opacity approach and Claude's warm ring borders.

The result should feel like cards sitting on a warm wooden desk — paper on wood, not glass floating over a void. Borders do the containing, the surface color difference creates depth, and the whisper shadow adds just enough lift to feel three-dimensional without drawing attention to itself.

Modal and popover shadows use Ionic's defaults unchanged — these are transient overlays that benefit from stronger elevation to signal their temporary nature.

## 7. Do's and Don'ts

### Do

- Use Ionic components (`ion-button`, `ion-card`, `ion-item`, `ion-toolbar`, `ion-tabs`, `ion-modal`) for all structural UI — they are the design system
- Import Ionic components individually from `@ionic/angular/standalone` — standalone components only, no NgModules
- Register icons via `addIcons()` in component constructors — the Ionic icon pattern
- Use `var(--ion-color-*)` and `var(--hearthly-*)` tokens for all colors — never hardcode hex values in component SCSS
- Keep component SCSS minimal — if Ionic already handles it through variables, don't duplicate with custom styles
- Use `data-testid` attributes on all interactive elements for test selectors
- Maintain warm-toned neutrals everywhere — stone/beige undertone on every gray, in both light and dark mode
- Let the terracotta accent be the only chromatic color — it should feel special when it appears
- Use the surface/canvas color difference for depth — not shadows

### Don't

- Don't use Tailwind, Angular Material, or any utility-class CSS framework — Ionic + CSS variables is the styling system
- Don't add custom web fonts — the system font stack is the design, not a fallback
- Don't use heavy or cold shadows — the whisper shadow (`rgba(0,0,0,0.03) 0px 2px 8px`) on cards is the maximum; anything above 0.05 opacity is too much
- Don't use cold blue-grays anywhere — every neutral must carry warm stone/beige undertones
- Don't use pure black (`#000000`) for text or backgrounds — use Warm Dark (`#1c1917`) or near-black (`#0f0e0d`)
- Don't use pure white (`#ffffff`) for page backgrounds — use Warm Stone (`#f8f7f5`). Pure white is reserved for card surfaces only
- Don't build custom navigation patterns — use Ionic's `ion-tabs`, `ion-split-pane`, `ion-menu`
- Don't override Ionic's platform-adaptive behavior — iOS rendering on iOS, Material on Android is correct
- Don't add decorative elements, gradients, illustrations, or animations without a clear functional purpose — the design is content-first, not decoration-first
- Don't introduce additional brand colors beyond terracotta and the three status colors (success, danger, warning)
- Don't use solid-colored badge backgrounds — always use translucent tints (10–12% opacity) for pills and tags

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Behavior |
|---|---|---|
| Mobile | < 993px | Bottom tab bar visible (4 tabs: Home, Budget, Lists, Calendar). No sidebar. Full-width content. Header avatar for account access. |
| Desktop | >= 993px | `ion-split-pane` pins a 250px sidebar with same navigation items. Tab bar hidden via `@media (min-width: 993px) { ion-tab-bar { display: none; } }`. Avatar stays in header. |

The single breakpoint is intentional. Ionic's adaptive components handle intermediate sizes gracefully. The only structural change is sidebar vs tabs — everything else scales naturally.

### Touch Targets

- Minimum 44px touch target — Ionic enforces this on mobile
- Buttons: 14px vertical padding minimum (Google Sign-In sets the standard)
- List items: Ionic default item height (~48px) — comfortable for thumb interaction
- Tab bar icons: Ionic default sizing — adequate for all finger sizes

### Navigation Collapse

- **Mobile:** 4 bottom tabs (Home, Budget, Lists, Calendar) + header avatar (32px circle, top-right) for account access
- **Desktop:** 250px sidebar with the same navigation items, avatar remains in header
- **Account page:** Full-screen, outside the tab system — has its own header with back button. Not nested inside the shell to avoid double-header.

### Safe Areas

Ionic handles safe-area insets automatically via CSS environment variables (`safe-area-inset-top`, `safe-area-inset-bottom`). Do not add manual safe-area padding — it will conflict with Ionic's handling and produce double spacing on notched devices.

## 9. Agent Prompt Guide

### Quick Color Reference

```
Primary:     Hearth Terracotta  #c7724e (light) / #d4885e (dark)
Shade:       Terracotta Shade   #a3572e (light) / #c7724e (dark)
Tint:        Terracotta Tint    #d4885e (light) / #e8a67a (dark)
Background:  Warm Stone         #f8f7f5 (light) / #0f0e0d (dark)
Surface:     Clean Surface      #ffffff (light) / #1c1a18 (dark)
Text:        Warm Dark          #1c1917 (light) / #f5f0eb (dark)
Muted:       Stone Muted        #78716c (light) / #a39e98 (dark)
Border:      Warm Divider       #e5e2dc (light) / #2a2725 (dark)
Success:     Warm Success       #2e7d32 (light) / #66bb6a (dark)
Danger:      Warm Danger        #b53333 (light) / #e57373 (dark)
Warning:     Warm Warning       #e65100 (light) / #ffb74d (dark)
```

### Example Component Prompts

"Create a home tab page: `ion-content` with Warm Stone background (`#f8f7f5`). A greeting card using `ion-card` with 14px radius on Clean Surface (`#ffffff`). Title at 20px weight 600 in Warm Dark (`#1c1917`), subtitle at 16px weight 400 in Stone Muted (`#78716c`). Use standalone component with individual Ionic imports."

"Design a family member list: `ion-list` with `ion-item` rows on Clean Surface. Each row has a 32px avatar circle (terracotta `#c7724e` background, white initials at 600 weight), name at 16px/400 in Warm Dark, role at 14px/400 in Stone Muted. 12px gap between avatar and text. Borders use `--ion-border-color` (`#e5e2dc`)."

"Build an account page: `ion-content` with centered profile section — 64px avatar circle (terracotta background, 20px/600 white initials), name at 20px/600, email at 14px/400 in Stone Muted. 4px gap between name and email, 12px below avatar. Below: `ion-list` with navigation items (Family, Settings, Help). Sign-out button at bottom with 32px top margin."

"Create a settings list that works in both light and dark mode: use `var(--ion-text-color)` for labels, `var(--hearthly-text-muted)` for descriptions, `var(--ion-item-background)` for row backgrounds, `var(--ion-border-color)` for separators. Never hardcode hex values — the CSS variables handle mode switching automatically."

"Verify dark mode: background shifts to `#0f0e0d`, surfaces to `#1c1a18`, text to `#f5f0eb`, muted text to `#a39e98`, borders to `#2a2725`, primary lightens to `#d4885e`. All grays must stay warm-toned (stone undertone). No cold blue-grays."

"Create a new feature tab: standalone Angular component, Ionic imports from `@ionic/angular/standalone`, register icons via `addIcons()` in constructor. Scoped SCSS using `var(--ion-color-*)` and `var(--hearthly-*)` tokens. `data-testid` on all interactive elements. Test with `provideRouter([])` in test providers."

### Iteration Guide

- Always specify warm-toned colors by name — "use Stone Muted (`#78716c`)" not "make it gray"
- Specify Ionic components explicitly — "`ion-card` with 14px radius" not "a card component"
- Reference CSS variable tokens — `var(--ion-color-primary)` not `#c7724e` in SCSS
- For cards, use the whisper shadow defined in `styles.scss` via `--box-shadow` — do not add other shadow values. For all other elements, use no shadow
- The warm background is non-negotiable — always "on Warm Stone (`#f8f7f5`)" or "on near-black (`#0f0e0d`)"
- Check both modes — every component must work in light and dark by using CSS variables, not hardcoded colors

### Framework Notes for AI Agents

- **This is an Ionic 8 app**, not a plain HTML/CSS app. Always use `ion-*` components for structure.
- **Standalone components only** — no NgModules. Each component declares its own `imports: [IonContent, IonCard, ...]`.
- **CSS variables are the theming mechanism.** All Ionic components inherit from `--ion-color-*` variables. Changing `variables.scss` changes the entire app.
- **Token source of truth:** `apps/hearthly-app/src/theme/variables.scss`
- **Architecture decisions:** `docs/frontend-design.md` (why Ionic, why bottom tabs, app icon direction)
- **Icon registration pattern:** `addIcons({ iconName })` in constructor, then `<ion-icon name="icon-name">` in template.
