# IRONLOG API — v9.0.0

Serverless backend for the IronLog PWA. 9 Vercel Hobby functions (12 max). Supabase Postgres + Cloudflare R2 + Resend email.

---

## Stack

| Layer | Service | Plan |
|---|---|---|
| Runtime | Vercel Hobby | Free (100K invocations/mo) |
| Database | Supabase | Free (500MB, 50K MAUs) |
| Media storage | Cloudflare R2 | Free (10GB, free egress) |
| Email | Resend | Free (3,000/mo) |
| Error tracking | Sentry | Free (5K errors/mo) |

---

## Endpoints (9/12 functions)

```
api/auth/session.mjs      — create · validate · revoke · email verify · PIN reset
api/auth/validate.mjs     — shared session middleware (not a function)
api/sync/push.js          — push all user data to server
api/sync/pull.js          — pull all user data (PIN or session auth)
api/sync/reconcile.js     — record count reconciliation check
api/users/index.mjs       — user create · update
api/push/index.mjs        — Web Push subscription · DM notify
api/photos/upload.mjs     — R2 photo/video upload · signed URL generation
api/social/index.mjs      — friends · feed · groups · DMs · notifications
api/admin/index.mjs       — dashboard · user management · moderation · XP tools
```

---

## Environment Variables

Set in **Vercel → Project → Settings → Environment Variables**:

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Supabase project URL (`https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | ✅ | Supabase **service role** key (bypasses RLS) |
| `VAPID_PUBLIC_KEY` | ✅ | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | ✅ | Web Push VAPID private key |
| `VAPID_EMAIL` | ✅ | Contact email for VAPID (`mailto:you@domain.com`) |
| `ADMIN_EMAIL` | ✅ | Super-admin email (delete_user, set_admin restricted to this) |
| `RESEND_API_KEY` | ✅ | Resend API key for transactional email |
| `SENTRY_DSN` | ⬜ | Sentry DSN for error tracking (optional) |
| `CLOUDFLARE_ACCOUNT_ID` | ⬜ | R2 account ID |
| `R2_ACCESS_KEY_ID` | ⬜ | R2 S3-compatible access key |
| `R2_SECRET_ACCESS_KEY` | ⬜ | R2 S3-compatible secret |
| `R2_BUCKET_NAME` | ⬜ | R2 bucket (e.g. `ironlog-photos`) |
| `R2_PUBLIC_URL` | ⬜ | R2 public URL (e.g. `https://pub-xxx.r2.dev`) |
| `LATEST_APP_VERSION` | ⬜ | Current version string (`9.0`) — triggers update banner |
| `UPDATE_NOTES` | ⬜ | Message shown with update banner (optional) |

> **Generate VAPID keys:** `npx web-push generate-vapid-keys`

---

## Database Setup

### 1. Run the migration

Go to **Supabase → SQL Editor → New Query** and run:

```
migrations/v9_migration.sql
```

Idempotent — safe to re-run (`IF NOT EXISTS` throughout).

**What it creates/alters:**

| Block | What |
|---|---|
| 1 | `gamification` + `admin_notif_flags` on `user_settings` |
| 2 | `hips`, `calves`, `neck` on `body_measurements` |
| 3 | `text`, `date` on `milestones` (freeform milestone log) |
| 4 | All profile columns on `users` (bio, avatar_url, banner_url, username, + 20 more — IF NOT EXISTS) |
| 5 | Unique constraint on `users.username` |
| 6 | Full schema for all 17 tables (IF NOT EXISTS) |
| 7 | 20 performance indexes |
| 8 | Row-Level Security enabled on all user data tables |
| 9 | Session pruning query (commented — run manually or via pg_cron) |

### 2. Prior migrations now included

These were listed as pending in prior sessions — all included in Block 1 of `v9_migration.sql`:
- `ALTER TABLE user_settings ADD gamification JSONB`
- `ALTER TABLE user_settings ADD admin_notif_flags JSONB`

---

## Deploy

```bash
npm install
vercel --prod
```

Or push to a GitHub repo connected to Vercel for automatic deploys.

---

## Auth Flow

### Sign-up → email verify
1. `POST /api/users` `action=create` — creates user, sends 6-digit code via Resend
2. `POST /api/auth/session` `action=confirm_verify_code` — marks `email_verified=true`

### Sign-in
1. `POST /api/sync/pull` with `email` + `pin` — returns data, server issues session token
2. All subsequent requests: `X-Session-Token` header

### PIN reset
1. `POST /api/auth/session` `action=send_reset_code`
2. `POST /api/auth/session` `action=verify_reset_code` → short-lived reset token
3. `POST /api/auth/session` `action=set_new_pin` → hashes new PIN, revokes all sessions

---

## Sync Protocol

### Push `POST /api/sync/push`
Upserts all records. Response includes `latest_version` (triggers update banner if different from client's `APP_VERSION`).

**Body:**
```json
{
  "deviceId": "abc123",
  "appVersion": "9.0",
  "workouts": [...],
  "nutrition": [...],
  "body": [...],
  "photos": [...],
  "checkins": [...],
  "milestones": [...],
  "settings": {
    "goals": {...}, "schedule": {...}, "units": "lbs",
    "phases": [...], "injuries": [...],
    "gamification": {
      "xp_bonus": {"total": 4200, "log": [...]},
      "missions_completed": {"2026-03-07": {"m_workout": true, ...}},
      "streak_shields": 3,
      "badge_dates": {"streak_7": "2026-01-10", ...},
      "duels": [...], "rivals": [...],
      "war_wins": 8, "war_streak": 4,
      "comeback_used": null
    }
  }
}
```

### Pull `POST /api/sync/pull`
Returns everything. Auth: session token header (preferred) or PIN in body (sign-in only).

Returns: `workouts · nutrition · body · photos · checkins · milestones · goals · schedule · exercises · units · phases · injuries · privacy · supplements · accountability · gamification · profile`

**Profile fields returned (v9):**
`firstName · lastName · nickname · email · dob · sex · state · height · fitnessLevel · activityLevel · weeklyAvailability · currentWeight · avatar · banner · bio · username · friendCode · badges`

### Reconcile `POST /api/sync/reconcile`
Returns DB record counts. Client compares to local counts in Settings → System Health.

---

## Body Measurements Schema (v9)

New columns added to `body_measurements`:

| Column | Type | Notes |
|---|---|---|
| `hips` | `DECIMAL(5,2)` | inches or cm |
| `calves` | `DECIMAL(5,2)` | inches or cm |
| `neck` | `DECIMAL(5,2)` | inches or cm |

These are synced via push/pull in addition to the existing `weight · body_fat · chest · waist · arms · thighs`.

---

## Milestones Schema (v9)

New columns added to `milestones`:

| Column | Type | Notes |
|---|---|---|
| `text` | `TEXT` | Freeform milestone description (e.g. "Hit 50 workouts 🥇") |
| `date` | `DATE` | Date of the milestone event |

The existing columns (`type · target · deadline · label · created · completed · completed_date`) remain for structured goal tracking.

---

## Gamification Sync

| Key in `gamification` JSONB | Type | Description |
|---|---|---|
| `xp_bonus` | `{total, log[]}` | Bonus XP from missions, wars, multipliers |
| `missions_completed` | `{[date]: {[id]: true}}` | Daily mission history |
| `streak_shields` | number | Shield count (0–3 max) |
| `shield_awarded_streak` | number | Streak value at last shield award |
| `shield_used_date` | string | Last date a shield was consumed |
| `last_known_level` | number | For level-up detection on new devices |
| `badge_dates` | `{[badge_id]: date}` | Earned dates for all 30 badges |
| `duels` | array | Active + past 1v1 duels |
| `rivals` | array | Rivals list |
| `war_wins` | number | Total weekly war wins |
| `war_streak` | number | Current consecutive war win streak |
| `comeback_used` | string\|null | Date comeback bonus last used |

**Merge strategy on pull:** XP takes max, missions merge by day, shields take max, badge dates take earliest, duels/rivals/wars: server wins if local empty.

---

## Social API Routes

`POST /api/social` with `route` in body, or `GET /api/social?route=X`

| Route | Method | Auth | Description |
|---|---|---|---|
| `profile` | GET | None | Public profile by username |
| `friends` | GET | Session | Friends + pending requests |
| `friends` | POST | Session | `send · accept · remove · block` |
| `feed` | GET | Session | Activity feed |
| `feed` | POST | Session | `log_event · react` |
| `groups` | GET | Session | Joined groups |
| `groups` | POST | Session | `create · join · leave · members` |
| `notifications` | GET | Session | Unread notifications |
| `notifications` | POST | Session | `mark_read · delete_id · clear_all` |
| `update_profile` | POST | Session | avatar · banner · bio |
| `snapshot` | POST | Session | Challenge/badge snapshot |
| `set_username` | POST | Session | Claim username |
| `group_events` | GET | Session | Group chat messages |
| `check_messages` | GET | Session | Lightweight DM + group poll |
| `dms` | GET | Session | Full DM thread |

---

## Admin API Actions

| Action | Super-admin only | Description |
|---|---|---|
| `check` | — | Verify admin status |
| `dashboard` | — | KPIs + 14-day chart (60s cache) |
| `users` | — | Enriched user list |
| `user_detail` | — | Full user drill-down |
| `business_analytics` | — | 6-tab analytics dashboard |
| `health` | — | Stale users + sync issues |
| `groups` | — | All groups + member counts |
| `view_dms` | — | View DM thread between two users |
| `view_group_chat` | — | View group chat |
| `ban_user` | — | Ban/unban + revoke sessions |
| `adjust_xp` | — | Adjust user's bonus XP |
| `get_gamification` | — | Read user's gamification JSONB |
| `set_notif_flags` | — | Push in-app notification to user |
| `get_notif_flags` | — | Fetch pending flags (client poll) |
| `clear_notif_flags` | — | Clear flags after consuming |
| `delete_user` | ✅ | Cascade-delete all user data |
| `set_admin` | ✅ | Grant/revoke admin flag |

---

## Security

| Concern | Implementation |
|---|---|
| PIN storage | SHA-256 with `email[0:16]` salt |
| PIN comparison | `crypto.timingSafeEqual` |
| PIN lockout | 5 attempts → 15 min lockout |
| Session tokens | 30-day, device-scoped |
| Admin check | DB flag (`is_admin`) + session + env super-admin |
| CORS | Allowlisted: `ironlog.space`, `localhost` only |
| DM friendship | Verified server-side before insert |
| Event types | Allowlist of 12 types |
| Reaction types | Allowlist of 6 types |
| vault_pin | Scrubbed before settings upsert — never stored server-side |
| Stack traces | Excluded from all 5xx responses |
| Admin columns | Safe projection (excludes PIN hash, IP, lockout) |
| Photo IDs | Sanitized to `[a-zA-Z0-9_-]` |
| RLS | Enabled on all 10 user data tables |

---

## Rate Limits

| Endpoint | Limit | Window |
|---|---|---|
| Social API (per IP) | 100 req | 60s |
| DM push notify | 1 req | Per 60s per user |
| PIN verify | 5 attempts | 15min lockout |
| Email code resend | 1 req | Per 60s |
| Email verify | 5 attempts | Per code |

---

## Version History

| Version | Changes |
|---|---|
| v5.0.0 | Initial structured API |
| v5.1.0 | PIN hashing, admin delete/ban, allowlists |
| v5.2.0 | pull.js PIN fix, notification ownership, admin safe projection |
| v6.0.0 | Reconcile endpoint, sync_log, retry wrapper |
| v7.0.0 | R2 photo/video storage, signed URLs |
| v8.0.0 | Email verify + PIN reset, Sentry, polling optimization |
| v8.1.0 | Consolidation to 9 functions (was 13) |
| **v9.0.0** | **Supabase ^2.47.0** · **Gamification sync** · **Admin notif flags** · **Extended body measurements** (hips/calves/neck) · **Milestone text+date** · **Full profile return** (currentWeight/bio/avatar/banner/username) · **20 performance indexes** · **RLS on all user tables** · `v9_migration.sql` single-file idempotent migration |
