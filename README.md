# IRONLOG API — v11.0.0

Serverless backend for the IRONLOG fitness PWA. Vercel serverless functions backed by Supabase Postgres, Cloudflare R2 media storage, and Resend transactional email.

---

## Stack

| Layer | Service | Plan |
|---|---|---|
| Runtime | Vercel Hobby | Free (100K invocations/mo) |
| Database | Supabase | Free (500MB, 50K MAUs) |
| Media storage | Cloudflare R2 | Free (10GB, free egress) |
| Email | Resend | Free (3,000/mo) |

---

## Endpoints

```
api/auth/session.mjs      — create · validate · revoke · email verify · PIN reset
api/auth/validate.mjs     — shared session middleware (not a function)
api/sync/push.js          — push all user data to server
api/sync/pull.js          — pull all user data (PIN or session auth)
api/sync/reconcile.js     — record count reconciliation check
api/users/index.mjs       — user registration · public profile lookup
api/push/index.mjs        — Web Push subscription · push notifications
api/photos/upload.mjs     — R2 photo/video upload · signed URL generation
api/social/index.mjs      — friends · feed · groups · DMs · notifications
api/admin/index.mjs       — dashboard · user management · moderation · XP tools
```

---

## Environment Variables

Set in **Vercel → Project → Settings → Environment Variables**:

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | ✅ | Supabase service role key (bypasses RLS) |
| `VAPID_PUBLIC_KEY` | ✅ | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | ✅ | Web Push VAPID private key |
| `VAPID_EMAIL` | ✅ | Contact email for VAPID (`mailto:you@domain.com`) |
| `ADMIN_EMAIL` | ✅ | Super-admin email |
| `RESEND_API_KEY` | ✅ | Resend API key for transactional email |
| `CLOUDFLARE_ACCOUNT_ID` | ⬜ | R2 account ID |
| `R2_ACCESS_KEY_ID` | ⬜ | R2 S3-compatible access key |
| `R2_SECRET_ACCESS_KEY` | ⬜ | R2 S3-compatible secret |
| `R2_BUCKET_NAME` | ⬜ | R2 bucket name |
| `R2_PUBLIC_URL` | ⬜ | R2 public URL |
| `LATEST_APP_VERSION` | ⬜ | Current version string — triggers update banner |
| `UPDATE_NOTES` | ⬜ | Message shown with update banner |
| `SENTRY_DSN` | ⬜ | Sentry DSN for error tracking |

> **Generate VAPID keys:** `npx web-push generate-vapid-keys`

---

## Deploy

```bash
npm install
vercel --prod
```

Push to a GitHub repo connected to Vercel for automatic deploys on every commit.

---

## Auth Flow

### Sign-up
1. `POST /api/users` — creates account, assigns friend code, sends 6-digit verify code via email
2. `POST /api/auth/session` `action=confirm_verify_code` — marks account verified

### Sign-in
1. `POST /api/sync/pull` with `email` + `pin` — returns all user data, issues session token
2. All subsequent requests use `X-Session-Token` header

### PIN Reset
1. `POST /api/auth/session` `action=send_reset_code`
2. `POST /api/auth/session` `action=verify_reset_code` → short-lived reset token
3. `POST /api/auth/session` `action=set_new_pin` → hashes new PIN, revokes all sessions

---

## User Registration — `POST /api/users`

Called once at the end of onboarding. Creates the user row and initial settings.

**Fields accepted:**

| Field | Description |
|---|---|
| `firstName`, `lastName`, `email` | Required |
| `accountPin` | Required — 6-digit PIN, stored as bcrypt hash |
| `dob`, `sex`, `nickname` | Optional identity |
| `state`, `city`, `zipCode` | Location — all three stored |
| `primaryGoal` | Build Muscle / Lose Fat / Body Recomposition / Strength / Maintain Fitness |
| `split` | PPL / Bro / Upper-Lower / Full Body / Custom |
| `units` | `lbs` or `kg` |
| `fitnessLevel`, `activityLevel`, `weeklyAvailability` | Training profile |
| `height`, `currentWeight`, `targetWeight` | Physical stats |
| `goals` | `{ cal, protein, carbs, fat }` — nutrition targets |
| `consentedAt`, `consentVersion` | Consent record |
| `deviceId` | Device identifier |

**Response:** `{ success: true, email, friend_code }`

---

## Sync Protocol

### Push — `POST /api/sync/push`
Upserts all user data. Response includes `latest_version` — triggers update banner if different from client's `APP_VERSION`.

**Data synced:** workouts · nutrition · body measurements · photos · check-ins · milestones · settings (goals, schedule, units, gamification, phases, injuries, privacy, supplements)

### Pull — `POST /api/sync/pull`
Returns everything. Auth: session token header (normal use) or PIN in body (sign-in only).

