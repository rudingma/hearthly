# Hearthly — Frontend Design Decisions

> UI architecture and conventions for the Hearthly Angular + Ionic frontend.

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
- **Desktop:** `ion-split-pane` pins a sidebar (>992px) with the same navigation items. Tab bar hides via CSS media query.

**Why not side menu (hamburger):** The traditional hamburger drawer is an outdated mobile pattern. Modern apps use bottom tabs for primary navigation and handle secondary items via profile/avatar access.

**Why not "More" tab:** Burns a tab slot for a junk drawer. Users learn to ignore it.

**Home as a future hub:** The home tab is currently a simple greeting card + empty state. As features are added, it can evolve into a dashboard with quick-action shortcuts (like Revolut's home screen). This is a future feature decision, not a shell decision.

---

## Visual Direction

**Terracotta on warm neutrals.** "Hearth" = fireplace, home, warmth. The palette nods to the brand name without committing to any feature direction (not "finance blue" or "calendar green").

**Principle:** The shell is a neutral container. The accent color gives identity; the surfaces stay clean.

### Design Tokens

Defined in `apps/hearthly-app/src/theme/variables.scss` as Ionic CSS variables.

| Token | Light | Dark | Usage |
|---|---|---|---|
| primary | `#c7724e` | `#d4885e` | Buttons, active tab, avatar, links |
| primary-shade | `#a3572e` | `#c7724e` | Pressed/hover states |
| primary-tint | `#d4885e` | `#e8a67a` | Subtle accents |
| background | `#f8f7f5` | `#0f0e0d` | Page background |
| surface | `#ffffff` | `#1c1a18` | Cards, header, tab bar |
| border | `#e5e2dc` | `#2a2725` | Dividers, card borders |
| text | `#1c1917` | `#f5f0eb` | Primary text |
| text-muted | `#78716c` | `#a39e98` | Secondary text, labels |

**Typography:** System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', ...`). No custom fonts — native feel, zero loading.

**Shape:** Cards 14px border-radius, buttons/inputs 12px, avatars 50% (circle).

### Dark Mode

Follows system preference via `@media (prefers-color-scheme: dark)`. No manual toggle yet — planned for a future settings page. The token structure supports adding a class-based toggle without changes.

Warm-tinted grays (not cold blue-grays) maintain visual coherence in both modes.

---

## App Icon Direction

**Home Glow:** A house with a glowing doorway on a terracotta gradient background. Communicates "household app" immediately. Currently an SVG concept — to be refined into a proper vector asset.

**Existing apps with similar names:** "Hearthly" by Foxxception (iOS, cleaning app) and "Heartly" (Android, heart monitor). Our visual direction is distinct from both. App Store naming is a future concern.

---

## Component Conventions

### Standalone Components

All components use Angular standalone components (no NgModules). Each component declares its own imports.

```typescript
@Component({
  selector: 'app-example',
  imports: [IonContent, IonCard, ...],  // Ionic components imported individually
  templateUrl: './example.component.html',
  styleUrl: './example.component.scss',
})
export class ExampleComponent { }
```

### Ionic Standalone Imports

Each Ionic component must be imported individually from `@ionic/angular/standalone`:

```typescript
import { IonContent, IonCard, IonButton } from '@ionic/angular/standalone';
```

Icons are registered via `addIcons()` in the constructor:

```typescript
import { addIcons } from 'ionicons';
import { homeOutline, settingsOutline } from 'ionicons/icons';

constructor() {
  addIcons({ homeOutline, settingsOutline });
}
```

### Project Structure (Frontend)

Angular-idiomatic feature-based folders directly under `app/`:

```
app/
  welcome/          → Login screen (public, outside shell)
  shell/            → Authenticated layout (tabs + header + split-pane)
    header/         → Toolbar with avatar
  home/             → Home tab
  budget/           → Budget tab (placeholder)
  lists/            → Lists tab (placeholder)
  calendar/         → Calendar tab (placeholder)
  account/          → Account page (full-screen, outside tabs)
  auth/             → Auth service, guard, config
  theme/
    variables.scss  → Design tokens
```

**Feature folders by domain**, not by type. No `components/`, `services/`, `shared/` directories. Sub-features nest inside their parent domain folder. What appears as a tab is configured in the routes, not implied by folder location.

### Routing

```
/                → WelcomeComponent (public)
/app             → Auth-guarded zone
  /app/home      → HomeComponent (default tab, inside shell)
  /app/budget    → BudgetComponent (tab, inside shell)
  /app/lists     → ListsComponent (tab, inside shell)
  /app/calendar  → CalendarComponent (tab, inside shell)
  /app/account   → AccountComponent (full-screen, outside shell)
```

- `ShellComponent` is eagerly imported (Ionic tabs need routes at resolution time)
- Tab pages use `loadComponent` for lazy loading
- Account is a sibling of the shell, not a child — avoids double-header

---

## Testing

- **Framework:** Vitest (NOT Jasmine) via `@angular/build:unit-test`
- **Signal mocking:** Use real `signal()` and `computed()` from `@angular/core` in mocks — not `vi.fn()` as signal replacements
- **Ionic in tests:** Requires a postinstall ESM patch (`scripts/patch-ionic-esm.mjs`) for `@ionic/core` compatibility with Vitest
- **Router in tests:** Components using `routerLink` or `Router` need `provideRouter([])` in test providers

### Mock Pattern

```typescript
import { signal, computed } from '@angular/core';

const mockAuthService = {
  currentUser: signal({ name: 'Test', email: 'test@test.com', id: '1' }),
  isAuthenticated: computed(() => true),
  initials: computed(() => 'T'),
  isLoading: signal(false),
  error: signal<string | null>(null),
  login: vi.fn(),
  logout: vi.fn(),
};
```
