# IRONLOG - Complete Application Architecture & Knowledge Transfer

## Context

This document provides a full knowledge transfer of the IRONLOG fitness tracker — a production PWA (Progressive Web App) for powerlifting and nutrition tracking. The app is live at **ironlog.space**, currently at v9.0.0 (frontend) / v11.0.0 (API).

---

## 1. What Is This App?

IRONLOG is an **offline-first, privacy-focused fitness tracker** that works as an installable PWA on iOS, Android, and desktop. It covers:

- Workout logging (exercises, sets, weight, reps, RPE)
- Nutrition tracking (meals, macros, barcode scanning)
- Body metrics (weight, body fat %, measurements)
- Progress photos & video
- AI Coach (adaptive workout generation)
- Social features (friends, feed, DMs, groups)
- Gamification (XP, badges, duels, rivals, weekly wars)
- Admin dashboard (user management, analytics, moderation)

---

## 2. Tech Stack Overview

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | React 18 + Vite 6 | Plain JSX, no TypeScript |
| **State** | `useReducer` | Redux-like pattern, no external lib |
| **Charts** | Recharts | Line, bar, area, pie charts |
| **Styling** | Inline CSS + CSS vars | No Tailwind/CSS modules — dual dark/light theme |
| **PWA** | Custom service worker | Offline-first, background sync, push notifications |
| **Backend** | Vercel Serverless Functions | ~9 API handlers in .mjs/.js |
| **Database** | Supabase PostgreSQL | Free tier (500MB, 50K MAUs) |
| **Media Storage** | Cloudflare R2 | Free tier (10GB) |
| **Email** | Resend | Free tier (3K/month) |
| **Error Tracking** | Sentry | Client-side error capture |
| **Hosting** | GitHub Pages (frontend) | Auto-deploy via GitHub Actions on push to `main` |
| **Domain** | ironlog.space | Custom CNAME |

**Only 3 npm dependencies:** `react`, `react-dom`, `recharts`
**Only 3 dev dependencies:** `@vitejs/plugin-react`, `vite`, `vite-plugin-pwa`

---

## 3. Project File Structure

```
Ironlog/
├── index.html                  # HTML entry point
├── package.json                # 3 deps + 3 devDeps
├── vite.config.js              # Vite + inline CSS plugin
├── CNAME                       # ironlog.space
├── .github/workflows/deploy.yml # CI/CD → GitHub Pages
│
├── public/
│   ├── sw.js                   # Service worker (caching, push, background sync)
│   ├── manifest.json           # PWA manifest (installable, shortcuts, share target)
│   ├── icon.svg/192/512.png    # App icons
│   ├── offline.html            # Offline fallback page
│   └── 404.html                # SPA fallback for GitHub Pages
│
├── src/
│   ├── main.jsx                # Entry: renders <App/> + SW registration
│   ├── App.jsx                 # Root component (1,295 lines) — routing, state, layout
│   ├── index.css               # Global styles, accessibility, safe areas
│   │
│   ├── components/
│   │   ├── ui.jsx              # Shared UI: Button, Card, Sheet, Field, Chip, ExercisePicker, Toasts
│   │   ├── dialogs.jsx         # RestTimer, FoodSearch, BarcodeScanner, PlateCalc, CheckinModal
│   │   ├── Icons.jsx           # 40+ inline SVG icons
│   │   └── ErrorBoundary.jsx   # Crash handler with emergency data export
│   │
│   ├── tabs/                   # Feature modules (each is a "page")
│   │   ├── HomeTab.jsx         # Dashboard — greeting, streak, today's plan, readiness
│   │   ├── WorkoutTab.jsx      # Log workouts — exercises, sets, timer, rating
│   │   ├── NutritionTab.jsx    # Log meals — food search, barcode scan, macro rings
│   │   ├── BodyTab.jsx         # Log weight, body fat, measurements
│   │   ├── CalendarTab.jsx     # Monthly calendar showing workout schedule
│   │   ├── AnalyticsTab.jsx    # Charts — progression, volume, muscle heatmap, strength
│   │   ├── SettingsTab.jsx     # Preferences, backup/restore, account, privacy
│   │   ├── Onboarding.jsx      # 8-step setup wizard (new users)
│   │   ├── hubs.jsx            # LogHub, TrackHub, PlanHub — landing pages
│   │   ├── features.jsx        # 18 advanced features (3,513 lines)
│   │   ├── social.jsx          # Social module (3,241 lines)
│   │   ├── gamification.jsx    # XP, badges, duels, rivals, weekly wars (1,691 lines)
│   │   └── admin.jsx           # Admin panel (3,001 lines)
│   │
│   ├── state/
│   │   └── reducer.js          # Central state reducer — all app actions
│   │
│   ├── utils/
│   │   ├── auth.js             # AuthToken, SessionManager (PIN + session tokens)
│   │   ├── sync.js             # CloudSync (push/pull), SocialAPI, SyncQueue
│   │   ├── storage.js          # localStorage wrapper (LS), encrypted storage, cookies
│   │   ├── helpers.js          # Date formatting, unit conversion, calc1RM, etc.
│   │   ├── theme.js            # Dark/Light themes (V object), haptic feedback
│   │   ├── share.js            # Shareable image/card generation
│   │   ├── sentry.js           # Error tracking wrapper
│   │   └── undo.js             # Undo state management
│   │
│   └── data/                   # Static datasets
│       ├── exercises.js        # Exercise database (names, categories, muscles)
│       ├── foods.js            # 200+ food items (cal, protein, carbs, fat)
│       ├── badges.js           # Badge definitions and unlock criteria
│       ├── ranks.js            # XP rank tiers and thresholds
│       ├── templates.js        # Workout templates
│       └── demo.js             # Demo data for onboarding
```

