/**
 * Audit logging — calls log_audit() via Supabase RPC.
 *
 * Usage:
 *   await window.fpAudit.log('form.generated', {
 *     resource_type: 'form',
 *     resource_id: slug,
 *     metadata: { bank, type }
 *   });
 *
 * Backend (migration 004_audit_log.sql) runs SECURITY DEFINER and pulls
 * officer_id from auth.uid() — caller cannot spoof attribution.
 *
 * Never throws; logs failures to console. Audit is fire-and-forget.
 *
 * Common actions:
 *   auth.login            — successful login
 *   auth.logout           — logout
 *   form.generated        — officer creates a link
 *   form.resent           — officer resends
 *   form.copied           — officer copies link to clipboard
 *   form.completed        — customer finished filling (detected via poll)
 *   data.deletion_request — someone requests their data be erased
 */
(function () {
  function log(action, opts = {}) {
    if (!window.fpSupa) {
      console.warn('[fp-audit] fpSupa not ready, skipping log:', action);
      return Promise.resolve({ ok: false });
    }
    if (!action || typeof action !== 'string') {
      console.warn('[fp-audit] action required');
      return Promise.resolve({ ok: false });
    }
    return window.fpSupa.rpc('log_audit', {
      p_action:        action,
      p_resource_type: opts.resource_type || null,
      p_resource_id:   opts.resource_id   || null,
      p_metadata:      opts.metadata      || null,
    }).then(({ data, error }) => {
      if (error) {
        console.warn('[fp-audit] log failed:', action, error.message);
        return { ok: false, error: error.message };
      }
      return { ok: true, id: data };
    }).catch((err) => {
      console.warn('[fp-audit] log threw:', action, err);
      return { ok: false, error: String(err) };
    });
  }

  window.fpAudit = { log };
})();
