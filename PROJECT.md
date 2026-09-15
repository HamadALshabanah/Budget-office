# Budget Office — Project Document

> **One line:** A Saudi-market personal budgeting app that turns raw Arabic bank SMS into a categorized, cycle-based spending ledger using a user-owned category tree and keyword rule engine.

**Document status:** describes the codebase as of this writing. Sections marked **[verified]** are read directly from source. Sections marked **[strategy]** are product/business direction, not current state.

---

## 1. The problem

Every card purchase in Saudi Arabia produces a bank SMS in a rigid key–value format:

```
مبلغ: 245.50 SAR لدى: STARBUCKS RIYADH
```

This is a clean, structured transaction feed that arrives on the user's phone, for free, with no bank API, no open-banking licence, and no credentials shared with a third party. Almost nobody uses it well.

Meanwhile, the two existing alternatives each fail in a specific way:

| Alternative | Where it fails |
|---|---|
| **Bank apps** (Al Rajhi, SNB, …) | Classification is driven by merchant category codes — coarse, often generic or wrong for smaller GCC merchants. One taxonomy for millions of users. No persistent correction. Single-bank view. Transfers and refunds frequently counted as spend. |
| **Western trackers** (Monarch, Copilot, YNAB) | Require bank credential aggregation, monthly subscription in USD, and no understanding of Arabic merchant strings or Saudi salary cycles. |
| **Manual trackers** (Money Manager, Bluecoins) | Accurate but high-effort — the user is the parser. |

**The gap:** nobody lets a Saudi user say *"these are my categories, and this merchant always belongs in this one"* — and then actually remembers it.

## 2. The product thesis

**Your categories, not theirs.**

The differentiator is not "see your spending" — bank apps do that for free. It is:

1. **A taxonomy the user owns** — arbitrary depth, defined by them.
2. **Classification that learns from correction** — a user retag becomes a permanent rule.
3. **A local, Saudi-tuned rule pack** — merchant keyword → category, maintained as the product's accumulated IP.
4. **Salary-style budget cycles** rather than calendar months.
5. **Data that never leaves the device** — no server, no credentials, no data-controller obligations.

## 3. Who it is for

- **Primary:** Saudi residents with 2+ bank accounts and card, who want a real budget but find the bank app's categorization useless.
- **Secondary:** freelancers and small businesses needing VAT-tagged expense records.
- **Later:** households sharing a budget.

---

## 4. What exists today **[verified]**

### Ingestion and parsing

| Capability | State |
|---|---|
| SMS → transaction | Implemented. Requires **both** `مبلغ` and `لدى` keys present. Strips literal `"SAR"`. |
| Bank coverage | **Single format only.** No per-bank templates, no sender-ID dispatch. |
| Arabic digit normalization | **Absent.** Arabic-Indic numerals (٠–٩) will fail `float()`. |
| Debit vs credit | **Not implemented.** `Invoice.classification` exists in the model but the ingest path never sets it. A salary SMS would be recorded as spend. |
| Duplicate suppression | **Absent.** |
| Amount/merchant/date extraction | Amount + merchant only. No date, no card last-4, no reference number. |
| Failed extractions | Stored with `extraction_status = "failed"` rather than discarded. Good instinct. |

### Classification

- `app/classify.py` — keyword substring match, first rule wins, returns a `category_id`.
- Rules hold comma-separated `merchant_keywords`, a `classification`, a `category_id`, and an optional `category_limit`.
- `POST /invoices/categorize` re-runs classification across all of a user's invoices.

### Categories

- Self-referencing tree: `Category.parent_id` + `Category.level` (`0 = classification, 1 = main, 2 = sub, …`).
- Per-category `category_limit`.
- Full CRUD via `/categories`.

### Budget cycles

- `Cycle` = `start_date`, `end_date`, `is_active`, per user.
- Start / end / current / history (12 cycles) / per-cycle invoices.
- Per-cycle analysis with **pace tracking** — budget-consumed % vs time-elapsed %, classified `ahead` / `on_track` / `behind`.
- Daily spending timeline with zero-days filled in.
- Ranked top categories with sub-category breakdown.

### Analytics

- `GET /analytics?cycle_id&group_by=bucket|day|merchant&scope=<category_id>`
- One `GROUP BY`, two knobs (`scope` = WHERE, `group_by` = GROUP BY).
- `scope` walks the tree to include descendants. This is the most architecturally interesting piece in the codebase.

