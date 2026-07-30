# Relay Earn — Full System Specification

**Version:** 2.0  
**Status:** Product redesign / pre-implementation  
**Product type:** Bandwidth-sharing earner network + operator control plane  
**Date:** 2026-07-30

---

## 1. Executive summary

Relay pivots from a “show me my proxy URL” utility into a **consumer earner product**:

> Install the app → verify phone → leave it running → share spare mobile/Wi‑Fi bandwidth → **get paid per GB** → withdraw via Stripe when balance ≥ **$20**.

Users **never** need to understand proxy URLs, IPs, SOCKS, or ports.  
Operators (you) run:

1. **Mobile earner app** (simple wallet + traffic)
2. **User web dashboard** (same data as the app)
3. **Marketing website** (conversion / trust)
4. **Admin dashboard** (users, devices, traffic, money, fraud)
5. **Proxy edge + device tunnel backend** (the real money engine)
6. **Supabase** (database + realtime)
7. **Twilio** (OTP)
8. **Stripe** (payouts)
9. **DigitalOcean** (droplets, domains, DNS)

This document is the single source of truth for architecture, data model, money flows, auth, infra, and delivery order.

---

## 2. Product principles

| Principle | Meaning |
|---|---|
| **Zero protocol jargon** | No proxy URL, IP, port, SOCKS on the earner UI |
| **Money-first UX** | Home shows balance, today’s earnings, GB shared |
| **Trust & calm** | Clean modern UI; transparent rates; clear withdraw rules |
| **Same data everywhere** | Mobile app ↔ website dashboard share one API/DB |
| **Shared design system** | One token/component language for marketing, app, admin |
| **Operator independence** | Supabase + DO + Twilio + Stripe fully scriptable |
| **Safety defaults** | Caps, Wi‑Fi-only option, fraud checks, ToS |

---

## 3. Actors & products

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Earner user │────►│ Mobile app       │────►│ API / Edge      │
│ (phone OTP) │     │ Web dashboard    │     │ Supabase        │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
┌─────────────┐     ┌──────────────────┐              │
│ Admin/ops   │────►│ Admin dashboard  │──────────────┤
└─────────────┘     └──────────────────┘              │
                                                      │
┌─────────────┐     ┌──────────────────┐              │
│ Proxy buyer │────►│ Buyer API / panel│──────────────┘
│ (B2B later) │     │ (traffic demand) │
└─────────────┘     └──────────────────┘
```

| Surface | Audience | Purpose |
|---|---|---|
| **Marketing site** | Visitors | Explain product, pricing/earnings, trust, download/login |
| **Mobile earner app** | Earners | OTP login, share toggle, stats, withdraw |
| **User web dashboard** | Earners | Same metrics as mobile, history, settings, withdraw |
| **Admin dashboard** | Operators | Users, devices, traffic, ledger, payouts, flags |
| **Edge / tunnel** | System | Route paid demand through online devices |
| **Buyer channel** | B2B (phase 2) | Sell residential proxy capacity |

---

## 4. User journeys

### 4.1 Earner — first run (mobile)

1. Open app → splash  
2. Enter **phone number** (E.164)  
3. Receive **OTP** via SMS (Twilio Verify)  
4. Enter code → account created / session issued  
5. Optional: display name, country (auto from phone/IP)  
6. Permissions: notifications; battery unrestricted (guided)  
7. **Start sharing** toggle (default off until consent)  
8. Home: balance $0.00, GB 0, status Online/Offline  

### 4.2 Earner — daily use

1. Open app → see **balance**, **today earned**, **GB today**  
2. Sharing ON while charging / on Wi‑Fi (user preferences)  
3. Push notification: “You earned $1.20 today”  
4. At **$20+** → Withdraw enabled  
5. Withdraw → Stripe payout method → pending → paid  

### 4.3 Earner — web

1. Visit site → Log in with same phone OTP  
2. Dashboard mirrors mobile: balance, charts, devices, history  
3. Can start/stop sharing only from **device app** (web is read + withdraw + settings)

### 4.4 Admin

1. Login (phone OTP for operators on `admin.*` / portal; separate admin allowlist)  
2. See KPIs: active devices, GB/day, payout liability, fraud flags  
3. **Devices:** dense **table** fleet list (not cards) → click row opens **right inspector** with probe/traffic/exit; **Full details** opens a single-device page with all fields  
4. Drill into user → devices → app journey/events → ledger → withdrawals  
5. Approve/hold withdrawals; ban devices; adjust rates  

UI pattern (design system): admin fleet surfaces use **master–detail tables** for space efficiency — see [DESIGN_SYSTEM.md §6.4](./DESIGN_SYSTEM.md). 

### 4.5 Money (buyer → network → earner) — conceptual

```text
Proxy buyer pays Relay for GB
        │
        ▼
 Relay margin (gross - costs)
        │
        ├── Edge infra cost
        ├── Twilio / Stripe fees
        └── Earner payout rate ($ / GB)
                 │
                 ▼
          Earner wallet balance
                 │
                 ▼  (≥ $20 withdraw)
          Stripe payout to user
