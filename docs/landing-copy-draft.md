# Landing page — copy + visual draft

> **Status:** Draft for Paul's review. Nothing in `index.html` has been changed. Once you approve copy + direction, I'll build the actual page.

---

## Audience reality check

The buyer/user is a **Nigerian bank account officer** at branch level. Their pain:

- Customers bring filled forms back wrong → re-do appointments
- WhatsApp pictures of half-filled forms, manual re-typing
- No visibility into who completed what
- Branch volume pressure: 20–50 customer appointments per officer per month
- Senior management wants completion metrics

Their alternatives today:
1. Paper forms (95%+ of cases)
2. Bank's in-house onboarding portal (if it exists, often clunky)
3. Tally/Typeform — but NOT bank-specific, doesn't produce a branded PDF
4. WhatsApp + manual entry (the depressing default)

So the pitch is **"the bank-form experience customers actually complete."** Not "another form builder."

---

## Hero — copy options (I'll narrow to one once you pick)

### 🅐 Option A — direct, utilitarian

**H1:** Stop redoing bank forms.

**Subhead:** Send a guided link. Your customer fills it on any device. A clean, bank-ready PDF lands in their hands. Done — no re-do appointments, no WhatsApp pictures, no manual entry.

**CTA:** Start free trial · See how it works

---

### 🅑 Option B — outcome promise (my pick)

**H1:** Your customer fills the form right. The first time.

**Subhead:** FormPilot turns Nigeria's nightmare bank forms into a 3-minute guided experience. You send a smart link. Your customer fills it on any device. A bank-branded PDF lands in their hands — no errors, no missed fields, no second visits.

**CTA:** Start free for 14 days · Watch a 60s demo

---

### 🅒 Option C — empathy first

**H1:** Built for the officer who hates redoing forms.

**Subhead:** You know the drill — the customer brings the form back wrong, you book another appointment, the queue grows. FormPilot ends that. Send a smart link. Get a clean PDF. Move on.

**CTA:** Get started free · See it in action

---

## Trust bar (right under hero)

> Currently: "Now live for GTBank, Access & Zenith forms"
>
> **Proposed:** "Built for forms from **GTBank · Access Bank · Zenith · UBA · First Bank** — and growing"
>
> Add a small line beneath: *"Your customer's data never leaves their device. Not now, not ever."* (this is a real differentiator — most competitors store form data server-side)

---

## "How it works" (3 steps, very visual)

> Each step gets a numbered card with a Lucide icon + 1-line headline + 1 sentence.

**01. Send the link** (icon: `send`)
You pick the bank and form type from your dashboard, drop in your customer's name, and copy the link. Or send it via WhatsApp / email straight from the dashboard.

**02. Customer fills on any device** (icon: `smartphone`)
They open the link, answer one question per screen, take a quick selfie if needed for KYC, and save as they go. Works on any phone, no app to install.

**03. A bank-ready PDF lands** (icon: `file-check`)
Print-ready, branded, every field in the right spot. The customer downloads and brings it. You stop re-typing. They stop coming back twice.

---

## "Why officers switch" (3 cards)

### 🎯 Higher completion rates
> "Customers actually finish FormPilot links. Compared to PDFs sent via WhatsApp — where most never come back filled — we see [X]% completion within 24 hours."
>
> *(replace [X] with real number once we have data; until then drop the stat)*

### 🛡️ Customer data stays on their device
> No cloud storage. No third-party server. We don't know your customer's BVN. Your compliance team will love this.

### 📊 Track every form in one place
> See who's completed, who's pending, who's expired. Resend with one click. Export CSV at month-end for your performance review.

---

## Banks supported (logo bar)

> If you have permission to use the logos, this is the most powerful trust signal. If not, use the bank name as text in a styled chip.
>
> Currently the page lists banks as `.bank-tag` chips — keep that, just upgrade the visual treatment to look more premium (subtle shadow, hover lift).

---

## Pricing block

> **Question for you:** Is there a current pricing model? Right now the landing CTA says "Start free trial" but I don't see a pricing page or tier definition anywhere in the codebase.
>
> **Recommended placeholder for V1 launch:**
>
> "**Free during early access** — we're onboarding the first 100 Nigerian bank officers. No credit card. Help us shape what comes next."
>
> This sets honest expectations + builds urgency. Switch to a tiered pricing page after 100 signups.

---

## Final CTA / footer

**H2:** Ready to stop redoing forms?

**Subhead:** Sign up free in under a minute. No credit card. No setup call. Just send your first link.

**CTA:** Create your free account

---

## Visual direction (for the actual build)

When you approve the copy, here's the visual direction I'd build:

### Hero
- **Layout:** Two-pane on desktop (text left 55%, mockup right 45%), stacked on mobile (mockup top, text below).
- **Background:** Soft warm gradient — `radial-gradient(circle at 0% 0%, var(--fp-orange-50), transparent 60%), linear-gradient(to bottom, #fff, var(--fp-bg-soft))`. Premium, not a flat block.
- **Mockup:** The current `.hero-mockup` in `index.html` is a decent baseline. Upgrade with: subtle floating shadow (`--fp-shadow-xl`), soft tilt (`transform: perspective(1200px) rotateY(-5deg) rotateX(2deg)`), and a thin orange ring to draw the eye.
- **Typography:** Switch to DM Serif Display for `<h1>`, DM Sans for everything else (matches our token system).

### Sections
- White on warm-cream alternating backgrounds
- Each section has a clear emoji or Lucide icon "eyebrow" tag above the header
- Hand-drawn arrows between "How it works" steps (a la Linear.app) — small, restrained
- Cards lift on hover (`.fp-card-hover`)

### Mobile
- Stack everything
- Hero mockup compresses to 70% width, centered
- CTA buttons go full-width

---

## What I need from you

Before I touch `index.html`:

1. **Hero copy:** A, B, or C? Or remix?
2. **Pricing:** Is there a real plan, or do we ship "free during early access"?
3. **Banks:** Logos OK to use, or text-only for now?
4. **Stat in "completion rates":** Do you have real numbers, or remove the stat for V1?
5. **Demo video:** "Watch a 60s demo" — do you have one, or remove the secondary CTA?

Once I know your answers, the actual landing rebuild is ~2 hours and ships in one commit.