---

## 4. How the App Works (Architecture Deep Dive)

### 4a. Routing — Tab-Based Navigation (No React Router)

There is **no React Router**. Navigation uses a `tab` field in state:

```javascript
dispatch({ type: "TAB", tab: "log_workout" })
```

The bottom nav has 6-7 tabs: **Home, Log, Track, Plan, Social, Settings** (+ Admin if authorized). Each has sub-pages accessed via hub screens. Hash routing (`#log_workout`) enables deep linking and browser back/forward.

**40+ total routes** organized under hub categories (log, track, plan, social, admin).

### 4b. State Management — useReducer

All state lives in a single `useReducer` in `App.jsx`:

```javascript
const [s, d] = useReducer(reducer, initialState);
```

**Core state shape:**
- `workouts[]`, `nutrition[]`, `body[]` — user data arrays
- `photos[]`, `checkins[]`, `milestones[]`, `phases[]`, `injuries[]` — supplementary data
- `exercises[]` — exercise database (customizable)
- `goals{}`, `schedule{}`, `profile{}` — user settings
- `units` — "lbs" or "kg"
- `tab` — current page
- `a11y` — accessibility prefs (largeText, highContrast, reduceMotion)

**Key actions:** ADD_W, EDIT_W, DEL_W (workouts), ADD_N/EDIT_N/DEL_N (nutrition), ADD_B/EDIT_B/DEL_B (body), GOALS, UNITS, SET_PROFILE, IMPORT, INIT, etc.

### 4c. Data Persistence — 3-Tier Storage

```
Memory (React state)
  ↓ useEffect
localStorage (ft-w, ft-n, ft-b, etc.)
  ↓ debounced (3s)
Cloud (Supabase via Vercel API)
  ↓ on failure
IndexedDB (offline sync queue)
```

1. **Every state change** is saved to localStorage immediately
2. **CloudSync.debouncedPush()** waits 3s, then POSTs full state to `/api/sync/push`
3. **On failure** items are queued in IndexedDB, retried by service worker background sync
4. **Reconciliation** runs every 4 hours via `/api/sync/reconcile`

### 4d. Authentication Flow

**PIN-based auth** (no OAuth, no passwords):

1. **Sign up:** User creates account with email + 6-digit PIN during onboarding
2. **Email verification:** 6-digit code sent via Resend, confirmed client-side
3. **Session:** 30-day device-scoped token stored in localStorage + cross-domain cookie
4. **Sign in on new device:** Email + PIN → pull all data from cloud
5. **PIN reset:** Email code → short-lived reset token → set new PIN
6. **Security:** bcrypt-hashed PINs, 5-attempt lockout (15 min), rate-limited

### 4e. Backend API (Vercel Serverless)