```

---

## 5. Monetization model

### 5.1 Earner rate card (configurable)

| Parameter | Initial default | Notes |
|---|---|---|
| Pay rate | **$0.20 / GB** shared (example) | Admin-configurable per country |
| Min withdraw | **$20.00** | Hard product rule |
| Measurement unit | Rounded to **0.001 GB** (1 MB) | Ledger uses integer **bytes** + millicents |
| Network types | Wi‑Fi default; cellular optional | User toggle; lower rate on cellular optional |
| Referral bonus | Phase 2 | % of referee earnings |

Store rates in `rate_plans` table so ops can change without app release.

### 5.2 Wallet rules

- Balance is **ledger-based** (append-only entries), never a single mutable float without audit.
- Credits: `traffic_earn`, `bonus`, `adjustment_credit`  
- Debits: `withdrawal`, `adjustment_debit`, `clawback`  
- Available balance = sum(credits) − sum(debits) − pending withdrawals  

### 5.3 Withdrawals (Stripe)

**Recommended approach:** [Stripe Connect Express](https://stripe.com/connect) (or Stripe payouts to bank for supported countries).

Flow:

1. User taps Withdraw  
2. If no payout method → Stripe Connect onboarding (hosted)  
3. Create `withdrawals` row: `pending`  
4. Admin auto-approve under threshold (e.g. ≤ $100, low risk) else manual review  
5. Execute Stripe Transfer / Payout  
6. Mark `paid` or `failed`  
7. Ledger debit on successful payout initiation (or on settlement — pick one; recommend **on initiation** with reverse on failure)

**Fees:** Either absorb Stripe fees or deduct from payout (show clearly).

### 5.4 Unit economics (must track)

```text
Revenue per GB (buyer)  −  earner rate  −  infra/GB  −  payment fees  =  margin
```

Admin dashboard must show **gross revenue**, **earner liability**, **margin**.

---

## 6. What the earner app deliberately hides

| Hidden | Why |
|---|---|
| Proxy host/port/URL | Confusing; security risk if shared |
| Public IP | Not needed for motivation |
| SOCKS/HTTP protocol | Operator concern |
| Buyer identities | Privacy |
| Raw peer connections | Noise |

| Shown | Why |
|---|---|
| Sharing ON/OFF | Control |
| Online / sharing status | Trust |
| GB today / all-time | Progress |
| $ balance / today / lifetime | Motivation |
| Withdraw CTA | Conversion |
| Simple history | Transparency |
| Preferences (Wi‑Fi only, daily GB cap) | Safety |

---

## 7. System architecture

### 7.1 High-level

```text
                    ┌──────────────────────────────────────────┐
                    │              DigitalOcean VPC             │
                    │                                          │
  Mobile/Web ──────►│  API (Node/Go)  ·  Edge Proxy Fleet      │
                    │       │                  │               │
                    │       ▼                  ▼               │
                    │  Redis (sessions,        Device tunnel   │
                    │   rate limit,            gateway (WSS)   │
                    │   presence)                   │          │
                    └───────────┬───────────────────┬──────────┘
                                │                   │
                                ▼                   ▼
                         Supabase Postgres    Online devices
                         (users, ledger,      (earner apps)
                          devices, traffic)
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
           Twilio            Stripe           Object storage
           Verify            Connect          (logs optional)
