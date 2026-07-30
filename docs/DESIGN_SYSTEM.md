# Relay Design System

**Version:** 2.0  
**Applies to:** Marketing site · Earner mobile app · User web dashboard · Admin dashboard  

One visual language. Multiple densities.

---

## 1. Brand character

| Attribute | Choice |
|---|---|
| Personality | Calm, trustworthy, modern utility — not neon crypto |
| Metaphor | Quiet relay / flow of bandwidth → earned value |
| Voice | Short, plain, money-clear (“You earned $2.40 today”) |
| Avoid | Purple AI gradients, hacker aesthetic, proxy jargon |

**Product name:** Relay  
**Tagline options:**  
- “Share bandwidth. Get paid.”  
- “Your connection, your earnings.”  

---

## 2. Foundations (tokens)

### 2.1 Color

```text
Backgrounds
  --bg            #07090e
  --bg-elevated   #0e1219
  --surface       #141a24
  --surface-2     #1a2230
  --surface-3     #222b3c

Text
  --fg            #eef2f8
  --fg-muted      #8b97ad
  --fg-subtle     #5c6a82

Brand
  --primary       #3b82f6   (actions, links)
  --primary-soft  #1e3a5f

Semantic
  --success       #10b981   (online, paid, earn)
  --warning       #f59e0b   (pending)
  --danger        #ef4444   (stop, ban, error)

Borders
  --border        #273244
  --border-strong #3a4660
```

**Light mode (marketing optional sections / admin preference):** invert neutrals; keep primary blue; keep semantic hues.

**Rules**

- ≤ 1 brand accent (blue)  
- Green only for money/online success  
- Never encode status by color alone (icon + label)  

### 2.2 Typography

| Role | Spec |
|---|---|
| Family | **DM Sans** (UI), **JetBrains Mono** (money, IDs, GB) |
| Display | 32–48 / semibold / tracking -0.02em |
| Title | 20–24 / semibold |
| Body | 15–16 / regular / 1.5 |
| Label | 12–13 / medium / muted |
| Micro | 11 / medium / uppercase tracking for section labels |

Money always **tabular-nums** + mono or feature-settings `"tnum"`.

### 2.3 Radius

| Token | Value | Use |
|---|---|---|
| sm | 8 | chips, inputs inner |
| md | 12 | buttons, inputs |
| lg | 16 | cards |
| xl | 20–24 | hero panels, phone chrome |
| full | 9999 | pills, avatars |

Concentric: parent radius ≈ child radius + padding.

### 2.4 Spacing

4 / 8 / 12 / 16 / 24 / 32 / 48 / 64  

### 2.5 Elevation

Prefer **hairline borders** over heavy shadows.  
One soft shadow for phone mock / modals only.

### 2.6 Motion

| Token | ms |
|---|---|
| micro | 80 |
| quick | 150 |
| fast | 250 |
| slow | 400 |

Easing: `cubic-bezier(0.22, 1, 0.36, 1)`  
Respect `prefers-reduced-motion`.

---

## 3. Component inventory (shared)

Shared package concept: `@relay/ui`

### 3.1 Actions

| Component | Variants |
|---|---|
| **Button** | primary, secondary, ghost, danger, success |
| Sizes | sm (36), md (44), lg (48) — mobile min 44 |
| **IconButton** | ghost / bordered |
| **Button group** | segmented (Wi‑Fi only / All networks) |

### 3.2 Inputs

| Component | Notes |
|---|---|
| **TextField** | label, hint, error |
| **PhoneField** | country code + national number |
| **OTPInput** | 6 cells, auto-advance, paste support |
| **Switch** | Sharing on/off — large touch |
| **Select** | native on mobile; listbox on web |
| **Slider** | daily GB cap |

### 3.3 Data display

| Component | Notes |
|---|---|
| **Money** | `$12.40` mono tabular |
| **GB** | `3.28 GB` mono |
| **StatCard** | label + value + delta |
| **Sparkline** | 7-day earnings |
| **StatusDot** | offline / online / sharing |
| **Badge** | pending / paid / banned |
| **ProgressBar** | withdraw progress to $20 |
| **EmptyState** | icon + title + CTA |
| **DataTable** | admin + web history (TanStack Table) |
| **Timeline** | ledger list |

### 3.4 Overlays

Dialog, Sheet (mobile), Toast, Tooltip, Dropdown  

### 3.5 Navigation

| Surface | Pattern |
|---|---|
| Mobile earner | 3–4 tab bar: Home · History · Wallet · Settings |
| User web | Top bar + left nav (optional compact) |
| Admin | Left sidebar + top metrics |
| Marketing | Top nav + footer |

### 3.6 Domain components

| Component | Description |
|---|---|
| **ShareToggleCard** | Big ON/OFF + status copy |
| **BalanceHero** | Large money + withdraw CTA |
| **WithdrawProgress** | “$14.20 of $20.00” |
| **DeviceRow** | name, status, last seen, GB |
| **LedgerRow** | type icon, description, signed money |
| **OtpGate** | full-screen auth |
| **KpiTile** | admin metric |
| **UserDrawer** | admin detail |

---

## 4. Mobile earner app screens

### 4.1 Information architecture

```text
Auth
  Phone → OTP → (optional name)

Main tabs
  Home
  History
  Wallet
  Settings
```

### 4.2 Home (primary)

```text
┌─────────────────────────────┐
│ Relay              [avatar] │
│                             │
│  Available balance          │
│  $14.20                     │
│  ████████░░░░  $20 withdraw │
│                             │
│  [  Withdraw  ]  (disabled) │
│                             │
│  ┌───────────────────────┐  │
│  │ ● Sharing  ·  Wi‑Fi   │  │
│  │ [  Stop sharing   ]   │  │
│  └───────────────────────┘  │
│                             │
│  Today        This week     │
│  $0.84        $4.12         │
│  2.1 GB       11.4 GB       │
│                             │
│  Recent activity            │
│  · +$0.12 · 0.4 GB · 2h ago │
└─────────────────────────────┘
```