### Auth and access

- Username + bcrypt password → JWT (`HS256`).
- Dual auth on every endpoint: **JWT bearer** or **`X-API-KEY` header** (`app/deps.py`).
- API keys stored as SHA-256 hashes, one per user, revocable.

### Frontend

Next.js App Router (JavaScript, not TypeScript), Tailwind, `lucide-react`.

- Pages: dashboard, login, categories, rules, settings.
- Components: `SMSInput`, `InvoiceList`, `BudgetCycle`, `CycleSummary`, `CategoriesPanel`, `BudgetOverview`, `DrillDown`, `SpendingChart`, `TopCategories`, `CategorySelect`, `KeywordsInput`, `CycleAnalysisModal`.
- Bilingual **EN/AR with RTL**, light/dark themes.

---

## 5. Architecture — and the awkward part **[verified]**

The project is **mid-refactor**, and both generations are present:

```
Budget-office/
├── main.py              ← legacy monolith, 756 lines, ~30 endpoints inline
├── models.py            ← legacy models, string-based categories
├── user_session.py      ← legacy auth router + JWT helpers
├── schema.py            ← shared Pydantic contracts (used by both)
│
├── app/                 ← current direction: router-based package
│   ├── main.py          ← mounts auth, sms, invoices, rules, cycles, categories, analytics
│   ├── db.py            ← Base, engine, SessionLocal, init_db()
│   ├── deps.py          ← get_current_user_or_apikey (JWT + API key)
│   ├── classify.py      ← keyword → category_id
│   ├── config.py        ← JWT secret/algorithm from settings.env
│   ├── models/          ← User, APIKey, Invoice, Category, Rule, Cycle, TransferLimit
│   ├── routes/          ← one module per resource
│   └── services/        ← sms.py (EMPTY), cycles.py
│
└── frontend/my-app/     ← Next.js client
```

**The two generations differ fundamentally in how they model categories:**

| | Legacy (`models.py`, `main.py`) | Current (`app/models/`) |
|---|---|---|
| Category storage | Plain strings: `Invoice.main_category`, `Invoice.sub_category` | Normalized FK: `Invoice.category_id` → `Category` tree |
| Rule target | `CategoryRule.main_category` / `sub_category` strings | `Rule.category_id` FK |
| Routing | Monolith | APIRouter per resource |

**`frontend/my-app/lib/api.js` targets the new package** (trailing-slash routes: `/invoices/`, `/categories/`, `/rules/`, `/analytics/`, `/cycles/…`). So `app/` is the live implementation and `main.py` + `models.py` are dead weight that still define duplicate endpoints and a conflicting schema.

### Data model (current)

```
User ──┬── APIKey        (one per user, sha256 hash, revocable)
       ├── Category      (self-referencing: parent_id, level, category_limit)
       ├── Rule          (merchant_keywords, classification, category_id, category_limit)
       ├── Invoice       (raw_invoice, amount, merchant, extraction_status,
       │                  classification, category_id, note, created_at)
       ├── Cycle         (start_date, end_date, is_active)
       └── TransferLimit (from_category, to_category, amount)  ← model only, endpoint commented out
```

---

## 6. Known defects and debt **[verified]**

Ordered by severity. Each is a real, located issue — not a style preference.

### Correctness / security

| # | Issue | Location | Impact |
|---|---|---|---|
| 1 | **`classify_merchant` has no user filter.** `db.query(Rule).all()` loads *every user's* rules and returns the first keyword match. | `app/classify.py:12` | One user's merchant can be classified by another user's rules. Cross-tenant leakage and wrong categories at scale. **Fix first.** |
| 2 | **Plaintext passwords written to stdout.** `print(f"req {req}")` where `req` is the login request. | `app/routes/auth.py:27`; `user_session.py:68` | Credentials in logs, terminal scrollback, and any log aggregator. |
| 3 | **CORS `allow_origins=["*"]` with `allow_credentials=True`.** | `app/main.py:10-16`; `main.py:16-22` | Invalid per spec, rejected by browsers for credentialed requests, and unsafe if "fixed" naively. |
| 4 | **`POST /api-keys` is not mounted.** `app/routes/api_keys.py` exists but is absent from the router list; it also imports from root modules rather than `app.*`. | `app/main.py:17-23` | The Settings page's API-key generation **will 404**. The whole automation/prosumer path is dead on arrival. |
| 5 | JWT lifetime defaults to 6000 minutes (~100 hours), stored in `localStorage`. | `user_session.py:14`; `frontend/my-app/lib/api.js:6` | Long-lived token exposed to XSS. |