```

### 7.2 Core services

| Service | Responsibility | Deploy |
|---|---|---|
| **api** | REST/GraphQL: auth, wallet, devices, withdraw | DO Droplet / App Platform |
| **edge-proxy** | Accepts buyer traffic; selects device; tunnels | DO Droplet pool / K8s later |
| **device-gateway** | Maintains persistent device connections | Same VPC |
| **worker** | Aggregate traffic, settle earnings, payouts job | DO Droplet |
| **admin-web** | Operator UI | Static + API |
| **marketing-web** | Public site | Static (CDN) or same app |
| **earner-web** | User dashboard | Same frontend monorepo |
| **mobile** | React Native / Kotlin+Swift later | Stores |

### 7.3 Device tunnel model (why users don’t “host a port”)

Mobile networks block inbound connections. Devices **dial out** to `device-gateway`:

```text
Device app ──outbound WSS/QUIC──► device-gateway ◄── edge-proxy ◄── buyer
```

When a buyer needs an exit IP matching the device’s network:

1. Edge picks eligible online device (geo, trust score, capacity)
2. Multiplexes TCP stream through the device tunnel
3. Device opens outbound TCP to destination and pipes bytes
4. Metered bytes → `traffic_samples` → settled to ledger

This is the same technical core as the earlier proxy engine, but **orchestrated** and **metered for payouts**.

### 7.4 Auth model (phone OTP)

```text
POST /auth/otp/start   { phone }
  → Twilio Verify SMS
  → store challenge_id (rate limited)

POST /auth/otp/verify  { phone, code }
  → Twilio check
  → upsert user
  → issue session JWT (httpOnly cookie web / secure storage mobile)
```

**Not** using password. Optional later: passkeys.

Sessions in `sessions` table + JWT access (15m) + refresh (30d).

Admin auth: separate `admin_users` with email/password (Argon2) or magic link — **never** phone OTP only for admin.

### 7.5 API surface (earner)

| Method | Path | Description |
|---|---|---|
| POST | `/v1/auth/otp/start` | Send OTP |
| POST | `/v1/auth/otp/verify` | Verify → session |
| POST | `/v1/auth/logout` | Revoke |
| GET | `/v1/me` | Profile + balance summary |
| GET | `/v1/me/stats` | Today/7d/30d traffic & earnings |
| GET | `/v1/me/ledger` | Paginated wallet entries |
| GET | `/v1/me/devices` | User devices |
| PATCH | `/v1/me/devices/:id` | Rename, caps, wifi-only |
| POST | `/v1/me/devices/:id/command` | `{ action: "stop_sharing" }` via push/gateway |
| GET | `/v1/me/withdrawals` | History |
| POST | `/v1/me/withdrawals` | Request payout |
| POST | `/v1/me/payout-method/onboard` | Stripe Connect link |
| GET | `/v1/me/payout-method` | Status |
| WSS | `/v1/device/connect` | Device tunnel + heartbeats + meter |

### 7.6 API surface (admin)

| Method | Path | Description |
|---|---|---|
| GET | `/v1/admin/overview` | KPIs |
| GET | `/v1/admin/users` | Search/filter |
| GET | `/v1/admin/users/:id` | Detail |
| GET | `/v1/admin/devices` | Fleet |
| GET | `/v1/admin/traffic` | Aggregates |
| GET | `/v1/admin/withdrawals` | Queue |
| POST | `/v1/admin/withdrawals/:id/approve` | |
| POST | `/v1/admin/withdrawals/:id/reject` | |
| PATCH | `/v1/admin/users/:id` | Ban/rate plan |
| GET/PUT | `/v1/admin/rate-plans` | |

---

## 8. Database (Supabase Postgres)

### 8.1 Principles

- UUID primary keys  
- `timestamptz` everywhere  
- Money as **integer millicents** (1/1000 of a cent) **or** integer **cents** — recommend **cents** for simplicity ($20.00 = 2000)  
- Traffic as **bigint bytes**  
- RLS for earner tables; admin via service role  

### 8.2 Schema (core)

```sql
-- USERS
create table users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,              -- E.164
  phone_verified_at timestamptz,
  display_name text,
  country_code char(2),
  status text not null default 'active'
    check (status in ('active','suspended','banned')),
  stripe_connect_account_id text,
  payout_ready boolean not null default false,
  rate_plan_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- SESSIONS (earner)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  refresh_token_hash text not null,
  user_agent text,
  ip inet,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- OTP challenges (optional local audit; Twilio is source of truth)
