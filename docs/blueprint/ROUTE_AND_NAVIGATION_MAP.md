# Zyrbit Route and Navigation Map

---

## 1. Global Navigation Architecture

The approved Zyrbit navigation architecture establishes a clean **5-anchor primary navigation** on mobile and a matching **widescreen sidebar** on desktop:

```
[Mobile Bottom Bar]
├── 1. Home       (/)       ─── Daily Command Center
├── 2. Track      (/track)   ─── Unified Growth, Health, Wealth Hub
├── 3. Quick Add  (Elevated) ─── Fast Logging Launcher Modal
├── 4. Insights   (/insights)─── Cross-Domain Trends & Patterns
└── 5. Your Space (/space)   ─── Profile, Preferences & Security

[Desktop Sidebar]
├── Brand Header (Z Logo + ZYRBIT PERSONAL OS)
├── Primary Links: Home, Track, Insights, Your Space
├── Track Domain Shortcuts: Growth, Health, Wealth
├── Primary Action: [+ Quick Add Record] Button
└── Dex Proactive Assistant: Right-hand persistent drawer
```

---

## 2. Route Switchboard & Compatibility Mapping

To preserve complete backward compatibility and avoid breaking any existing bookmarks, PWA launch URLs, or internal callbacks, all existing routes are preserved as direct endpoints or permanent canonical aliases:

| Conceptual Screen | Target Route | Existing Code Route | Backward-Compatible Resolution Strategy |
| :--- | :--- | :--- | :--- |
| **Home** | `/` | `/zenith` | Both `/` and `/zenith` render the unified Home command center. |
| **Track Hub** | `/track` | New route | New `/track` hub screen displaying the 3 domain cards with deep links to `/growth`, `/health`, `/food`, `/wealth`. |
| **Growth Workspace** | `/growth` | `/growth` | Direct access preserved; deep-linked from Track. |
| **Food Workspace** | `/food` | `/food` | Direct access preserved; deep-linked from Track / Health. |
| **Health Workspace** | `/health` | `/health` | Direct access preserved; deep-linked from Track. |
| **Wealth Workspace** | `/wealth` | `/wealth` | Direct access preserved; deep-linked from Track. |
| **Quick Add** | Bottom Sheet | `?quickAdd=true` / modal | Global overlay triggerable from anywhere without route change. |
| **Insights** | `/insights` | `/stats` (redirect) | `/insights` is canonical; `/stats` redirects to `/insights`. |
| **Your Space** | `/space` | `/profile` | Both `/space` and `/profile` render the unified user space. |
| **Dex AI Workspace** | `/dex` / modal | `/zenith?openDex=true` | Triggerable via global event `dexos:open-dex`, `⌘K`, or `/dex`. |
| **Showcase Frame** | `/showcase` | `/showcase` | Dedicated 5-screen side-by-side presentation view. |
| **Splash Screen** | `/splash` | App unauth state | Handled by `App.jsx` authentication gate. |
| **Welcome Screen** | `/welcome` | App unauth state | Handled by `App.jsx` authentication gate. |
| **Login / Signup** | `/login` | App unauth state | Handled by `App.jsx` authentication gate. |
| **Goal Setup** | `/goal-setup` | App post-signup state | Handled by `App.jsx` onboarding gate. |

---

## 3. Navigation Transition & Context Preservation Rules

1. **Context-Preserving Quick Add**:
   Opening Quick Add must **never unload or unmount the current route**. It renders as a lightweight bottom sheet (or centered dialog on desktop) layered on top of the active page. Closing Quick Add returns the user directly to their work with zero state loss.

2. **Domain Deep-Linking**:
   When a user clicks `Open Growth →` from `/track`, the application navigates to `/growth`. When the user taps the `Track` tab in the bottom navigation bar while on `/growth`, the app smoothly returns to `/track`.

3. **Dex AI Drawer / Overlay**:
   Dex can be summoned from any screen using `⌘K`, the Quick Add `Ask Dex` chip, or the desktop right-hand panel. Dex queries receive the active screen's context (e.g. current task ID, selected date, or active expense filter) so Dex can provide context-aware assistance without asking redundant questions.

4. **Offline Resilience**:
   If the user navigates while offline, the app displays the subtle non-blocking `Offline Banner` without crashing or showing a blank page.