### Product-blocking gaps

| # | Issue | Location | Impact |
|---|---|---|---|
| 6 | **The correction → rule loop is designed but not implemented.** `UpdateInvoiceReq.create_rule: bool = False  # Checkbox in UI` exists; the PATCH handler ignores it entirely. | `schema.py:13`; `app/routes/invoices.py:50-64` | This is the single highest-value missing feature. The core thesis ("it learns from you") is currently a comment. |
| 7 | **`Invoice.classification` is never populated.** The model and the legacy parser both carry it; the current ingest path sets amount, merchant, and category only. | `app/routes/sms.py:31-38` | Income, refunds, and transfers are indistinguishable from spending. Every total is potentially wrong. |
| 8 | **Parser is single-bank.** Hard-codes `مبلغ` + `لدى` and a literal `"SAR"` strip. Duplicated in two places with divergent behaviour. | `app/routes/sms.py:12-28`; `main.py:29-64` | Only works for the bank whose format it was reverse-engineered from. |
| 9 | **No duplicates, no confidence, no review queue.** | ingest path | Same transaction logged twice, or a bad parse silently written as fact. |
| 10 | **No migrations.** `init_db()` runs `Base.metadata.create_all()` at import time. | `app/db.py:22`; `app/main.py:7` | Any schema change needs manual DB surgery. Matters as soon as real users exist. |

### Structural

| # | Issue | Impact |
|---|---|---|
| 11 | Two backends with two conflicting schemas and duplicate auth implementations (`app/routes/auth.py` and `user_session.py` both define `/auth/register` + `/auth/login`). | Whichever mounts first wins; behaviour differs. Confusing and untestable. |
| 12 | `app/services/sms.py` is an empty file; parsing lives inline in a route handler and is copied in the legacy monolith. | No seam for the parser — which is the piece that must become a shared, testable, portable library. |
| 13 | `TransferLimit` model exists but the transfer endpoint is commented out. | Dead code; the feature was intended. |
| 14 | No tests anywhere. | Every change to classification is a guess. |

---

## 7. Where the product should go **[strategy]**

### The core constraint

**No user financial data on your servers.** This removes PDPL data-residency burden, SAMA vendor scrutiny, and breach liability. It also removes per-user hosting cost — which is what makes lifetime pricing viable later.

### Consequence: capture moves to the device **[strategy]**

| Platform | Mechanism | Native code required |
|---|---|---|
| Android | `NotificationListenerService` (bank app pushes + SMS notifications) | Yes — Kotlin |
| Android (optional) | `RECEIVE_SMS` receiver / `READ_SMS` backfill | Yes — Kotlin; **Play restricted permission, declaration form required** |
| iOS | On-device **IMAP** — user connects their own mailbox, bank alerts parsed locally | No — pure Dart |
| iOS | Prebuilt Shortcut + `AppIntent` writing to an App Group queue | Yes — Swift |
| Both | Manual paste / share sheet | No — always the fallback |

⚠️ Apple's `SMS Retriever` / `SMS User Consent` APIs are **OTP-only** and useless here. iOS has no third-party SMS inbox access; per-app notification reading does not exist either.

### Build order

1. **Port the parser into a pure, shared, testable module** — no FastAPI, no DB, no HTTP. Arabic-Indic digit normalization, per-bank templates, debit/credit detection, confidence scores, dedup. This is the asset everything else depends on and the piece currently duplicated in two route handlers.
2. **Ship a Saudi rule pack** — merchant keyword → category, versioned as data. This is the maintained IP that justifies recurring revenue.
3. **Implement the correction → rule loop.** One tap to retag → offer "always categorize this merchant this way" → write a `Rule`. Already declared in `schema.py`; just never built.
4. **Go local-first mobile** (Flutter + `drift`/SQLite, parser in pure Dart).
5. **Add monetization** (StoreKit 2 / Play Billing, local receipt verification — no billing server needed).

---

## 8. Business model **[strategy]**

