# Security Model

## Threat model

| Actor | Capability | Mitigation |
|---|---|---|
| Anyone with the public URL | Read public pages, hit Supabase REST with anon key | RLS policies (every table must have one) |
| Logged-in officer | Read own forms, generate links, send emails | RLS scoped to `auth.uid()` |
| Compromised CDN | Inject script into a page that runs Supabase calls | SRI hashes on every CDN script + strict CSP |
| Brute-force attacker | Guess access codes for known session slugs | `verify_form_code` function locks after 5 attempts for 15 min |
| Network observer | See URLs in transit | HTTPS-only (HSTS — pending) |

## Public values vs secrets

**Public (in repo, in browser, fine):**
- Supabase URL
- Supabase **anon** key (designed for client use; security is in RLS)
- Sentry DSN loader URL
- Vercel domain

**Secret (Vercel env vars only, never in repo):**
- Supabase **service_role** key
- Brevo API key
- Sender email account credentials
- Any third-party API key with elevated scope

If you see a service_role key in client code, **rotate it immediately** in Supabase Dashboard → Settings → API.

## RLS policy map

> ⚠️ This is the planned end state. Current state has gaps — see Sprint 2.

| Table | anon SELECT | anon INSERT | anon UPDATE | authenticated |
|---|---|---|---|---|
| `form_access_codes` | ❌ | ✅ (officer creates) | ❌ | scoped by officer_id |
| `forms` (planned) | ❌ | ❌ | ❌ | scoped by officer_id |
| `audit_log` (planned) | ❌ | via SECURITY DEFINER fn | ❌ | read own only |

Verification logic that needs to read locked-down rows runs in `SECURITY DEFINER` Postgres functions (e.g. `verify_form_code`). These run with the function-owner's privileges, NOT the caller's.

## Browser-side defenses

| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | strict allowlist (see vercel.json) | Stops injected scripts from loading or beaconing |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS for 1 year |
| `X-Frame-Options` | `DENY` | Clickjacking protection |
| `X-Content-Type-Options` | `nosniff` | MIME-type confusion attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Don't leak URL params cross-origin |
| `Permissions-Policy` | camera, mic, geolocation, payment, usb, FLoC all disabled | Reduce attack surface |
| `Cross-Origin-Opener-Policy` | `same-origin` | Spectre / cross-tab isolation |
| `Cross-Origin-Resource-Policy` | `same-origin` | Restrict who can embed our resources |

**SRI (Subresource Integrity)** — every external `<script src>` carries an `integrity="sha384-…"` hash + `crossorigin="anonymous"`. If a CDN is compromised and serves modified bytes, the browser refuses to execute. Verified Sprint 2 — all CDN scripts in active HTML files have SRI.

**CSP allowlist** (production): scripts from `js-de.sentry-cdn.com`, `*.sentry.io`, `cdn.jsdelivr.net`, `cdnjs.cloudflare.com`, `unpkg.com`. Anything else is blocked.

## Brute-force protection

`form_access_codes.failed_attempts` increments on every wrong code. After 5 failures, `locked_until = now + 15min` blocks all attempts on that session. Protection lives server-side in `verify_form_code` (SECURITY DEFINER) so client tampering can't bypass it.

## Compliance posture

| Regulation | Status | Sprint |
|---|---|---|
| NDPR (Nigeria Data Protection Regulation) | Not yet compliant — generic privacy policy | Sprint 7 |
| NDPA 2023 (Nigeria Data Protection Act) | Same as above | Sprint 7 |
| PCI-DSS | Out of scope (we never touch card data) | — |
| GDPR | Customers are Nigerian; minimal applicability | — |

NDPR essentials we still need:
- Explicit consent checkboxes (not bundled into ToS)
- Data subject access request flow
- Data retention policy (when does form metadata get purged?)
- Breach notification process

## Reporting

If you find a vulnerability, email security@formpilot.app (TBD) or open a private security advisory on GitHub.