create table otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  twilio_sid text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

-- DEVICES
create table devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  device_public_key text,                  -- for tunnel auth
  name text not null default 'My phone',
  platform text check (platform in ('android','ios','web_agent')),
  app_version text,
  status text not null default 'offline'
    check (status in ('offline','online','sharing','banned')),
  wifi_only boolean not null default true,
  daily_cap_bytes bigint,                  -- null = unlimited
  last_seen_at timestamptz,
  last_ip inet,
  last_network_type text,                  -- wifi|cellular
  country_code char(2),
  trust_score numeric(5,2) not null default 50,
  created_at timestamptz not null default now()
);
create index devices_user_idx on devices(user_id);
create index devices_status_idx on devices(status);

-- RATE PLANS
create table rate_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  cents_per_gb int not null,               -- e.g. 20 = $0.20/GB
  cellular_cents_per_gb int,               -- optional lower
  min_withdraw_cents int not null default 2000,
  active boolean not null default true
);

-- TRAFFIC SAMPLES (high volume — partition by day later)
create table traffic_samples (
  id bigserial primary key,
  device_id uuid not null references devices(id),
  user_id uuid not null references users(id),
  bytes_up bigint not null default 0,
  bytes_down bigint not null default 0,
  period_start timestamptz not null,
  period_end timestamptz not null,
  network_type text,
  settled boolean not null default false,
  created_at timestamptz not null default now()
);
create index traffic_device_time on traffic_samples(device_id, period_start desc);
create index traffic_unsettled on traffic_samples(settled) where settled = false;

-- DAILY ROLLUPS (for fast dashboards)
create table traffic_daily (
  user_id uuid not null references users(id),
  device_id uuid not null references devices(id),
  day date not null,
  bytes_total bigint not null default 0,
  earn_cents int not null default 0,
  primary key (device_id, day)
);

-- LEDGER (source of truth for money)
create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  type text not null check (type in (
    'traffic_earn','bonus','adjustment_credit',
    'withdrawal','adjustment_debit','clawback'
  )),
  amount_cents int not null,               -- signed: +credit / -debit
  balance_after_cents int not null,
  reference_type text,                     -- traffic_daily | withdrawal | ...
  reference_id text,
  description text,
  created_at timestamptz not null default now()
);
create index ledger_user_time on ledger_entries(user_id, created_at desc);

-- materialize balance for speed (update in same tx as ledger)
create table wallets (
  user_id uuid primary key references users(id) on delete cascade,
  available_cents int not null default 0,
  pending_withdraw_cents int not null default 0,
  lifetime_earn_cents int not null default 0,
  lifetime_withdrawn_cents int not null default 0,
  updated_at timestamptz not null default now()
);

