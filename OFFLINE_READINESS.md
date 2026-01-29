# Offline Readiness Report

## Summary

**The app is not fully offline ready.** Features and data work offline (in-memory), but **fonts and icons depend on the network**. Avatar images in meetings also load from external URLs.

---

## 1. Icon fonts — **online dependent**

### Where

- **`src/index.html`** (lines 10–12): All fonts and the icon font are loaded from Google Fonts CDN:

```html
<link
  href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:...&family=Material+Symbols+Outlined:..."
  rel="stylesheet" />
```

- **Icon usage:** The app uses **Material Symbols Outlined** via the class `material-symbols-outlined` and icon names as text (e.g. `<span class="material-symbols-outlined">search</span>`). This font is loaded by the same Google Fonts link.

### Impact

- **Offline:** The browser cannot load `fonts.googleapis.com` (and the underlying `fonts.gstatic.com` font files). Icon glyphs will not render; you get empty squares or fallback characters. Text that uses the loaded families (Inter, JetBrains Mono, etc.) will fall back to system fonts.

### Recommendation

To make icons offline-ready:

1. **Self-host Material Symbols Outlined**
   - Download the font (e.g. from [Google Fonts GitHub](https://github.com/google/fonts/tree/main/ofl/materialsymbolsoutlined)) or use a package like `material-symbols`.
   - Add the font files under `src/assets/fonts/` (or `public/fonts/`).
   - In `src/index.html`, remove the Google Fonts `<link>` for Material Symbols and add a local `@font-face` in `src/styles.css` pointing to those files.

2. **Or use local SVG icons**
   - Replace `<span class="material-symbols-outlined">icon_name</span>` with an SVG icon component or inline SVGs bundled with the app. Then no icon font is needed from the network.

---

## 2. Text fonts — **online dependent**

### Where

- Same **`src/index.html`** link loads:
  - **Inter**
  - **JetBrains Mono**
  - **Courier Prime**
  - **Atkinson Hyperlegible**

### Impact

- **Offline:** These requests fail; the browser uses fallbacks (e.g. `--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif` becomes system sans-serif). Layout and functionality still work; only typography changes.

### Recommendation

- **Self-host these fonts** (e.g. under `src/assets/fonts/` or `public/fonts/`), define `@font-face` in `src/styles.css` with `url('./assets/fonts/...')` (or equivalent), and remove the Google Fonts `<link>` so all text is offline-ready.

---

## 3. Avatar images (meetings) — **online dependent**

### Where

- **`src/app/services/meetings.service.ts`**: Mock attendees use `avatar` URLs like `https://lh3.googleusercontent.com/...`.
- **Templates** (e.g. `meetings.component.html`): `[style.backgroundImage]="attendee.avatar ? 'url(' + attendee.avatar + ')' : ''"` with fallback `{{ attendee.name.charAt(0) }}` when there is no avatar.

### Impact

- **Offline:** Requests to `lh3.googleusercontent.com` fail. The initial shows only when `attendee.avatar` is falsy; if `avatar` is set but the image fails to load, the user may see a broken image or empty area unless you handle `onerror` (e.g. clear avatar or show initial).

### Recommendation

- For full offline readiness: either do not set `avatar` for offline use, or use a **local default image** / **data URI** / **blob** stored in the app, and use the same fallback (e.g. initial) when the URL fails (`onerror`).

---

## 4. What is already offline-ready

| Area | Status |
|------|--------|
| **App logic & routing** | No runtime HTTP calls for app shell or navigation. Router uses local routes. |
| **Data (tasks, meetings, books, snippets, etc.)** | In-memory (signals/services). No backend API; all CRUD is local. |
| **Bin / soft delete** | In-memory; offline-ready. |
| **Styles (CSS)** | `src/styles.css` and component CSS use local vars and no external `url()`. `tasks.component.css` only has a local `@import` for `modal-form.css`. |
| **Assets** | `angular.json` only includes `public` (e.g. `favicon.ico`); no external asset URLs. |
| **Snippets “fetch”** | The `fetch(url)` in `snippets.service.ts` is **sample code string content** inside a snippet, not runtime; no network call. |
| **app.component subscribe** | `.subscribe()` is on **router.events**, not HTTP; offline-ready. |

---

## 5. Service worker / PWA

- **`@angular/service-worker`** is in `package.json` but **not** configured in `angular.json` (no `serviceWorker` in build options, no `ngsw-config.json`).
- So the app is **not** cached as a PWA when offline; the only issue is loading the app (and then fonts/icons/avatars as above).

---

## 6. Checklist to be fully offline-ready

- [ ] Remove Google Fonts `<link>` from `index.html`.
- [ ] Self-host **Material Symbols Outlined** (or replace with local SVG icons) and load via local `@font-face` or components.
- [ ] Self-host **Inter**, **JetBrains Mono**, and any other text fonts you care about, and load via local `@font-face`.
- [ ] For meeting avatars: use local placeholders or handle failed loads (e.g. `onerror` → show initial only).
- [ ] (Optional) Add Angular service worker and `ngsw-config.json` to cache the app and assets for true offline-first loading.

Once fonts and icons are self-hosted (or replaced with local SVGs) and avatars are handled as above, **all features and elements can be offline-ready**; the only remaining dependency on the network is the initial load unless you add a service worker.