**Base URL:** `https://api.ironlog.space`

| Endpoint | Purpose |
|----------|---------|
| `POST /api/users` | User registration |
| `POST /api/auth/session` | Login, logout, verify email, reset PIN |
| `POST /api/sync/push` | Push all user data to cloud |
| `POST /api/sync/pull` | Restore data on new device |
| `POST /api/sync/reconcile` | Compare client vs server record counts |
| `POST /api/social` | Friends, feed, DMs, groups, notifications |
| `POST /api/photos/upload` | Upload photos/video to Cloudflare R2 |
| `POST /api/push` | Web Push subscription + notification triggers |
| `POST /api/admin` | Admin dashboard, user mgmt, moderation, analytics |

### 4f. Social Features

- **Friends:** Send/accept via friend codes (IRON-XXXX)
- **Feed:** Activity stream with emoji reactions
- **DMs:** Real-time-ish messaging (15s polling, push notifications)
- **Groups:** Create/join groups with group chat
- **Leaderboard:** XP-based rankings
- **Polling:** `checkMessages()` every 15s (60s when tab hidden)

### 4g. Gamification System

- **XP:** Earned from workouts, nutrition logging, streaks, missions
- **Ranks:** Tiered system with thresholds (defined in `ranks.js`)
- **Badges:** ~20+ unlockable badges based on achievements (`badges.js`)
- **Missions:** Daily/weekly challenges with XP rewards
- **Duels:** 1v1 challenges between users
- **Rivals:** Persistent rivalries with stat tracking
- **Weekly Wars:** Group competitions
- **Streak Shields:** Up to 3 shields to protect streaks

### 4h. PWA & Offline Support

**Service Worker** (`public/sw.js`):
- **Cache strategies:** Network-first for HTML, cache-first for CDN assets, stale-while-revalidate for others
- **Background sync:** Replays failed API calls when connection returns
- **Push notifications:** DM alerts, group messages
- **Auto-update:** Checks every 5 minutes
- **Offline fallback:** Serves `offline.html` when fully offline

**Manifest features:**
- Installable on all platforms (standalone mode)
- Custom shortcuts (Log Workout, Nutrition, Weigh In, AI Coach)
- Share target (receive shared content)
- File handlers (import JSON/CSV)
- Custom protocol handler (`web+ironlog://`)

### 4i. Theming & Styling

**Inline CSS** throughout — no CSS framework. Two themes in `theme.js`:

