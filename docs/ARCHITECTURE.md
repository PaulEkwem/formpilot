# Architecture

## Why client-side?

FormPilot's biggest competitive advantage is that **customer form data never leaves the customer's device**. Nigerian customers have justified fears about banks losing or leaking their personal info. By generating the PDF in the browser, we sidestep:

- GDPR / NDPR data-controller obligations for the most sensitive fields
- Storage cost and breach surface area
- The "where is my data?" trust gap that kills adoption

What goes server-side (Supabase):
- Officer auth (email, name, bank, role)
- Form metadata (link slug, expiry, status — but NOT the filled values)
- Audit log entries (planned, Sprint 7)

What stays client-side only:
- All field values (BVN, name, address, signatory details, etc.)
- The rendered PDF (offered to user as download)
- Auto-saved progress (localStorage, key-scoped per session)

## Two-pass PDF approach

Static bank PDFs aren't fillable AcroForms. The `FormEngine` (`src/lib/form-engine.js`) reads the PDF twice:

1. **Pass 1 — `analyse()`** — pdfjs walks the operator list, extracts text labels and the drawn horizontal lines that represent blank fields. Spatial matching rules (inline → below → above) pair each blank with its nearest label.
2. **Pass 2 — `fill()`** — pdf-lib loads the same bytes and stamps user values at the detected coordinates.

Because we detect coordinates at runtime, field positions never need to be hardcoded. When GTBank ships an updated form, the same engine works without code changes.

## Routing

Customer-facing URLs are constructed by `dashboard.js → buildLink()`:

| Bank + form | Routes to |
|---|---|
| GTBank Sole Prop / Partnership | `gtbank-form.html?config=<base64>` |
| GTBank Reference Form | `gtbank-ref-customer.html?config=<base64>` (officer→customer) |
| Reference referee | `gtbank-reference.html?r=<slug>` (customer→referee) |
| Everything else | `fill.html?config=<base64>` (generic multi-step) |

The `?config=` payload is base64-encoded JSON: `{ bank, formType, customer, officer, officerEmail, sessionId, note }`. It is **not encrypted** — it's metadata, not customer data.

## Module layering

```
config/    ← env, constants (no dependencies)
   ↓
lib/       ← form-engine, validators (depend on config)
   ↓
ui/        ← toast, modal (depend on config + lib)
   ↓
pages/     ← dashboard.js (depend on everything)
```

Higher layers may import lower layers; never the reverse.