**Copy rules**

- Sharing off: “Start sharing to earn”  
- Sharing on: “Sharing · you’re online”  
- Cellular blocked by setting: “Waiting for Wi‑Fi”  

### 4.3 History

List of daily rolls: date, GB, earned. Filter 7d / 30d / all.

### 4.4 Wallet

- Available / pending / lifetime  
- Ledger entries  
- Withdraw history with badges  
- Payout method status (Stripe)

### 4.5 Settings

- Wi‑Fi only (default ON)  
- Daily data cap  
- Notifications  
- Devices list  
- Legal, support, log out  

### 4.6 Auth

Minimal. Phone → 6-digit OTP → done. No password.

---

## 5. User web dashboard

Same data as mobile, wider layout:

| Region | Content |
|---|---|
| Top bar | Logo, balance chip, avatar |
| Left nav | Overview, History, Wallet, Devices, Settings |
| Overview | BalanceHero, charts (Recharts), device status |
| Wallet | Full ledger table + withdraw |
| Devices | Read-only status (control on phone) |

Responsive: sidebar collapses; mobile web can reuse earner patterns.

---

## 6. Admin dashboard

### 6.1 Nav

Overview · Proxy access · Fleet & tunnels · Users · Devices · Traffic · Withdrawals · Risk

### 6.2 Overview KPIs

- Active devices (sharing)  
- GB last 24h  
- Earn liability (wallet sum)  
- Pending withdrawals $  
- New users today  
- Fraud flags open  

### 6.3 Users table

Dense **data table** (not cards): phone, country, balance, lifetime earn, devices count, Stripe, status, App logs.  
Expandable journey / event strip under the table for a selected user.

### 6.4 Devices fleet (master–detail)

**Do not** use multi-column device **cards** for the fleet list — they waste vertical space and hide density.

| Layer | Layout | Behavior |
|---|---|---|
| **List** | Full-width **table** (sticky header, scroll body) | Status · name/id · user · location · network/ISP · public IP · traffic · exit · job · actions |
| **Filter bar** | Online / offline / all chips + search | Filter name, IP, user, city, ISP without leaving the table |
| **Inspector** | Right column (~320–400px) only when a row is selected | Compact identity + network + actions (probe IP, traffic job, exit, remove). Table stays left. |
| **Full details** | Replaces the section with a single-device page | Multi-column field groups (Identity · Network & geo · Tunnel & traffic) + same actions + probe/traffic panels. **Back to table** returns to list. |

**Interactions**

- Single-click row → open/update **inspector** (in place)  
- **Full** button or double-click row → **full details** page for that device only  
- Close inspector / Close on full page → return to list (or keep selection cleared)  
- Empty state: one empty card with enroll instructions — not a fake grid  

### 6.5 User detail / journey

Profile, wallet, devices link into Devices table selection, traffic, ledger, withdrawals, risk flags; **App logs** with journey strip (install → online).

### 6.6 Withdrawals queue

Pending → approve / reject; show Stripe status (table).

### 6.7 Visual density

Admin is denser (**tables**, 12–13px body, mono for IDs/IPs) but **same tokens** as marketing — not a second brand.  
Prefer **one table + optional side inspector** over card grids for any fleet-scale list (devices, users, withdrawals).

---

## 7. Marketing website

### 7.1 Pages

| Page | Goal |
|---|---|
| **/** Home | Convert: explain earn loop, CTA Get started |
| **/how-it-works** | Trust |
| **/earnings** | Rate transparency |
| **/faq** | Objection handling |
| **/login** | OTP login → dashboard |
| **/legal/** | Privacy, ToS, cookies |

### 7.2 Home sections

1. Nav  
2. Hero — headline + phone mock + CTA  
3. How it works — 3 steps  
4. Earnings preview — calculator (GB × rate)  
5. Trust — security, control, payouts  
6. FAQ teaser  
7. Final CTA  
8. Footer  

### 7.3 Tone

No “unlimited free money”. Honest: earnings depend on demand & sharing time.

---

## 8. Layout grids

| Surface | Grid |
|---|---|
| Marketing | max 1120–1200px content |
| Dashboard | 240px sidebar + fluid main |
| Mobile | 16px page gutter |
| Admin | 260px sidebar + full tables |

---

## 9. Iconography

**Lucide** only. Stroke 1.75–2.  
No emoji in product chrome.

Key icons: `Radio`, `Wallet`, `ArrowDownToLine`, `Smartphone`, `Wifi`, `Shield`, `History`, `CircleDollarSign`

---

## 10. Accessibility

- Contrast AA  
- Focus rings on primary  
- OTP fields labeled  
- Status not color-only  
- Hit targets ≥ 44px on mobile  

---

## 11. Implementation mapping (this codebase)

| Token | Tailwind (v4 `@theme`) |
|---|---|
| `--color-bg` | `bg-bg` |
| `--color-primary` | `bg-primary` `text-primary` |
| `--color-success` | `text-success` |
| fonts | `font-sans` `font-mono` |

Components live under `src/components/ui/*` (primitives) and `src/components/relay/*` (domain).

---

## 12. Deliverable checklist for design QA

- [ ] Marketing hero readable at 390px  
- [ ] Earner home shows money first  
- [ ] No proxy URL anywhere in earner UI  
- [ ] Admin tables scannable  
- [ ] Same blue/success tokens on all four surfaces  
- [ ] Withdraw CTA disabled state until $20  
- [ ] OTP flow works keyboard-only  

---

*End of design system.*
