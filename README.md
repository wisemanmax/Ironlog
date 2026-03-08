# IRONLOG — v11

**Live:** [ironlog.space](https://ironlog.space)  
**Stack:** React (UMD, no build step) · Vercel Serverless · Supabase · Cloudflare R2  
**Architecture:** Single `index.html` frontend + `ironlog-api` repo for all backend logic

---

## What It Is

IRONLOG is a full-featured fitness PWA. Workout tracking, nutrition logging, body metrics, progress photos, a social layer with DMs and challenges, push notifications, gamification (XP, ranks, missions, streaks), and a full admin panel — all in a single HTML file on the frontend.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 UMD, Recharts, inline styles only |
| Backend | Vercel serverless functions (`.mjs`) |
| Database | Supabase (Postgres) |
| Storage | Cloudflare R2 (progress photos/video) |
| Auth | Email + 6-digit PIN, JWT-style session tokens |
| Push | Web Push API + VAPID |
| PWA | Service Worker, Web App Manifest |

---

## File Structure

```
ironlog-repo/
├── index.html          ← Entire frontend (19,640+ lines)
├── sw.js               ← Service worker (offline + push)
├── manifest.json       ← PWA manifest
└── icon.svg

ironlog-api/
├── api/
│   ├── users/
│   │   └── index.mjs   ← Registration + profile fetch  ← UPDATED v11
│   ├── sync/
│   │   └── index.mjs   ← Cloud backup/restore
│   ├── auth/
│   │   ├── session.mjs ← PIN auth, email verify, reset
│   │   └── validate.mjs← JWT validation middleware
│   ├── social/
│   │   └── index.mjs   ← Friends, feed, DMs, duels, wars
│   ├── push/
│   │   └── index.mjs   ← Web push subscribe + broadcast
│   ├── photos/
│   │   └── upload.mjs  ← R2 signed URL generation
│   └── admin/
│       └── index.mjs   ← Platform dashboard, user mgmt, analytics
└── package.json
```

---

## v11 Changes — What's New

### Onboarding: 3 new data points collected + stored in Supabase

| Field | Onboarding Step | DB Column |
|---|---|---|
| Primary Goal | New Step 4 (Build Muscle / Lose Fat / Recomp / Strength / Maintain) | `users.primary_goal` |
| City | Profile step | `users.city` |
| Zip Code | Profile step | `users.zip_code` |

### Onboarding flow restructured (7 steps total)

| Step | Screen |
|---|---|
| 1 | Welcome |
| 2 | Units (lbs/kg) |
| 3 | Training Split |
| **4** | **Primary Goal ← NEW** |
| 5 | Nutrition Targets |
| 6 | Profile (now includes City + Zip) |
| 7 | PIN |

### Progress indicator upgraded
- Replaced dot row with `Step X of Y` label + smooth green gradient progress bar

### API updated
- `POST /api/users` now persists `city`, `zip_code`, `primary_goal` to the `users` table
- GET route unchanged

---

## Deploying v11

**Step 1 — Run the migration in Supabase SQL Editor:**

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS city         TEXT,
  ADD COLUMN IF NOT EXISTS zip_code     TEXT,
  ADD COLUMN IF NOT EXISTS primary_goal TEXT;
```

(Full migration file: `migration-onboarding-v11.sql`)

**Step 2 — Deploy updated API:**
Replace `ironlog-api/api/users/index.mjs` with the new file and push to Vercel.

**Step 3 — Deploy updated frontend:**
Replace `ironlog-repo/index.html` and push to GitHub Pages.

**Order matters:** run the migration before deploying the API, or the insert will fail for new registrations.

---

## Users Table Schema (v11)

```sql
users (
  email               TEXT PRIMARY KEY,
  first_name          TEXT,
  last_name           TEXT,
  nickname            TEXT,
  date_of_birth       TEXT,
  sex                 TEXT,

  -- Location
  state               TEXT,
  city                TEXT,          -- NEW v11
  zip_code            TEXT,          -- NEW v11

  -- Physical
  height              TEXT,
  current_weight      NUMERIC,
  target_weight       NUMERIC,

  -- Training profile
  fitness_level       TEXT,
  activity_level      TEXT,
  weekly_availability TEXT,
  primary_goal        TEXT,          -- NEW v11
  split               TEXT,
  units               TEXT,

  -- Account
  account_pin         TEXT,          -- bcrypt hash
  pin_attempts        INT,
  friend_code         TEXT UNIQUE,
  username            TEXT,
  bio                 TEXT,
  badges              JSONB,
  is_admin            BOOLEAN,
  is_banned           BOOLEAN,

  -- Consent & audit
  consented_at        TIMESTAMPTZ,
  consent_version     TEXT,
  created_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ,
  last_ip_address     TEXT
)
```

---

## All Supabase Tables

| Table | Purpose |
|---|---|
| `users` | Identity, profile, location, training preferences |
| `user_settings` | Goals, schedule, gamification, device ID |
| `workouts` | All workout sessions |
| `nutrition` | Daily nutrition logs |
| `body_measurements` | Weight, BF%, measurements |
| `progress_photos` | Metadata; actual files in R2 |
| `checkins` | Daily readiness check-ins |
| `friendships` | Friend relationships |
| `activity_events` | Feed events, DMs, notifications |
| `push_subscriptions` | Web push endpoints |
| `sync_log` | Sync timestamps per device |

---

## Environment Variables (Vercel)

```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ADMIN_SECRET=
VAPID_PUB=
VAPID_PRIV=
VAPID_MAILTO=
R2_ACCOUNT_ID=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET=
R2_PUBLIC_URL=
```

---

## API Reference

### `POST /api/users` — Register new user

```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john@example.com",
  "dob": "1995-04-12",
  "sex": "Male",
  "state": "Texas",
  "city": "Austin",
  "zipCode": "78701",
  "primaryGoal": "Build Muscle",
  "split": "PPL",
  "units": "lbs",
  "fitnessLevel": "Intermediate",
  "activityLevel": "Moderately active",
  "weeklyAvailability": "4 days",
  "height": "5'11\"",
  "currentWeight": 185,
  "targetWeight": 195,
  "goals": { "cal": 2800, "protein": 200, "carbs": 280, "fat": 80 },
  "accountPin": "123456",
  "consentedAt": "2026-03-08T00:00:00Z",
  "consentVersion": "1.0",
  "deviceId": "abc123"
}
```

Response: `{ "success": true, "email": "john@example.com", "friend_code": "XK7PQ2" }`

### `GET /api/users?email=...` — Public profile lookup
Returns public fields: name, bio, badges, friend_code, fitness_level, units.

### `POST /api/sync` — Cloud backup/restore
Full workout, nutrition, body, and settings sync.

### `POST /api/auth/session` — Auth
Actions: `send_verify_code` · `confirm_verify_code` · `send_reset_code` · `verify_reset_code` · `set_new_pin`

### `POST /api/social` — Social layer
Friends, feed, DMs, duels, clan wars.

### `POST /api/push` — Web Push
`subscribe` · `count` · `send` (admin only)

### `POST /api/admin` — Admin panel (admin only)
`dashboard` · `users` · `user_detail` · `ban_user` · `delete_user` · `set_admin` · `adjust_xp` · `set_rank` · `business_analytics` · `set_notif_flags`

---

## Auth Flow

1. Onboarding complete → `POST /api/users` → account created + friend code assigned
2. Email verification code auto-sent
3. User enters 6-digit code → verified
4. Subsequent logins: email → PIN → full sync restored
5. Forgot PIN: email reset code → verify → set new PIN

Tokens are stored in `localStorage`, validated on every API call via `validate.mjs`.

---

## Gamification

| Element | Detail |
|---|---|
| XP | Earned on workouts, nutrition, check-ins, missions, milestones |
| Levels | 1–50 with rank names (Iron → Bronze → Silver → Gold → Platinum → Diamond → Legend) |
| Streaks | Daily workout streaks + Streak Shield protection |
| Missions | 3 daily from a pool of 28 |
| Milestones | PR weights, workout counts, streak lengths — each fires once with +50 XP |
| Consistency XP | +10 XP per exercise trained 3+ times in last 14 days |
| Duels | 1v1 XP challenges |
| Clan Wars | Team vs team competitions |

---

## Engagement Features (v10+)

All frontend-only, `localStorage`-backed:

- Morning briefing card with daily tip + XP multiplier
- Comeback card after 2–21 days off
- Best week ever banner
- Weekly recap (workouts vs goal, volume delta, weekly XP)
- Friend nudge when friends trained but you haven't
- Session duration drop alert (–20% avg)
- Nutrition pattern heat strip (28-day DOW)
- Sleep vs performance correlation chart
- Body weight trend prediction (linear regression, 30/60-day projection)
- Milestone pop-ups with +50 XP
- Per-exercise consistency XP
- Enhanced rank-up celebration (40 particles, 2-phase)
- Duel winner announcement with claim/share
- Activity feed auto-refresh (60s polling)

---

## localStorage Keys Reference

| Key | Purpose |
|---|---|
| `ft-theme` | `dark` / `light` |
| `ft-account-pin` | Local PIN cache |
| `ft-device-id` | Unique device ID |
| `ft-email-verified` | `true` / `skipped` |
| `ft-streak-shields` | Shield count |
| `ft-missions-completed` | `{ [date]: [missionIds] }` |
| `ft-feed-cache` | `{ events, ts }` |
| `ft-comeback-dismissed` | Per-gap dismiss |
| `ft-weekly-recap-dismissed` | Daily dismiss |
| `ft-best-week-dismissed` | Daily dismiss |
| `ft-dur-alert-dismissed` | Daily dismiss |
| `ft-milestones-fired` | `{ [milestoneId]: true }` |
| `ft-cons-{exerciseId}` | Consistency XP dedup |
| `ft-admin-push-history` | Last 20 push broadcasts |

---

## Pending Items

- Wire `m_early_bird` mission: `LS.set("ft-workout-early-"+today(), true)` in WorkoutTab when `new Date().getHours() < 8`
- Wire `m_dm` mission: `LS.set("ft-dm-sent-today", today())` in IMConversation send path
- Business analytics `topExercises` returns `[]` — query deferred
- Test push broadcast on real device post-deploy

---

## Version History

| Version | Summary |
|---|---|
| v1–v3 | Core workout tracking, local storage only |
| v4 | Cloud sync, Supabase integration |
| v5 | Social layer, DMs, push notifications, progress photos |
| v6 | UI/UX overhaul, admin panel |
| v7 | Gamification (XP, levels, streaks, missions) |
| v8 | Duels, clan wars, leaderboards |
| v9 | AI coach, body metrics overhaul, readiness check-ins |
| v10 | 19 engagement features, enhanced celebrations, admin push multi-select |
| **v11** | Onboarding: primary goal step, city + zip fields, progress bar; API + DB updated |

---

*Built by Byheir Wise — [ironlog.space](https://ironlog.space)*
