/**
 * Email helper — calls the Supabase Edge Function `send-email` (Brevo SMTP).
 *
 * Replaces the previous EmailJS integration. Benefits:
 *  - No client-side API key
 *  - Brevo credentials live in Supabase Edge Function secrets
 *  - One mail provider, one bill, one allowlist entry in CSP
 *
 * Usage:
 *   await window.fpEmail.send({
 *     to: 'jane@example.com',
 *     subject: 'Your GTBank reference link',
 *     text: 'Hi Jane, …',
 *     html: '<p>Hi Jane, …</p>'   // optional
 *   });
 *
 * Requires window.FP_ENV to be loaded (see src/config/env.js).
 *
 * Returns { ok: true, id } on success, { ok: false, error } on failure.
 * Never throws — callers should check `.ok`.
 */
(function () {
  function buildUrl() {
    if (!window.FP_ENV || !window.FP_ENV.SUPABASE_URL) {
      return null;
    }
    return window.FP_ENV.SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/send-email';
  }

  async function send({ to, subject, text, html }) {
    const url = buildUrl();
    if (!url) return { ok: false, error: 'FP_ENV not configured' };
    if (!to || !subject || !text) {
      return { ok: false, error: 'to, subject, text are required' };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + window.FP_ENV.SUPABASE_ANON_KEY,
          'apikey': window.FP_ENV.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ to, subject, text, html }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || ('HTTP ' + res.status) };
      }
      return { ok: true, id: data.id };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : String(err) };
    }
  }

  window.fpEmail = { send };
})();
