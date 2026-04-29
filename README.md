# FormPilot

Bank form-filling web app for Nigerian banks. Officers log in, select a bank + form type, and send a guided link to their customer. The customer fills the form on any device — data never leaves their browser — and downloads a print-ready, bank-branded PDF.

> Built by [Paul Ekwem](https://github.com/PaulEkwem) at Syndra Technologies.

## What it does

- **Officer side** — sign up, log in, generate shareable form links, track submissions
- **Customer side** — open the link, fill the form through a guided UI, download a PDF
- **Reference flow** — customer forwards a referee link; the referee fills + signs; PDF returns to the officer

No backend logic for the form fill itself — everything happens in the customer's browser. Auth and link metadata go through Supabase. Email delivery goes through a Supabase Edge Function backed by Brevo.

## Tech stack

| Layer | Stack |
|---|---|
| Hosting | Vercel (static) |
| Auth + DB | Supabase (Postgres + RLS) |
| PDF generation | pdf-lib + pdfjs (browser) |
| Email | Supabase Edge Function → Brevo SMTP |
| Observability | Sentry (with session replay) |
| Fonts | DM Serif Display + DM Sans |

## Local development

```bash
# Serve the static site on port 5173
npm run dev
# → open http://localhost:5173
```

No build step. All HTML files at the project root, all assets in `src/`.

## Project structure

```
formpilot/
├── *.html                    # All page entry points (index, login, dashboard, forms…)
├── src/
│   ├── config/               # Supabase client, env, constants
│   ├── lib/                  # Reusable libraries (form-engine, etc.)
│   ├── pages/                # Page-specific JS (dashboard.js)
│   ├── ui/                   # Reusable UI components (toast, modal…)
│   └── styles/               # CSS — tokens, base, components, pages
├── supabase/
│   ├── migrations/           # Versioned SQL — apply in order
│   └── functions/            # Edge Functions (send-email)
├── pdfs/                     # PDF templates
├── data/                     # Field mappings + reference docs
├── tests/                    # Unit + E2E tests
├── docs/                     # Architecture, security, deployment
├── scripts/                  # Helper scripts
└── archive/                  # Old prototypes (do not use)
```

## Deployment

Push to `main` → Vercel auto-deploys to https://formpilot-five.vercel.app.

Vercel project settings hold these secrets (NOT in this repo):
- `BREVO_API_KEY`
- `SENDER_EMAIL`

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — why decisions were made
- [docs/SECURITY.md](docs/SECURITY.md) — threat model + RLS map
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — how to deploy
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — sprint-by-sprint changes

## License

Proprietary. © Syndra Technologies. All rights reserved.
