# Hearthly — Frontend Design Decisions

> Architectural decision records for the Hearthly Angular + Ionic frontend.
>
> **Visual design system:** See [`DESIGN.md`](../DESIGN.md) at the project root — colors, typography, components, elevation, and AI agent prompt guide.
> **Code conventions:** See [`apps/hearthly-app/CLAUDE.md`](../apps/hearthly-app/CLAUDE.md) — standalone components, routing, testing, GraphQL codegen.

---

## Decision: Ionic

**Chosen over:** Tailwind + headless components, Angular Material, custom CSS-only

**Why Ionic:**

- **Mobile-first with Capacitor integration.** Hearthly targets mobile primarily. Ionic provides native-feeling navigation patterns (tabs, gestures, pull-to-refresh, swipe-back) that map directly to Capacitor. Tailwind or Material would require building all of these from scratch.
- **Adaptive layout built-in.** `ion-split-pane` handles desktop sidebar vs mobile tabs automatically. No custom responsive code for the primary navigation.
- **Platform-adaptive styling.** Ionic renders iOS-style on iOS and Material-style on Android automatically.
- **CSS variable theming.** All Ionic components inherit theme via `--ion-color-*` variables. One file controls the entire look.

**Why not Tailwind:**

- The main Tailwind mobile component library (Konsta UI) does not support Angular. Every mobile pattern (bottom nav, side drawer, pull-to-refresh) would be DIY.
- Tailwind is great for styling custom content, but provides no structural components.

**Why not Angular Material:**

- Desktop-first by design. Missing bottom navigation, pull-to-refresh, swipe gestures, and safe-area handling — all essential for mobile.

**Trade-off accepted:** Ionic adds ~300-400KB to the bundle (raw). Compressed transfer size is ~160KB, which is acceptable for a full mobile framework.

---

## Navigation Pattern

**Bottom tabs + header avatar.** The universal modern mobile pattern (YouTube, Spotify, Google Maps).

- **4 bottom tabs:** Home, Budget, Lists, Calendar — the core daily features. Tab count may change as features evolve.
- **Header avatar:** Top-right corner, shows user initials. Navigates to a full-screen account page. No hamburger menu.
- **Account page:** Outside the tab system. Has its own header with back button. Contains profile info, Family, Settings, Help, Sign out.
- **Desktop:** `ion-split-pane` pins a sidebar (>=993px) with the same navigation items. Tab bar hides via CSS media query.

**Why not side menu (hamburger):** The traditional hamburger drawer is an outdated mobile pattern. Modern apps use bottom tabs for primary navigation and handle secondary items via profile/avatar access.

**Why not "More" tab:** Burns a tab slot for a junk drawer. Users learn to ignore it.

**Home as a future hub:** The home tab is currently a simple greeting card + empty state. As features are added, it can evolve into a dashboard with quick-action shortcuts (like Revolut's home screen). This is a future feature decision, not a shell decision.

---

## App Icon Direction

**Home Glow:** A house with a glowing doorway on a terracotta gradient background. Communicates "household app" immediately. Currently an SVG concept — to be refined into a proper vector asset.

**Existing apps with similar names:** "Hearthly" by Foxxception (iOS, cleaning app) and "Heartly" (Android, heart monitor). Our visual direction is distinct from both. App Store naming is a future concern.
