/**
 * Application-wide constants.
 *
 * Will eventually be replaced by a Supabase table (so adding a new bank
 * doesn't require a code deploy). For now, single source of truth here.
 */
window.FP_CONSTANTS = {
  // Supported banks (signup dropdown + dashboard filter)
  BANKS: [
    'Access Bank',
    'First Bank',
    'GTBank',
    'UBA',
    'Zenith Bank',
    'Stanbic IBTC',
    'FCMB',
    'Fidelity Bank',
    'Union Bank',
    'Sterling Bank',
    'Polaris Bank',
    'Wema Bank',
    'Other',
  ],

  // Officer roles
  ROLES: [
    'Account Officer',
    'Relationship Manager',
    'Branch Manager',
    'Customer Service Officer',
    'Operations Officer',
    'Other',
  ],

  // Forms ready for production (gates "Ready" vs "Coming soon" badge)
  READY_FORMS: new Set([
    'GTBank|Account Opening — Sole Proprietorship / Partnership',
    'GTBank|Reference Form',
  ]),

  // Form library — will move to DB. Each bank → array of available forms.
  FORM_LIBRARY: {
    'Access Bank': [
      { type: 'Account Opening — Individual',  icon: 'user' },
      { type: 'Account Opening — Business',    icon: 'building' },
      { type: 'KYC Update',                    icon: 'refresh-cw' },
      { type: 'Mandate Form',                  icon: 'pen-tool' },
      { type: 'Change of Address',             icon: 'map-pin' },
      { type: 'Indemnity Form',                icon: 'file-text' },
    ],
    'GTBank': [
      { type: 'Account Opening — Individual',                        icon: 'user' },
      { type: 'Account Opening — Sole Proprietorship / Partnership', icon: 'store' },
      { type: 'Account Opening — Corporate',                         icon: 'building' },
      { type: 'Account Opening — Trustees',                          icon: 'scale' },
      { type: 'Account Opening — Societies',                         icon: 'users' },
      { type: 'Reference Form',                                      icon: 'edit-3' },
      { type: 'KYC Update',                                          icon: 'refresh-cw' },
      { type: 'GAPS / Internet Banking',                             icon: 'monitor' },
    ],
    'Zenith Bank': [
      { type: 'Account Opening — Individual',  icon: 'user' },
      { type: 'Account Opening — Business',    icon: 'building' },
      { type: 'KYC Update',                    icon: 'refresh-cw' },
      { type: 'Indemnity Form',                icon: 'file-text' },
    ],
    'First Bank': [
      { type: 'Account Opening — Individual',  icon: 'user' },
      { type: 'KYC Update',                    icon: 'refresh-cw' },
      { type: 'Mandate Form',                  icon: 'pen-tool' },
    ],
    'UBA': [
      { type: 'Account Opening — Individual',  icon: 'user' },
      { type: 'Account Opening — Business',    icon: 'building' },
      { type: 'KYC Update',                    icon: 'refresh-cw' },
      { type: 'Change of Address',             icon: 'map-pin' },
    ],
    'Stanbic IBTC': [
      { type: 'Account Opening — Individual',  icon: 'user' },
      { type: 'KYC Update',                    icon: 'refresh-cw' },
    ],
    'FCMB':         [],
    'Fidelity Bank':[],
    'Union Bank':   [],
    'Sterling Bank':[],
    'Polaris Bank': [],
    'Wema Bank':    [],
  },

  // Link expiry options (hours)
  EXPIRY_OPTIONS: [
    { hours: 24,  label: '24 hours' },
    { hours: 48,  label: '48 hours' },
    { hours: 72,  label: '3 days' },
    { hours: 168, label: '7 days' },
    { hours: 720, label: '30 days' },
  ],

  // Brute-force lockout config (mirrors supabase verify_form_code function)
  AUTH: {
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_MINUTES: 15,
  },
};
