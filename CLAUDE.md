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
├── index.html              — Landing / marketing page
├── login.html              — Officer login
├── signup.html             — Officer signup
├── dashboard.html          — Officer dashboard (main app shell)
├── fill.html               — Generic customer form filler (multi-bank)
├── gtbank-form.html        — GTBank Sole Prop/Partnership dedicated form (full 7-screen flow)
├── about.html
├── community.html
├── privacy.html
├── terms.html
├── assets/
│   ├── css/
│   │   ├── dashboard.css   — Dashboard styles
│   │   └── landing.css     — Landing page styles
│   └── js/
│       └── dashboard.js    — Dashboard logic (form library, link generation, routing)
└── data/
    ├── gtbank-sole-prop-fields.md       — Field reference extracted from PDF
    ├── gtbank-sole-prop-full-content.md — Full page-by-page PDF content
    └── fieldMappings.json
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
- Tally.so-style redesign of `gtbank-form.html` — full viewport slides, one question per screen, emoji stickers, auto-advance on selection, keyboard navigation (user requested, not yet built)
- "Same as business address" toggle in signatory residential address
- "Copy from owner" toggle for next of kin
- Mandate visual cards (sole / joint / custom)
- GTBank Corporate form
- GTBank Individual form

---

## User Preferences
- Friendly, emoji-rich UI for customer-facing forms
- Clean, professional UI for officer dashboard
- No backend — keep everything client-side
- PDF must be print-ready and bank-branded
- Auto-save is critical — users should never lose progress
