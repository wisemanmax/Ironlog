# IRONLOG v4.0

**Complete workout, nutrition, and body tracking PWA — offline-first, privacy-focused, free forever.**

## Features

### Core Tracking
- **Workout Logger** — 85+ exercises with searchable picker, sets, reps, weight, RPE, duration, rating, notes. Edit existing workouts. PR auto-detection.
- **Nutrition Logger** — 500+ food database, barcode scanner (OpenFoodFacts), meal breakdown, custom foods, copy yesterday's meals in one tap.
- **Body Metrics** — weight, body fat %, chest, waist, arms, thighs with trend charts.
- **Progress Photos** — compressed to ~100KB JPEG, cloud synced, visual timeline.

### Intelligence
- **Adaptive Coach** — daily program based on schedule, progressive overload suggestions per exercise.
- **Readiness System** — daily check-ins (soreness, energy, motivation, sleep) → composite 0-100 readiness score.
- **Goal Engine** — milestones with type, target, deadline tracking and completion.
- **Data Integrity Guard** — pre-save validation (flags >800lb lifts, >8000cal days, >20lb weight jumps), outlier detection, duplicate detection.
- **Phase Tracking** — tag cut/bulk/maintain/strength/deload blocks, compare outcomes across phases.
- **Injury Awareness** — flag pain by joint (shoulder, knee, lower back, elbow, wrist, hip), auto-maps affected exercises with alternatives.
- **Exercise Substitution** — find alternatives by movement pattern and muscle group for 85+ exercises.

