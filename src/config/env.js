/**
 * Public environment config.
 *
 * These values are PUBLIC by design — Supabase anon keys are intended
 * for client-side use. Real security lives in RLS policies, not in
 * hiding this file. See docs/SECURITY.md for the threat model.
 *
 * To rotate these values, update here and redeploy.
 */
window.FP_ENV = {
  SUPABASE_URL: 'https://dlpbnucipzudsrsbvodp.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRscGJudWNpcHp1ZHNyc2J2b2RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2Mjg2NDgsImV4cCI6MjA5MjIwNDY0OH0.DbdGffZsbhZXqerLrG_q1dTh_MOWn6xv5QCYGY-6K-c',
  SENTRY_DSN_LOADER: 'https://js-de.sentry-cdn.com/ed4791c8fab32830252deec1e983dcce.min.js',
  APP_BASE_URL: 'https://formpilot-five.vercel.app',
  APP_NAME: 'FormPilot',
};
