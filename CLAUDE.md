# FormPilot — Claude Code Project Context

## What this project is
FormPilot is a **bank form-filling web app** for Nigerian bank account opening forms. It has two sides:
- **Officer dashboard** — bank staff log in, select a bank + form type, generate a shareable link, and track submissions
- **Customer filler** — customer opens the link, fills the form through a guided UI, downloads a PDF

No backend. Everything runs in the browser. Data never leaves the device. PDF is generated client-side using `pdf-lib`.

## Owner
Paul Ekwem — building this as a product for Nigerian bank officers and their customers.

---

## File Structure

```
Form Filler App/
├── *.html                  — All page entry points stay at root (URLs stable)
│   ├── index / about / community / privacy / terms — public marketing
│   ├── login / signup / reset-password — officer auth
│   ├── dashboard.html      — Officer dashboard (main app shell)
│   ├── fill.html           — Generic customer form filler (multi-bank fallback)
│   ├── gtbank-form.html    — GTBank Sole Prop/Partnership form (7-screen flow)
│   ├── gtbank-reference.html      — Referee fills + signs reference form
│   └── gtbank-ref-customer.html   — Customer-side intake for reference flow
│
├── src/
│   ├── config/
│   │   ├── env.js                  — Public env (Supabase URL, anon key, app URL)
│   │   ├── supabase-client.js      — Centralized window.fpSupa client
│   │   └── constants.js            — FORM_LIBRARY, BANKS, ROLES, EXPIRY_OPTIONS
│   ├── lib/
│   │   └── form-engine.js          — Two-pass PDF analyse + fill engine
│   ├── pages/
│   │   └── dashboard.js            — Dashboard logic (link gen, routing, table)
│   ├── ui/                         — Reusable UI components (toast, modal — TBD)
│   └── styles/pages/               — landing.css, dashboard.css
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql  — form_access_codes + verify_form_code fn
│   └── functions/send-email/       — Edge Function for Brevo SMTP
│
├── pdfs/                           — Bank PDF templates
├── data/                           — Field mappings + reference docs
├── tests/                          — Unit + E2E tests (TBD Sprint 6)
├── docs/                           — ARCHITECTURE, SECURITY, DEPLOYMENT, CHANGELOG
├── archive/                        — Old prototypes (do not edit)
└── package.json / vercel.json / .gitignore / .env.example
```

---

## Key Architecture Decisions

### Link generation & routing
- Dashboard generates `fill.html?config=<base64>` for most forms
- GTBank Sole Prop / Partnership routes to `gtbank-form.html?config=<base64>` instead (in `dashboard.js` → `buildLink()`)
- Config object: `{ bank, formType, customer, officer, officerEmail, sessionId, note }`

### gtbank-form.html — 7-screen flow
| Screen | Content |
|--------|---------|
| 0 | Welcome + eligibility check (3 questions) |
| 1 | Document checklist + referee contacts |
| 2 | Business details (CAC, address, TIN, SCUML) |
| 3 | Signatory details (tabs: S1, S2, S3) |
| 4 | Account services (payroll, GAPS, cheques) |
| 5 | Next of kin + disability + legal consents |
| 6 | Review all + generate PDF |

- All form state lives in `FD` (plain object), multi-select in `MULTI` (Set), consents in `CONSENTS`
- Auto-save to `localStorage` on every input (`gtb_fd`, `gtb_multi`, `gtb_consents`)
- URL config parsed from `?config=` param — officer name shown in orange banner, customer name pre-fills signatory fields
- Signatory forms built dynamically via `buildSignatoryForm(n)` function
- PDF generated with `pdf-lib` — GTBank-branded, orange header, all fields

### fill.html — generic multi-step filler
- Used for all banks except GTBank Sole Prop
- Reads `?config=` param, routes to correct step definitions via `getFormSteps(bank, formType)`
- Has step definitions for: GTBank Sole Prop (legacy), GTBank Corporate, GTBank KYC, generic fallback

### dashboard.js
- `FORM_LIBRARY` object maps bank → available form types
- GTBank has: Individual, Sole Prop/Partnership, Corporate, Trustees, Societies, KYC, GAPS
- `buildLink(config)` — routes GTBank Sole Prop to `gtbank-form.html`, others to `fill.html`
- Forms stored in `localStorage` as `fp_forms`
- Session from `sessionStorage` as `fp_user`

---

## PDF Forms Available (raw PDFs in root)
- `Account-Opening-Documentation-Sole-Proprietorship-Partnership-Form-Jan-2026.pdf` — 20 pages, ~191 fields
- `Account-Opening-Documentation-Corporate-Jan-2026.pdf`
- `Account-Opening-Documentation-Trustees_-Jan-2026.pdf`
- `Account-Opening-Form-Unincorporated-Societies-Account_Jan-2026.pdf`

---

## Forms Built So Far
| Form | Status | File |
|------|--------|------|
| GTBank Sole Prop / Partnership | ✅ Complete | `gtbank-form.html` |
| GTBank Corporate | 🔲 Not started | — |
| GTBank KYC | 🔲 Stub only in fill.html | — |
| GTBank Individual | 🔲 Not started | — |
| Access Bank Individual | 🔲 Not started | — |
| Others | 🔲 Not started | — |

---

## UI Conventions
- GTBank brand: `--gt-orange: #E8470A`, DM Serif Display + DM Sans fonts
- Chip buttons for radio/multi-select (`.chip`, `.chip-multi`)
- Form cards with section headers (`.form-card`, `.form-section-head`)
- Conditional sections use `.conditional` class + `showEl(id)` / `hideEl(id)`
- Error display: `.form-err` + `.show` class, red border on input via `.err`
- BVN field has special 11-digit validation + green tick indicator

## Known Patterns
- `saveField(key, value)` — saves to FD + triggers autoSave
- `selectChip(field, value, el)` — single-select chip
- `toggleMulti(field, value, el)` — multi-select chip
- `populateSelect(id, options, blank)` — fills a `<select>` element
- `validateAndNext(fromScreen, toScreen)` — validates required fields then navigates
- `goToScreen(n)` — handles screen transition, progress bar, special screen hooks

---

## Pending / Next Work

See `docs/CHANGELOG.md` for sprint progress.

**Engineering sprints:**
- Sprint 2 — Security foundation (RLS audit, CSP, kill EmailJS, remove dummy data)
- Sprint 3 — Move `fp_forms` localStorage → Supabase `forms` table with RLS
- Sprint 4 — Design system (tokens, Lucide icons, unified DM Sans/Serif)
- Sprint 5 — UX polish (loading states, PDF preview, trust layer)
- Sprint 6 — CI + tests (Playwright, Vitest, GitHub Actions)
- Sprint 7 — NDPR compliance + audit log

**Product features pending:**
- "Same as business address" toggle in signatory residential address
- "Copy from owner" toggle for next of kin
- Mandate visual cards (sole / joint / custom)
- GTBank Corporate / Individual / KYC forms

**Sprint 1 migration debt** (clear in Sprint 2):
- `login.html`, `signup.html`, `dashboard.html`, all `gtbank-*.html` still create their own Supabase clients inline. Migrate to `<script src="src/config/supabase-client.js">` + use `window.fpSupa`.
- `dashboard.js` still has hardcoded `FORM_LIBRARY`. Migrate to `window.FP_CONSTANTS.FORM_LIBRARY`.

---

## User Preferences
- Friendly, emoji-rich UI for customer-facing forms
- Clean, professional UI for officer dashboard
- No backend — keep everything client-side
- PDF must be print-ready and bank-branded
- Auto-save is critical — users should never lose progress
