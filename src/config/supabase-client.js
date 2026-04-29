/**
 * Centralized Supabase client.
 *
 * Requires window.FP_ENV (loaded via src/config/env.js) and the
 * Supabase UMD script from CDN to be loaded BEFORE this file.
 *
 * Exposes window.fpSupa as the single shared client instance.
 * All pages should use window.fpSupa instead of creating their own.
 */
(function () {
  if (!window.supabase || !window.FP_ENV) {
    console.error('[fp-supa] Supabase SDK or FP_ENV not loaded yet');
    return;
  }
  if (window.fpSupa) return; // already initialized
  window.fpSupa = window.supabase.createClient(
    window.FP_ENV.SUPABASE_URL,
    window.FP_ENV.SUPABASE_ANON_KEY
  );
})();