### Nutrition Tools
- **Fast Food Hacks** — 57 macro-friendly meals from 30 restaurant brands (Chick-fil-A, Chipotle, Taco Bell, Wendy's, Popeyes, and more), all under 600 calories. Search, filter by brand, sort by calories or protein. One-tap log to nutrition.
- **Barcode Scanner** — scan product barcodes via camera or manual entry, pulls nutrition from OpenFoodFacts API.
- **Custom Food Entry** — add any food not in the 500+ database with full macro breakdown.

### Social & Reports
- **Workout Proof Cards** — shareable branded image cards generated on canvas.
- **Weekly Summary** — auto-generated report card with workouts, volume, avg calories, protein adherence, sleep, readiness. Shareable.
- **Strength Score** — composite score based on compound lifts relative to bodyweight.
- **Muscle Heat Map** — SVG body visualization showing muscle group training frequency and balance.

### PWA Features
- **Offline-First** — full functionality without internet. IndexedDB sync queue with retry.
- **Cloud Sync** — signed auth tokens validated server-side, per-type sync toggles, background sync retry with exponential backoff.
- **Push Notifications** — workout/check-in/hydration reminders with action buttons. Quiet hours (10pm-7am).
- **Install Funnel** — smart install banner after 3+ visits, platform detection (iOS/Android/desktop), prompt outcome tracking.
- **App Shortcuts** — long-press home icon for quick actions: Log Workout, Log Nutrition, Weigh In, AI Coach.

### Data Safety
- **Server-Side Auth** — every sync request validated with signed token (email match, expiry check, device binding). Unauthorized requests return 401.
- **Pre-Save Validation** — warns on suspicious values before writing to state.
- **Delete Confirmations** — modal confirmation on all destructive actions.
- **Undo System** — 5-second undo toast after any delete with one-tap restore.
- **Edit Existing Entries** — tap any history card to modify workouts, nutrition, or body entries.
- **Privacy Controls** — per-type sync toggles, cloud deletion request, visible sync policy.
- **Error Boundary** — crash recovery with Reload button + emergency data export from localStorage.

### Accessibility
- Semantic landmarks: `<nav>`, `role="main"`, `role="dialog"` on all modals.
- `aria-label` on every icon-only button (delete, edit, close, search, navigation).
- `aria-current="page"` on active nav tab.
- `prefers-reduced-motion` media query kills all animations system-wide.
- In-app toggles: Large Text, High Contrast, Reduce Motion.

### Onboarding
- 5-step setup: Welcome → Units → Training Split → Goals → Profile.
- 7-step feature tour after first signup (skippable, only shows once).
- Auth key generated during onboarding for device binding.

## Architecture

```
Frontend (GitHub Pages)
├── index.html             — Single-file React SPA (~6,300 lines)
├── sw.js                  — Service worker v7: cache, push, background sync, queue
├── manifest.json          — PWA manifest with 4 shortcuts
├── icon.svg               — App icon
├── README.md
├── modules/
│   ├── ironlog-data.js    — Extracted constants (exercises, foods, templates, subs, joints)
│   └── ironlog-logic.js   — Extracted pure functions (calc, validate, readiness, strength)
└── tests/
    ├── ironlog-tests.html — Test runner (open in browser)
    ├── ironlog-tests.js   — 30+ assertions across 8 test groups
    ├── ironlog-data.js    — Data module copy for tests
    └── ironlog-logic.js   — Logic module copy for tests

Backend (Vercel Serverless)
├── api/sync/push.js       — Auth-validated upsert to 9 Supabase tables
├── api/sync/pull.js       — Auth-validated fetch for cloud restore
├── api/users/create.js    — User registration
├── api/users/update.js    — Profile updates
├── package.json           — type: module, supabase-js dependency
├── vercel.json            — CORS headers, routing
└── setup-all-tables.sql   — Complete database setup script

Database (Supabase/Postgres)
├── users                  — Profile, consent, IP tracking
├── workouts               — Exercises as JSONB, date, duration, rating
├── nutrition              — Macros, meals as JSONB, water, sleep
├── body_measurements      — Weight, bf%, chest, waist, arms, thighs
├── progress_photos        — Compressed base64 JPEG
├── checkins               — Daily readiness: soreness, energy, motivation, sleep
├── milestones             — Goals with type, target, deadline, completion
├── user_settings          — Goals, schedule, exercises, units as JSONB
└── sync_log               — Push/pull audit trail with timestamps
```

### Sync Flow
1. User saves data → localStorage updates immediately
2. 3-second debounce → signed push to `/api/sync/push`
3. Server validates auth token → upserts to Supabase tables
4. On network failure → payload queued in IndexedDB
5. Queue: compaction (keep latest only), 24hr TTL, max 5 retries, exponential backoff
6. Background Sync API fires on reconnect → auto-retry
7. Pull on restore → merges with deduplication by ID

### Auth Flow
1. Onboarding generates device-specific auth key → `ft-auth-key` in localStorage
2. Every sync request includes `X-Auth-Token` header with signed payload
3. Server decodes and validates: email match, expiry (1hr + 5min grace), clock skew check
4. Invalid tokens → `401 Unauthorized` with reason
5. Valid tokens → proceed to Supabase operations

## Deployment

### Frontend (GitHub Pages)
1. Push `index.html`, `sw.js`, `manifest.json`, `icon.svg`, `README.md` to your GitHub Pages repo
2. Hard refresh to clear old service worker (new SW auto-busts cache with timestamp)

### Backend (Vercel)
1. Set environment variables in Vercel project settings:
   - `SUPABASE_URL` — your project URL (https://xxxxx.supabase.co)
   - `SUPABASE_SERVICE_KEY` — service_role key (starts with eyJ...)
2. Push `api/` folder + `package.json` + `vercel.json` to Vercel-connected GitHub repo
3. Verify: `https://your-api.vercel.app/api/sync/push` should return 405 on GET (not 404)

### Database (Supabase)
1. Go to Supabase Dashboard → SQL Editor
2. Paste and run entire contents of `setup-all-tables.sql`
3. Verify: 9 tables created with RLS policies

## Running Tests
1. Open `tests/ironlog-tests.html` in any browser
2. Open DevTools → Console
3. Tests auto-run: 30+ assertions across calc1RM, calcPlates, date helpers, unit conversion, workout validation, nutrition validation, readiness score, strength score, muscle heat map, streak logic

## Known Limitations
- iOS PWA notifications are limited (Apple restricts background triggers in Safari)
- BarcodeDetector API not available in Safari — falls back to manual entry with camera open as visual reference
- Photos > 800px are downscaled to JPEG 70% quality (~80-120KB) for sync and localStorage compatibility
- Single-file architecture — works but modules extracted for future splitting
- Auth is device-bound (not account-based) — losing localStorage loses the auth key (re-onboarding regenerates)
- Fast Food Hacks nutrition data is approximate (based on published restaurant info, actual portions may vary)

## Version History
- **v4.0** — Server-side auth validation, onboarding feature tour, polished accessibility (landmarks, aria, reduced-motion), Fast Food Hacks (57 meals, 30 brands), code modularization, test harness, delete confirmations + undo, pre-save validation, edit existing entries, exercise search picker, nutrition copy-yesterday, error boundary, quiet hours, SW queue hardening (TTL, backoff, compaction), install analytics, unit consistency fixes
- **v3.5** — 11 features: Readiness, Goals, Coach, Cloud Sync, Social Cards, Offline PWA, Form Check, Data Guard, Phases, Injuries, Substitutions, Privacy Controls, Accessibility toggles, Reminder Engine
- **v3.0** — Cloud sync pipeline, barcode scanner, push notifications, progress photos, photo compression
- **v2.0** — Analytics, calendar, templates, plate calculator, muscle heat map, strength score
- **v1.0** — Core workout/nutrition/body tracking with offline localStorage

---

**Created by Byheir Wise** · [ironlog.space](https://ironlog.space) · [byheir.com](https://byheir.com)