- **Dark:** Teal accent (#00f5a0), dark blue background (#08080d)
- **Light:** Emerald accent (#059669), light gray background (#f5f5f7)

Theme object `V` provides: `bg`, `card`, `accent`, `text`, `text2`, `text3`, `danger`, `warn`, `purple`, `font`, `mono`, etc.

**Accessibility:** Large text mode, high contrast mode, reduce motion mode, safe area handling for notched phones.

---

## 5. How to Build an App Like This (Step-by-Step)

### Phase 1: Foundation (Week 1-2)
1. **Scaffold** — `npm create vite@latest` with React template
2. **Set up state** — Create a `useReducer` with initial state shape and basic actions
3. **Build navigation** — Tab-based routing with a bottom nav bar
4. **Create UI components** — Button, Card, Field, Sheet (bottom modal), Toast
5. **Set up localStorage persistence** — Save/load state on every change
6. **Design theme system** — Color variables object, dark/light toggle
7. **Add global CSS** — Reset, font loading, safe areas, scrollbar styling

### Phase 2: Core Features (Week 3-5)
8. **Workout logging** — Exercise picker, set tracking (weight/reps/RPE), timer
9. **Nutrition logging** — Meal sections, food database, macro calculations
10. **Body tracking** — Weight, body fat, measurements with trend lines
11. **Calendar view** — Monthly calendar showing workout schedule
12. **Analytics/Charts** — Recharts integration for progression, volume, trends
13. **Settings page** — Units, goals, profile, export/import
14. **Onboarding wizard** — Multi-step setup for new users

### Phase 3: Backend & Sync (Week 6-8)
15. **Set up Supabase** — Create database tables (users, workouts, nutrition, body, etc.)
16. **Create Vercel serverless functions** — Auth, sync push/pull, user registration
17. **Implement auth** — PIN-based with bcrypt, session tokens, email verification via Resend
18. **Build sync protocol** — Debounced push, pull for restore, reconciliation
19. **Add offline queue** — IndexedDB-backed sync queue with service worker retry
20. **Photo uploads** — Cloudflare R2 integration for media storage

### Phase 4: PWA & Polish (Week 9-10)
21. **Service worker** — Cache strategies, offline fallback, background sync
22. **PWA manifest** — Icons, shortcuts, share target, file handlers
23. **Push notifications** — VAPID keys, subscription management, notification triggers
24. **Error boundary** — Crash recovery with emergency data export
25. **Accessibility** — Large text, high contrast, reduce motion, ARIA labels

### Phase 5: Social Features (Week 11-13)
26. **User profiles** — Username, avatar, bio, public stats
27. **Friend system** — Friend codes, send/accept/block
28. **Activity feed** — Post workout completions, emoji reactions
29. **Direct messages** — Chat UI with polling + push notifications
30. **Groups** — Create/join groups with group chat
31. **Leaderboard** — XP-based rankings

### Phase 6: Gamification (Week 14-15)
32. **XP system** — Award XP for actions, calculate levels
33. **Badges** — Define unlock criteria, award on achievement
34. **Missions** — Daily/weekly challenges
35. **Duels & Rivals** — 1v1 challenges, persistent rivalries
36. **Weekly Wars** — Group competitions

### Phase 7: Advanced Features (Week 16-18)
37. **AI Coach** — Adaptive workout generation based on history
38. **Barcode scanner** — BarcodeDetector API + Open Food Facts
39. **Progress photos** — Before/after comparison
40. **1RM calculator** — Strength estimation formulas
41. **Muscle heatmap** — SVG body diagram with volume analysis
42. **Admin panel** — Dashboard, user management, moderation, analytics

### Phase 8: Production (Week 19-20)
43. **CI/CD** — GitHub Actions deploy to GitHub Pages
44. **Error tracking** — Sentry integration
45. **Performance** — Inline CSS plugin, code splitting, asset caching
46. **Security** — Rate limiting, PIN lockout, CORS, RLS
47. **Testing** — E2E tests

---

## 6. Estimated Build Timeframes

| Scope | Solo Developer | Small Team (2-3) |
|-------|---------------|-------------------|
| **Core app** (workout/nutrition/body tracking + localStorage) | 3-4 weeks | 2 weeks |
| **+ Backend & cloud sync** (auth, Supabase, Vercel) | +3-4 weeks | +2 weeks |
| **+ PWA** (service worker, offline, push notifications) | +2 weeks | +1 week |
| **+ Social features** (friends, feed, DMs, groups) | +3-4 weeks | +2 weeks |
| **+ Gamification** (XP, badges, duels, wars) | +2 weeks | +1 week |
| **+ Advanced features** (AI coach, barcode, admin, photos) | +3-4 weeks | +2 weeks |
| **+ Polish & production** (error handling, a11y, CI/CD, testing) | +2 weeks | +1 week |
| **TOTAL** | **18-22 weeks (~5 months)** | **11-13 weeks (~3 months)** |

**Notes:**
- Assumes a developer familiar with React and serverless
- The social and gamification layers add ~40% of total effort
- A stripped-down version (core tracking + local storage only) could ship in **3-4 weeks**
- The all-free-tier infrastructure keeps costs at **$0/month** up to moderate scale

---

## 7. Key Architecture Decisions & Why

1. **No TypeScript** — Faster iteration, smaller bundle, simpler tooling
2. **No React Router** — Tab-based state is simpler for mobile-first apps
3. **useReducer over Redux/Zustand** — Zero dependencies, sufficient for single-page state
4. **Inline CSS over Tailwind** — No build step for styles, full control via theme object
5. **localStorage + cloud sync** — Offline-first: app works without internet, cloud is backup
6. **PIN auth over passwords/OAuth** — Simpler UX for a fitness app, fast mobile entry
7. **Vercel serverless** — No server to maintain, free tier covers most usage
8. **Monolithic feature files** — Large files (3K+ lines) but keeps related code together

---

## 8. Running Locally

```bash
npm install
npm run dev        # Dev server on port 3000
npm run build      # Production build to dist/
npm run preview    # Preview production build
```