Consumer subscription is a grind; B2B is lumpy but far higher revenue per unit of effort. Do both.

| Plan | Price | Contents |
|---|---|---|
| Free | SAR 0 | Manual entry, 1 account, basic categories. Never crippled. |
| Pro — annual | SAR 149/yr | Auto-capture, unlimited accounts/cycles/rules, full history, exports |
| Pro — lifetime | SAR 399 | Same, one time. Viable *because* there is no per-user serving cost. |
| Family | SAR 249/yr | Shared budget |
| Freelancer | SAR 499/yr | VAT 15%, client tagging, accountant-ready exports |

**Two structural advantages:**

- **No server cost → lifetime pricing works.** A one-time unlock converts far better than yet another subscription in a subscription-fatigued market.
- **"We can't leak your data — we never have it."** Competitors structurally cannot make this claim; they require bank credentials.

**Feasible monetization, ranked:** consumer freemium → household plan → B2B white-label / transaction-enrichment API → employee financial wellness → metered API for power users.

**Not feasible:** lending/credit offers. This is how Money View, Walnut, and CRED monetized in India — and it is exactly the licensed activity this architecture is designed to avoid.

**Avoid:** ads, selling raw data, paywalling security features.

**Store tax is unavoidable on mobile** (15–30%). Annual and lifetime plans mitigate it. A PWA could bill at 0% via Stripe, but iOS may evict IndexedDB for unused sites — unacceptable when the device holds the only copy of a user's financial history.

### Differentiators worth building

| Feature | Why |
|---|---|
| **Zakat calculation** — nisab, hawl countdown, zakatable-wealth breakdown | Culturally central in KSA, badly underserved, defensible, and nobody else is doing it well |
| **Salary-cycle budgeting** | Already built; make it the signature feature instead of a generic month view |
| **Saudi bank format packs** | The recurring-revenue justification — banks change formats, you maintain the parsers |
| **Split transactions** | One supermarket SMS → groceries + household. Bank apps cannot do this. |
| **Freelancer/VAT tier** | The real per-user revenue |
| **Widgets / safe-to-spend** | Cheap to build, disproportionately cited as a paid reason |

### Competitive reality

- The category is mature — SMS/notification capture is proven, shipping technology. You get validation, not novelty.
- **The real competitor is the bank app**, which already categorizes for free.
- Dedicated trackers (YNAB, Bluecoins, Money Manager) already have rules. Your defensible combination is **Saudi/Arabic tuning + on-device trust + frictionless capture** — the thing bank apps and generic trackers each get half right.
- The Indian SMS-parsing apps are *why* Google Play restricted `RECEIVE_SMS`. Prefer the notification listener.

---

## 9. Immediate next steps

| Priority | Task | Rationale |
|---|---|---|
| P0 | Fix the user filter in `classify_merchant` | Cross-tenant leak |
| P0 | Remove password logging | Credentials in logs |
| P0 | Mount / fix the `api-keys` router | A shipped UI feature currently 404s |
| P1 | Delete or freeze the legacy backend | Two schemas is a bug factory |
| P1 | Set `Invoice.classification` on ingest | Totals are wrong without it |
| P1 | Implement `create_rule` | The core thesis |
| P2 | Extract the parser to a pure module + tests | Foundation for everything |
| P2 | Add Alembic migrations | Needed before real users |
| P3 | Saudi rule pack | The monetizable IP |
| P3 | Flutter local-first port | The product direction |

---

## 10. Open questions

1. **iOS strategy** — pure IMAP, prebuilt Shortcut, or skip iOS at launch? Requires a real-device test of whether the Message automation trigger can filter on a bank shortcode sender or needs the user to save it as a contact first.
2. **Android SMS permission** — rely only on the notification listener, or attempt the Play declaration for raw SMS? The listener misses transactions when notifications are off.
3. **Keep the self-hosted server?** — it could become a power-user option where *the user* is the data controller, but maintaining two clients doubles the surface.
4. **Local-first trade-offs to design around** — device loss (backup is mandatory, not optional), no server-pushed notifications, harder support (build a user-initiated diagnostics bundle), harder family sync, no server-side analytics for roadmap decisions.
5. **Does the rule pack stay closed?** — obfuscated and compiled into the binary, or open? Keeping it closed plus making the iOS Shortcut a dumb pipe (three actions that call an App Intent) means there is nothing instructive to copy.