**Profile fields returned:** firstName · lastName · nickname · email · dob · sex · state · city · zipCode · height · fitnessLevel · activityLevel · weeklyAvailability · currentWeight · primaryGoal · split · units · avatar · banner · bio · username · friendCode · badges

### Reconcile — `POST /api/sync/reconcile`
Returns DB record counts per table. Client compares to local counts in Settings → System Health.

---

## Social API — `POST /api/social`

| Route | Method | Description |
|---|---|---|
| `profile` | GET | Public profile by username |
| `friends` | GET / POST | Friends list · send / accept / remove / block |
| `feed` | GET / POST | Activity feed · log event · react |
| `groups` | GET / POST | Groups · create / join / leave / members |
| `notifications` | GET / POST | Unread notifications · mark read / delete / clear |
| `update_profile` | POST | Update avatar · banner · bio |
| `set_username` | POST | Claim username |
| `dms` | GET | Full DM thread |
| `check_messages` | GET | Lightweight DM + group unread poll |
| `group_events` | GET | Group chat messages |
| `snapshot` | POST | Challenge/badge snapshot |

---

## Admin API — `POST /api/admin`

Admin-only. Requires `is_admin = true` on the user's account.

| Action | Super-admin | Description |
|---|---|---|
| `check` | | Verify admin status |
| `dashboard` | | KPIs + 14-day activity chart (60s cache) |
| `users` | | Enriched user list with last sync, workout count |
| `user_detail` | | Full user drill-down — profile, workouts, photos, DMs, friends |
| `business_analytics` | | Retention, frequency distribution, level breakdown, state + city distribution, 90-day growth chart |
| `adjust_xp` | | Adjust a user's bonus XP |
| `get_gamification` | | Read a user's gamification state |
| `set_notif_flags` | | Queue an in-app notification for a user |
| `get_notif_flags` | | Fetch pending flags (polled by client on app open) |
| `clear_notif_flags` | | Clear flags after client consumes them |
| `ban_user` | | Ban / unban + revoke sessions |
| `view_dms` | | View DM thread between two users |
| `view_group_chat` | | View a group's chat history |
| `health` | | Stale users + sync issues report |
| `delete_user` | ✅ | Cascade-delete all user data |
| `set_admin` | ✅ | Grant / revoke admin flag |

---

## Gamification Sync

Gamification state lives in a JSONB column on `user_settings` and travels with every push/pull.

| Key | Type | Description |
|---|---|---|
| `xp_bonus` | `{ total, log[] }` | Bonus XP from missions, wars, multipliers |
| `missions_completed` | `{ [date]: { [id]: true } }` | Daily mission history |
| `streak_shields` | number | Shield count (max 3) |
| `last_known_level` | number | Level-up detection on new devices |
| `badge_dates` | `{ [badge_id]: date }` | Earn dates for all badges |
| `duels` | array | Active + past 1v1 duels |
| `rivals` | array | Rivals list |
| `war_wins` | number | Total weekly war wins |
| `war_streak` | number | Consecutive war win streak |
| `comeback_used` | string \| null | Date comeback bonus last used |

**Merge strategy on pull:** XP takes max · missions merge by day · shields take max · badge dates take earliest · duels/rivals/wars: server wins if local is empty.

---

## Security

| Concern | Implementation |
|---|---|
| PIN storage | bcrypt hash (10 rounds) |
| PIN lockout | 5 attempts → 15-min lockout |
| Session tokens | 30-day, device-scoped |
| Admin check | DB flag + session + env super-admin |
| CORS | `ironlog.space` and `localhost` only |
| DM friendship | Verified server-side before insert |
| Event types | Allowlist enforced |
| `vault_pin` | Scrubbed before upsert — never stored server-side |
| Stack traces | Excluded from all 5xx responses |
| Admin projections | Exclude PIN hash, IP, lockout fields |
| RLS | Enabled on all user data tables |

---

## Rate Limits

| Endpoint | Limit | Window |
|---|---|---|
| Social API (per IP) | 100 req | 60s |
| DM push notify | 1 req | Per 60s per user |
| PIN verify | 5 attempts | 15-min lockout |
| Email code resend | 1 req | Per 60s |
| Email verify | 5 attempts | Per code |

---

## Version History

| Version | Changes |
|---|---|
| v5.0.0 | Initial structured API |
| v5.1.0 | PIN hashing, admin delete/ban, allowlists |
| v6.0.0 | Reconcile endpoint, sync_log, retry wrapper |
| v7.0.0 | R2 photo/video storage, signed URLs |
| v8.0.0 | Email verify + PIN reset, polling optimization |
| v8.1.0 | Consolidation to 9 functions |
| v9.0.0 | Gamification sync · admin notif flags · extended body measurements · RLS on all tables |
| v10.0.0 | Admin push multi-select · in-app notification queuing · business analytics · validate.mjs fix |
| **v11.0.0** | **Registration now captures `city`, `zipCode`, `primaryGoal` · Pull returns new fields · Business analytics includes city/zip/goal breakdowns** |