-- WITHDRAWALS
create table withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  amount_cents int not null check (amount_cents > 0),
  status text not null default 'pending'
    check (status in ('pending','approved','processing','paid','rejected','failed')),
  stripe_transfer_id text,
  review_note text,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ADMIN
create table admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null default 'ops'
    check (role in ('ops','finance','superadmin')),
  created_at timestamptz not null default now()
);

-- AUDIT
create table admin_audit_log (
  id bigserial primary key,
  admin_id uuid references admin_users(id),
  action text not null,
  entity_type text,
  entity_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- FRAUD FLAGS
create table risk_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  device_id uuid references devices(id),
  code text not null,
  severity text not null check (severity in ('low','medium','high')),
  details jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
```

### 8.3 Settlement job (worker)

Every N minutes (e.g. 5):

1. Select unsettled `traffic_samples`  
2. Sum bytes per user/device  
3. Compute earn_cents = floor(bytes / 1e9 * cents_per_gb) with residual carry  
4. Insert `ledger_entries` + update `wallets` + `traffic_daily`  
5. Mark samples settled  

### 8.4 Supabase usage

| Feature | Use |
|---|---|
| Postgres | System of record |
| Service role key | API server only (never mobile) |
| Anon key | Optional for marketing forms only |
| Realtime | Optional: balance updates on web dashboard |
| Storage | Receipts / KYC docs later |
| Auth | **Not primary** — custom phone OTP via Twilio |

Provide SQL migrations in repo; apply with service role on bootstrap.

---

## 9. Integrations

### 9.1 Twilio (OTP)

- Product: **Twilio Verify** (preferred over raw Programmable SMS)  
- Env: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`  
- Rate limits: 5 starts / phone / hour; 5 verifies / challenge  
- Support voice OTP fallback later  

### 9.2 Stripe (payouts)

- Stripe Connect Express accounts per earner  
- Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID`  
- Webhooks: `account.updated`, `transfer.created`, `payout.paid`, `payout.failed`  
- Min withdraw: enforce server-side ($20)  

### 9.3 DigitalOcean

| Resource | Purpose |
|---|---|
| **Droplet** (or 2) | API + device-gateway + worker initially |
| **Managed DB optional** | Or use Supabase only |
| **Spaces** | Log archives / backups |
| **DNS** | Point domains to load balancer / droplet |
| **Firewall** | Only 80/443 public; tunnel port internal/VPC |
| **Container Registry** | Images |

Domains (examples — final TBD):

| Host | App |
|---|---|
| `relay.example` | Marketing |
| `app.relay.example` | User dashboard |
| `admin.relay.example` | Admin |
| `api.relay.example` | API |
| `edge.relay.example` | Proxy edge |

When DO + domain credentials are provided, agent can:

1. Create droplet with Docker  
2. Configure DNS A/AAAA records  
3. Install Caddy/Nginx + TLS  
4. Deploy compose stack  
5. Wire env secrets  

### 9.4 Secrets matrix

| Secret | Where |
|---|---|
| `SUPABASE_URL` | API |
| `SUPABASE_SERVICE_ROLE_KEY` | API only |
| `JWT_SECRET` | API |
| `TWILIO_*` | API |
| `STRIPE_*` | API |
| `DEVICE_TUNNEL_SECRET` | API + mobile build config |
| `ADMIN_BOOTSTRAP_PASSWORD` | one-time |

---

## 10. Security & abuse

| Risk | Mitigation |
|---|---|
| Fake traffic / farming | Trust score, velocity checks, device attestation (Play Integrity) |
| Multi-account same person | Phone unique; device fingerprint; graph analysis |
| Open proxy abuse | Devices never expose inbound ports; only orchestrated streams |
| OTP spam | Twilio Verify + app rate limits + CAPTCHA on web |
| Wallet fraud | Ledger immutability; withdraw holds; manual review |
| Data leak | RLS; service role only on server; no proxy URLs to earners |
| Compliance | ToS, privacy policy, geo restrictions, KYC if required for payouts |

**Legal note:** Bandwidth-sharing / residential proxy networks face ToS and regulatory scrutiny. Require clear user consent, forbid illegal use, maintain abuse desk, and consult counsel before public launch.

---

## 11. Non-functional requirements

| Area | Target |
|---|---|
| API latency (p50) | < 150ms regional |
| Device reconnect | < 5s after network blip |
| Meter accuracy | ± 1% vs edge counters |
| Uptime API | 99.5% early; 99.9% later |
| Mobile battery | Sharing efficient; Wi‑Fi preferred |
| Dashboard load | First paint < 2s on 4G |

---

## 12. Repo / monorepo layout (target)

```text
relay/
├── apps/
│   ├── mobile/          # React Native (Expo) earner app
│   ├── web/             # Marketing + user dashboard (this stack)
│   └── admin/           # Admin dashboard (can share web package)
├── packages/
│   ├── ui/              # Shared design system components
│   ├── config/          # ESLint, TS, Tailwind tokens
│   └── sdk/             # Typed API client
├── services/
│   ├── api/
│   ├── device-gateway/
│   ├── edge-proxy/
│   └── worker/
├── supabase/
│   └── migrations/
├── infra/
│   ├── docker-compose.yml
│   ├── caddy/
│   └── terraform/ or doctl scripts
└── docs/
    ├── SYSTEM_SPEC.md
    ├── DESIGN_SYSTEM.md
    └── RUNBOOK.md
```

---

## 13. Phased delivery

### Phase 0 — Spec & design (this phase)

- [x] Product pivot defined  
- [x] System spec  
- [x] Design system  
- [x] Marketing + UI mockups in preview  

### Phase 1 — Foundations

- Supabase project + migrations  
- API skeleton (auth OTP mock → Twilio)  
- User dashboard + marketing live  
- Admin skeleton  

### Phase 2 — Money path (no real proxy yet)

- Wallet + simulated traffic credits  
- Stripe Connect withdraw test mode  
- Full earner UX  

### Phase 3 — Real sharing

- Device gateway + Android agent  
- Edge proxy buyer path (internal)  
- Settlement worker  
- Metering accuracy  

### Phase 4 — Scale & ops

- Multi-edge regions  
- Fraud automation  
- Buyer self-serve portal  
- iOS if policy allows background networking  

### Phase 5 — Independence pack

- DO droplet provision scripts  
- Domain + TLS automation  
- Secrets vault  
- Monitoring (Grafana/Uptime)  

---

## 14. Credentials the operator will supply (when ready)

| Credential | Used for |
|---|---|
| Supabase URL + **service role** key | Schema, API |
| Twilio Account + Verify service | OTP |
| Stripe secret + webhook secret | Payouts |
| DigitalOcean API token | Droplets, DNS |
| Domain names | Public endpoints |

Until supplied, development uses mocks (OTP `000000`, fake Stripe, local DB).

---

## 15. Success metrics

| Metric | Early target |
|---|---|
| OTP success rate | > 90% |
| D1 retention | > 25% |
| % users who enable sharing | > 60% of verified |
| Time to first $1 | < 7 days median (depends on demand) |
| Withdraw success | > 95% |
| Fraud loss | < 2% of payouts |

---

## 16. Open decisions

1. Final brand name & domain  
2. Exact cents/GB by country  
3. Cellular sharing allowed at launch? (recommend **Wi‑Fi only** at launch)  
4. Stripe Connect vs third-party mass payout  
5. Android-first only for MVP agent? (recommend **yes**)  
6. Buyer GTM: internal use vs public proxy product  

---

*End of system specification.*
