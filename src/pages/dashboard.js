// ── Form library — sourced from FP_CONSTANTS (src/config/constants.js) ──
if (!window.FP_CONSTANTS) {
  console.error('[dashboard] FP_CONSTANTS not loaded — check script order in dashboard.html');
}
const FORM_LIBRARY = (window.FP_CONSTANTS && window.FP_CONSTANTS.FORM_LIBRARY) || {};

// ── Supabase — shared client from src/config/supabase-client.js ─────────
if (!window.fpSupa) {
  console.error('[dashboard] fpSupa not loaded — check script order in dashboard.html');
}
const supa = window.fpSupa;

// ── Session ───────────────────────────────────────────────────
const session = (() => {
  try { return JSON.parse(sessionStorage.getItem('fp_user') || '{}'); } catch(e) { return {}; }
})();

// Guard — redirect to login if no session
if (!session.name) { window.location.href = 'login.html'; }

function doLogout() {
  if (window.fpAudit) window.fpAudit.log('auth.logout');
  supa.auth.signOut().finally(() => {
    sessionStorage.removeItem('fp_user');
    window.location.href = 'login.html';
  });
}

// Log dashboard load (first auth event since login). Fire-and-forget.
if (window.fpAudit) {
  // Wait a tick so fpAudit / fpSupa are fully initialized.
  setTimeout(() => window.fpAudit.log('dashboard.loaded'), 50);
}

const OFFICER_NAME  = session.name  || '';
const OFFICER_EMAIL = session.email || '';
const OFFICER_BANK  = session.bank  || '';

// Update profile display
document.querySelectorAll('.profile-info strong').forEach(el => el.textContent = OFFICER_NAME);
document.querySelectorAll('.profile-info span').forEach(el   => el.textContent = OFFICER_BANK);

// Update greeting
const greetingEl = document.querySelector('#view-overview .page-header h1');
if (greetingEl) {
  const hour = new Date().getHours();
  const time = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  greetingEl.textContent = `Good ${time}, ${OFFICER_NAME.split(' ')[0]} 👋`;
}

// ── Forms — Supabase is source of truth, localStorage is read-through cache ───
//
// Flow:
//   1. On load, render from cache instantly (offline-friendly).
//   2. Async refreshForms() fetches from Supabase, replaces ALL_FORMS, re-renders.
//   3. Generating a new link inserts to Supabase + appends to ALL_FORMS optimistically.
//   4. Cache is rewritten after every successful refresh.

function loadCachedForms() {
  try {
    const stored = JSON.parse(localStorage.getItem('fp_forms') || 'null');
    return Array.isArray(stored) ? stored : [];
  } catch (e) { return []; }
}

function saveForms(forms) {
  // Write-through cache. Source of truth is Supabase.
  try { localStorage.setItem('fp_forms', JSON.stringify(forms)); } catch (e) {}
}

// ── Display helpers ───────────────────────────────────────────────────
function relativeTime(ms) {
  const diff = Date.now() - ms;
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return 'Just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return hr === 1 ? '1 hour ago' : `${hr} hours ago`;
  const d = new Date(ms);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function initialsFor(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  if (parts.length === 1) return (parts[0].slice(0, 2) || '??').toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// DB row → dashboard view shape (what the existing render code expects)
function rowToDashboard(r) {
  const sentAt = new Date(r.created_at).getTime();
  return {
    sessionId: r.slug,
    customer:  r.customer_name,
    initials:  initialsFor(r.customer_name),
    bank:      r.bank,
    type:      r.form_type,
    sent:      relativeTime(sentAt),
    status:    r.status,
    sentAt,
    link:      r.link,
    config:    r.config || {},
  };
}

// Dashboard form row → DB insert payload (officer_id auto-set by table default)
function dashboardToRow(form) {
  const expiresAt = form.config && form.config.expiresAt
    ? new Date(form.config.expiresAt).toISOString()
    : null;
  return {
    slug:           form.sessionId,
    bank:           form.bank,
    form_type:      form.type,
    customer_name:  form.customer,
    customer_email: (form.config && form.config.custEmail) || null,
    customer_phone: (form.config && form.config.custPhone) || null,
    director_name:  (form.config && form.config.directorName) || null,
    ref_type:       (form.config && form.config.refType) || null,
    status:         form.status || 'pending',
    config:         form.config || null,
    link:           form.link || null,
    expires_at:     expiresAt,
  };
}

// ── State ─────────────────────────────────────────────────────────────
let ALL_FORMS = loadCachedForms();   // start from cache for instant render
let _formsLoaded = false;

// ── Rendering ─────────────────────────────────────────────────────────
function reloadForms() {
  updateStatCards();
  renderAllForms(ALL_FORMS);
  renderRecentForms();
}

// ── Async fetch ───────────────────────────────────────────────────────
async function refreshForms() {
  if (!supa) return;
  const { data, error } = await supa
    .from('forms')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[dashboard] forms fetch failed:', error.message);
    return;
  }
  ALL_FORMS = (data || []).map(rowToDashboard);
  _formsLoaded = true;
  saveForms(ALL_FORMS);
  reloadForms();
}

// One-time backfill: if Supabase has no forms for this officer but
// localStorage has legacy entries, push them up.
async function backfillIfNeeded() {
  if (!supa) return;
  if (localStorage.getItem('fp_forms_backfilled') === '1') return;

  const cached = loadCachedForms();
  if (!cached.length) {
    localStorage.setItem('fp_forms_backfilled', '1');
    return;
  }

  const { count, error: cErr } = await supa
    .from('forms').select('*', { count: 'exact', head: true });
  if (cErr) {
    console.warn('[dashboard] backfill count check failed:', cErr.message);
    return;
  }
  if (count && count > 0) {
    localStorage.setItem('fp_forms_backfilled', '1');
    return;
  }

  const rows = cached.map(dashboardToRow);
  const { error } = await supa.from('forms').insert(rows);
  if (error) {
    console.warn('[dashboard] backfill insert failed:', error.message);
    return;
  }
  console.log('[dashboard] backfilled', rows.length, 'forms from localStorage');
  localStorage.setItem('fp_forms_backfilled', '1');
}

// Kick off async work after first paint. Don't block initial render.
(async () => {
  try {
    await backfillIfNeeded();
    await refreshForms();
  } catch (e) {
    console.error('[dashboard] init refresh failed:', e);
  }
})();

// ── Navigation ────────────────────────────────────────────────
const navItems    = document.querySelectorAll('.nav-item[data-view]');
const views       = document.querySelectorAll('.view');
const topbarTitle = document.getElementById('topbarTitle');

const LABELS = {
  overview: 'Overview', send: 'Send form',
  forms: 'My forms', community: 'Community', settings: 'Settings',
};

function switchView(viewId) {
  views.forEach(v => v.classList.toggle('active', v.id === `view-${viewId}`));
  navItems.forEach(n => n.classList.toggle('active', n.dataset.view === viewId));
  topbarTitle.textContent = LABELS[viewId] || '';
  if (viewId === 'forms') { reloadForms(); applyFilters(); }
  if (viewId === 'overview') reloadForms();
  if (viewId === 'send') renderFormCards();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.getElementById('sidebar').classList.remove('open');
}

navItems.forEach(item => {
  item.addEventListener('click', e => { e.preventDefault(); switchView(item.dataset.view); });
});

document.querySelectorAll('button[data-view]').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

document.getElementById('quickSendBtn').addEventListener('click', () => switchView('send'));

// ── Mobile sidebar ────────────────────────────────────────────
const sidebar        = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

document.getElementById('menuBtn').addEventListener('click',    () => sidebar.classList.add('open'));
document.getElementById('sidebarClose').addEventListener('click',() => sidebar.classList.remove('open'));
sidebarOverlay.addEventListener('click', () => sidebar.classList.remove('open'));

// ── Stats ─────────────────────────────────────────────────────
function updateStatCards() {
  const sent     = ALL_FORMS.length;
  const complete = ALL_FORMS.filter(f => f.status === 'complete').length;
  const pending  = ALL_FORMS.filter(f => f.status === 'pending').length;
  const expired  = ALL_FORMS.filter(f => f.status === 'expired').length;
  const rate     = sent ? Math.round((complete / sent) * 100) : 0;

  const el = id => document.querySelector(`#view-overview .stat-card:${id} .stat-value`);
  const statValues = document.querySelectorAll('#view-overview .stat-value');
  if (statValues[0]) statValues[0].textContent = sent;
  if (statValues[1]) statValues[1].textContent = complete;
  if (statValues[2]) statValues[2].textContent = pending;
  if (statValues[3]) statValues[3].textContent = expired;

  const deltas = document.querySelectorAll('#view-overview .stat-delta');
  if (deltas[1]) deltas[1].textContent = `${rate}% completion rate`;
}

// ── Recent forms (overview) ───────────────────────────────────
function skeletonRows(n = 3) {
  let html = '';
  for (let i = 0; i < n; i++) {
    html += `
      <tr>
        <td><div class="customer-cell"><span class="fp-skeleton-circle"></span><span class="fp-skeleton" style="width:120px"></span></div></td>
        <td><span class="fp-skeleton-pill"></span></td>
        <td><span class="fp-skeleton" style="width:140px"></span></td>
        <td><span class="fp-skeleton" style="width:80px"></span></td>
        <td><span class="fp-skeleton-pill"></span></td>
        <td><span class="fp-skeleton" style="width:50px"></span></td>
      </tr>`;
  }
  return html;
}

function renderRecentForms() {
  const tbody = document.querySelector('#view-overview .forms-table tbody');
  if (!tbody) return;
  if (!_formsLoaded && !ALL_FORMS.length) {
    tbody.innerHTML = skeletonRows(3);
    return;
  }
  const recent = ALL_FORMS.slice(0, 5);
  if (!recent.length) {
    tbody.innerHTML = `
      <tr><td colspan="6" style="padding:0">
        <div class="fp-empty">
          <div class="fp-empty-icon"><i data-lucide="inbox"></i></div>
          <h3>No forms yet</h3>
          <p>Generate your first link from the <strong>Send form</strong> tab — your customer fills it on any device and you'll see it appear here.</p>
        </div>
      </td></tr>`;
    if (window.fpIcons) window.fpIcons.refresh();
    return;
  }
  tbody.innerHTML = recent.map(row => formRow(row)).join('');
  if (window.fpIcons) window.fpIcons.refresh();
}

// ── All forms table ───────────────────────────────────────────
function statusBadge(status) {
  const map   = { pending:'badge-pending', complete:'badge-complete', expired:'badge-expired' };
  const label = { pending:'Pending', complete:'Completed', expired:'Expired' };
  return `<span class="badge ${map[status] || ''}">${label[status] || status}</span>`;
}

function formRow(row) {
  return `
    <tr>
      <td><div class="customer-cell"><div class="mini-avatar">${row.initials}</div>${row.customer}</div></td>
      <td><span class="bank-pill">${row.bank}</span></td>
      <td>${row.type}</td>
      <td class="muted-cell">${row.sent}</td>
      <td>${statusBadge(row.status)}</td>
      <td>
        <div class="action-btns">
          <button class="icon-action" title="Copy link" onclick="copyFormLink('${row.sessionId}')">
            <i data-lucide="copy"></i>
          </button>
          <button class="icon-action" title="Resend" onclick="resendForm('${row.sessionId}')">
            <i data-lucide="rotate-ccw"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function renderAllForms(data) {
  const tbody = document.getElementById('allFormsBody');
  if (!tbody) return;
  if (!_formsLoaded && !data.length) {
    tbody.innerHTML = skeletonRows(5);
    return;
  }
  if (!data.length) {
    tbody.innerHTML = `
      <tr><td colspan="6" style="padding:0">
        <div class="fp-empty">
          <div class="fp-empty-icon"><i data-lucide="folder-search"></i></div>
          <h3>No forms match your filters</h3>
          <p>Try clearing the search or filter to see all forms.</p>
        </div>
      </td></tr>`;
    if (window.fpIcons) window.fpIcons.refresh();
    return;
  }
  tbody.innerHTML = data.map(row => formRow(row)).join('');
  if (window.fpIcons) window.fpIcons.refresh();
}

// ── Search & filter ───────────────────────────────────────────
function applyFilters() {
  const q      = (document.getElementById('searchForms').value || '').toLowerCase();
  const status = document.getElementById('filterStatus').value;
  const bank   = document.getElementById('filterBank').value;

  const filtered = ALL_FORMS.filter(row => {
    const matchQ      = !q      || row.customer.toLowerCase().includes(q) || row.type.toLowerCase().includes(q);
    const matchStatus = !status || row.status === status;
    const matchBank   = !bank   || row.bank === bank;
    return matchQ && matchStatus && matchBank;
  });
  renderAllForms(filtered);
}

document.getElementById('searchForms').addEventListener('input', applyFilters);
document.getElementById('filterStatus').addEventListener('change', applyFilters);
document.getElementById('filterBank').addEventListener('change', applyFilters);

function toTitleCase(str) {
  return str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function generateSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const rnd = new Uint8Array(8);
  crypto.getRandomValues(rnd);
  return Array.from(rnd).map(b => chars[b % chars.length]).join('');
}

// ── Generate link ─────────────────────────────────────────────
function buildLink(config) {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
  const base = window.location.href.replace(/dashboard\.html.*$/, '');
  // Route GTBank Sole Prop / Partnership to dedicated form page
  if (config.bank === 'GTBank' &&
      (config.formType.includes('Sole Proprietorship') || config.formType.includes('Partnership'))) {
    return `${base}gtbank-form.html?config=${encoded}`;
  }
  if (config.bank === 'GTBank' && config.formType === 'Reference Form') {
    return `${base}gtbank-ref-customer.html?config=${encoded}`;
  }
  return `${base}fill.html?config=${encoded}`;
}

// ── Form card gallery ─────────────────────────────────────────
const READY_FORMS = (window.FP_CONSTANTS && window.FP_CONSTANTS.READY_FORMS) || new Set();
let _selectedFormType = '';
let _selectedFormIcon = '';

function renderFormCards() {
  const grid  = document.getElementById('formCardGrid');
  const noForms = document.getElementById('noFormsForBank');
  const forms = FORM_LIBRARY[OFFICER_BANK];

  if (!OFFICER_BANK || !forms || forms.length === 0) {
    grid.innerHTML = '';
    grid.style.display = 'none';
    noForms.style.display = 'block';
    return;
  }

  noForms.style.display = 'none';
  grid.style.display = 'grid';

  grid.innerHTML = forms.map(f => {
    const key     = `${OFFICER_BANK}|${f.type}`;
    const ready   = READY_FORMS.has(key);
    const safeType = f.type.replace(/'/g, "\\'");
    const safeIcon = (f.icon || 'file-text').replace(/'/g, "\\'");
    return `
      <div class="form-card${ready ? '' : ' coming-soon'}" onclick="${ready ? `openSendModal('${safeType}','${safeIcon}')` : ''}">
        <span class="form-card-icon" data-icon="${safeIcon}"><i data-lucide="${safeIcon}"></i></span>
        <div class="form-card-name">${f.type}</div>
        <div class="form-card-meta">${OFFICER_BANK}</div>
        <span class="form-card-badge${ready ? '' : ' coming'}">${ready ? 'Ready' : 'Coming soon'}</span>
      </div>`;
  }).join('');
  if (window.fpIcons) window.fpIcons.refresh();
}

function openSendModal(formType, icon) {
  _selectedFormType = formType;
  _selectedFormIcon = icon;

  const iconEl = document.getElementById('modalFormIcon');
  if (window.fpIcons && iconEl) {
    iconEl.setAttribute('data-icon', icon || 'file-text');
    iconEl.innerHTML = window.fpIcons.icon(icon || 'file-text');
    window.fpIcons.refresh();
  } else if (iconEl) {
    iconEl.textContent = icon;
  }
  document.getElementById('modalFormName').textContent = formType;
  document.getElementById('modalBankName').textContent = OFFICER_BANK;

  // Adapt fields for Reference Form
  const isRef = formType === 'Reference Form';
  document.getElementById('mGenericNameRow').style.display    = isRef ? 'none' : '';
  document.getElementById('mGenericContactRow').style.display = isRef ? 'none' : '';
  document.getElementById('refFields').style.display          = isRef ? '' : 'none';
  if (isRef) {
    const indRadio = document.querySelector('input[name="mRefType"][value="individual"]');
    if (indRadio) { indRadio.checked = true; updateRefFields(); }
    ['mRefFirst','mRefLast','mRefCompany','mRefDirFirst','mRefDirLast'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
  }

  // Reset values
  document.getElementById('modalFormSection').style.display = '';
  document.getElementById('linkResult').style.display = 'none';
  document.getElementById('mCustFirst').value  = '';
  document.getElementById('mCustLast').value   = '';
  document.getElementById('mCustEmail').value  = '';
  document.getElementById('mCustPhone').value  = '';
  document.getElementById('mLinkExpiry').value = '168';

  document.getElementById('sendModalOverlay').style.display = 'flex';
  document.getElementById('mCustFirst').focus();
}

function closeSendModal() {
  document.getElementById('sendModalOverlay').style.display = 'none';
}

function updateRefFields() {
  const type = document.querySelector('input[name="mRefType"]:checked').value;
  document.getElementById('refIndFields').style.display  = type === 'individual' ? '' : 'none';
  document.getElementById('refCorpFields').style.display = type === 'corporate'  ? '' : 'none';
}

// ── Modal generate button ─────────────────────────────────────
let lastGeneratedLink        = '';
let lastGeneratedIsReference = false;
let lastGeneratedSessionId = '';
let lastGeneratedCustomer = '';
let lastGeneratedBank = '';

// Idempotency guard — prevents double-clicks creating duplicate slugs.
let _generating = false;

document.getElementById('modalGenerateBtn').addEventListener('click', function () {
  if (_generating) return;
  _generating = true;
  this.disabled = true;
  try {

  const bank     = OFFICER_BANK;
  const formType = _selectedFormType;
  if (!formType) { showToast('No form selected.'); return; }

  // ── Reference Form path ───────────────────────────────────
  if (formType === 'Reference Form') {
    const refType = document.querySelector('input[name="mRefType"]:checked').value;
    let customer = '';
    let directorName = '';
    if (refType === 'individual') {
      const f = document.getElementById('mRefFirst').value.trim();
      const l = document.getElementById('mRefLast').value.trim();
      if (!f || !l) { showToast('Please enter the customer\'s full name.'); return; }
      customer = toTitleCase(`${f} ${l}`);
    } else {
      const company = document.getElementById('mRefCompany').value.trim();
      const df = document.getElementById('mRefDirFirst').value.trim();
      const dl = document.getElementById('mRefDirLast').value.trim();
      if (!company || !df || !dl) { showToast('Please enter the company name and director name.'); return; }
      customer = toTitleCase(company);
      directorName = toTitleCase(`${df} ${dl}`);
    }
    const expiryHours = parseInt(document.getElementById('mLinkExpiry').value, 10) || 168;
    const expiresAt   = Date.now() + expiryHours * 60 * 60 * 1000;
    const slug = generateSlug();
    const BASE = window.location.href.replace(/dashboard\.html.*$/, '');
    const link = `${BASE}gtbank-reference.html?r=${slug}`;

    supa.from('form_access_codes').insert({
      session_id:    slug,
      access_code:   null,
      expires_at:    expiresAt,
      customer_name: customer,
      director_name: directorName || null,
      ref_type:      refType,
      officer_name:  OFFICER_NAME,
      bank:          bank,
    }).then(({ error }) => { if (error) console.error('Supabase insert:', error.message); });

    const initials = customer.slice(0, 2).toUpperCase();
    const newRefForm = {
      sessionId: slug, customer, initials, bank, type: 'Reference Form',
      sent: 'Just now', status: 'pending', sentAt: Date.now(), link,
      config: { refType, customer, directorName: directorName || null, officer: OFFICER_NAME, bank, expiresAt }
    };
    ALL_FORMS.unshift(newRefForm);
    saveForms(ALL_FORMS); updateStatCards();
    // Persist to forms table (officer's pipeline view) — RLS scopes to current user
    supa.from('forms').insert(dashboardToRow(newRefForm))
      .then(({ error }) => { if (error) console.error('forms insert (ref):', error.message); });
    // Audit
    if (window.fpAudit) window.fpAudit.log('form.generated', {
      resource_type: 'form', resource_id: slug,
      metadata: { bank, form_type: 'Reference Form', ref_type: refType, expiry_hours: expiryHours }
    });
    const badge = document.querySelector('.nav-badge');
    if (badge) badge.textContent = ALL_FORMS.filter(f => f.status === 'pending').length;
    document.getElementById('generatedLink').textContent = link;
    document.getElementById('accessCodeBox').style.display = 'none';
    document.getElementById('linkResultDesc').textContent = `Reference form link ready for ${customer}. Ask them to forward it to their referee.`;
    const expiryLabels = {24:'24 hours',48:'48 hours',72:'3 days',168:'7 days',720:'30 days'};
    document.getElementById('linkExpiryLabel').textContent = `🕐 Link expires in ${expiryLabels[expiryHours] || expiryHours + ' hours'}`;
    lastGeneratedLink        = link;
    lastGeneratedCustomer    = customer;
    lastGeneratedBank        = bank;
    lastGeneratedIsReference = true;
    const waBtn = document.getElementById('whatsappBtn');
    const waMsg = encodeURIComponent(`Hi ${customer},\n\nYour account officer ${OFFICER_NAME} from ${bank} has set up a GTBank reference form for your account opening.\n\nForward this link to your referee — they just open it, fill in their details, and download the completed form:\n\n${link}\n\nThe link expires in ${expiryLabels[expiryHours] || expiryHours + ' hours'}.`);
    waBtn.onclick = () => window.open(`https://wa.me/?text=${waMsg}`, '_blank');
    collapseEmailShare();
    document.getElementById('modalFormSection').style.display = 'none';
    document.getElementById('linkResult').style.display = 'block';
    return;
  }

  // ── Standard form path ────────────────────────────────────
  const first    = document.getElementById('mCustFirst').value.trim();
  const last     = document.getElementById('mCustLast').value.trim();
  const custEmail = document.getElementById('mCustEmail').value.trim();
  const custPhone = document.getElementById('mCustPhone').value.trim();

  if (!first) { showToast('Please enter a name before generating.'); return; }
  document.getElementById('accessCodeBox').style.display = '';

  const rnd = new Uint32Array(2);
  crypto.getRandomValues(rnd);
  const sessionId  = 'fp_' + rnd[0].toString(36) + rnd[1].toString(36);
  const accessCode = String(100000 + (rnd[0] % 900000));
  const expiryHours = parseInt(document.getElementById('mLinkExpiry').value, 10) || 168;
  const expiresAt  = Date.now() + expiryHours * 60 * 60 * 1000;
  const fullName = toTitleCase(last ? `${first} ${last}` : first);
  const config = {
    bank,
    formType,
    customer:     fullName,
    custEmail:    custEmail || '',
    officer:      OFFICER_NAME,
    officerEmail: OFFICER_EMAIL,
    officerPhone: '',
    sessionId,
    expiresAt,
    // accessCode intentionally NOT included — stored in Supabase only
  };

  const link = buildLink(config);
  lastGeneratedLink      = link;
  lastGeneratedSessionId = sessionId;

  // Store access code server-side — never in the URL
  supa.from('form_access_codes')
    .insert({ session_id: sessionId, access_code: accessCode, expires_at: expiresAt })
    .then(({ error }) => { if(error) console.error('Failed to store access code:', error.message); });

  // Save to forms store
  const initials = (first[0] + (last ? last[0] : first[1] || '')).toUpperCase();
  const sentLabel = 'Just now';
  const newForm = {
    sessionId,
    customer: fullName,
    initials,
    bank,
    type: formType,
    sent: sentLabel,
    status: 'pending',
    sentAt: Date.now(),
    link,
    config,
  };
  ALL_FORMS.unshift(newForm);
  saveForms(ALL_FORMS);
  updateStatCards();
  // Persist to forms table (officer's pipeline view) — RLS scopes to current user
  supa.from('forms').insert(dashboardToRow(newForm))
    .then(({ error }) => { if (error) console.error('forms insert:', error.message); });
  // Audit
  if (window.fpAudit) window.fpAudit.log('form.generated', {
    resource_type: 'form', resource_id: sessionId,
    metadata: { bank, form_type: formType, expiry_hours: expiryHours }
  });
  // Update badge
  const badge = document.querySelector('.nav-badge');
  if (badge) badge.textContent = ALL_FORMS.filter(f => f.status === 'pending').length;

  // Show result
  document.getElementById('generatedLink').textContent = link;
  document.getElementById('accessCodeDisplay').textContent = accessCode;
  document.getElementById('linkResultDesc').textContent = `Link ready for ${fullName}. Copy it or share directly.`;
  const expiryLabels = {24:'24 hours',48:'48 hours',72:'3 days',168:'7 days',720:'30 days'};
  const expiryLabel  = expiryLabels[expiryHours] || expiryHours + ' hours';
  document.getElementById('linkExpiryLabel').textContent = `🕐 Link expires in ${expiryLabel}`;
  lastGeneratedLink        = link;
  lastGeneratedCustomer    = fullName;
  lastGeneratedBank        = bank;
  lastGeneratedIsReference = false;
  const waBtn = document.getElementById('whatsappBtn');
  const waMsg = encodeURIComponent(
    `Hi ${fullName}, I'm your account officer from ${bank}. I've sent you a quick online form to fill — it only takes a few minutes.\n\nHere's your link: ${link}\n\nOnce you're done, you'll download a PDF to send back to me. Let me know if you need help!`
  );
  waBtn.onclick = () => window.open(`https://wa.me/?text=${waMsg}`, '_blank');
  collapseEmailShare();
  if (custEmail) {
    expandEmailShare();
    document.getElementById('resultEmail').value = custEmail;
  }
  document.getElementById('modalFormSection').style.display = 'none';
  document.getElementById('linkResult').style.display = 'block';

  } catch(err) {
    console.error('Generate link error:', err);
    showToast('Error generating link — check console (F12) for details');
  } finally {
    _generating = false;
    this.disabled = false;
  }
});

function resetSendForm() {
  closeSendModal();
}

// ── Copy helpers ──────────────────────────────────────────────
function copyGeneratedLink() {
  const text = document.getElementById('generatedLink').textContent;
  navigator.clipboard.writeText(text).then(() => {
    document.getElementById('copyLinkBtn').textContent = 'Copied ✓';
    showToast('Link copied — share it with your customer');
    setTimeout(() => { document.getElementById('copyLinkBtn').textContent = 'Copy'; }, 2500);
  }).catch(() => {
    // Fallback for browsers that block clipboard API
    prompt('Copy this link:', text);
  });
}

function copyAccessCode() {
  const code = document.getElementById('accessCodeDisplay').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast('Access code copied — share it with your customer separately');
  }).catch(() => { prompt('Access code:', code); });
}

function expandEmailShare() {
  document.getElementById('emailTriggerBtn').style.display = 'none';
  document.getElementById('emailInputRow').style.display  = '';
  document.getElementById('resultEmail').focus();
}

function collapseEmailShare() {
  document.getElementById('emailInputRow').style.display  = 'none';
  document.getElementById('emailTriggerBtn').style.display = 'block';
  document.getElementById('resultEmail').value = '';
  const btn = document.getElementById('emailSendBtn');
  btn.textContent = 'Send'; btn.disabled = false;
}

function buildReferenceEmailHtml(customerName, officerName, bank, link) {
  const emailIconB64 = btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2D2416"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0EB;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;padding:32px 16px"><tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
<tr><td style="background:#E8470A;padding:28px 32px">
  <div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:rgba(255,255,255,.7);text-transform:uppercase;margin-bottom:6px">FormPilot</div>
  <div style="font-size:22px;font-weight:700;color:#fff;line-height:1.25">Your reference form link is ready 📋</div>
</td></tr>
<tr><td style="padding:32px">
  <p style="font-size:16px;color:#1A1208;margin:0 0 12px;font-weight:600">Hi ${customerName},</p>
  <p style="font-size:15px;color:#5A5048;line-height:1.7;margin:0 0 20px">Your account officer <strong>${officerName}</strong> at <strong>${bank}</strong> has generated a banker's reference form link for your account opening.</p>

  <table cellpadding="0" cellspacing="0" style="width:100%;background:#FFF8F5;border-radius:12px;border:1px solid #FDDFD0;margin-bottom:24px"><tr><td style="padding:20px 24px">
    <p style="font-size:13px;font-weight:700;color:#E8470A;text-transform:uppercase;letter-spacing:.05em;margin:0 0 12px">Here's what to do:</p>
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="padding:6px 0;font-size:14px;color:#2D2416;line-height:1.6"><span style="font-weight:700;color:#E8470A;margin-right:8px">1.</span>Forward this link to your chosen referee</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#2D2416;line-height:1.6"><span style="font-weight:700;color:#E8470A;margin-right:8px">2.</span>Your referee fills in the form online <span style="color:#7A6E64">(takes about 5 minutes)</span></td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#2D2416;line-height:1.6"><span style="font-weight:700;color:#E8470A;margin-right:8px">3.</span>They download the completed PDF and send it back to you</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#2D2416;line-height:1.6"><span style="font-weight:700;color:#E8470A;margin-right:8px">4.</span>You hand the PDF to your ${bank} officer to complete your account opening</td></tr>
    </table>
  </td></tr></table>

  <p style="font-size:13px;font-weight:700;color:#1A1208;margin:0 0 10px">Send this link to your referee via:</p>
  <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:10px"><tr>
    <td align="center" style="background:#25D366;border-radius:12px">
      <a href="https://wa.me/?text=${encodeURIComponent(`Hi, I need you to fill a GTBank reference form for my account opening. It only takes 5 minutes — please open this link, fill in your details, download the completed PDF and send it back to me:\n\n${link}`)}" style="display:block;padding:14px 24px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;text-align:center">📱 Share on WhatsApp</a>
    </td>
  </tr></table>
  <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px"><tr>
    <td align="center" style="border-radius:12px;border:1.5px solid #EAE5DF">
      <a href="mailto:?subject=GTBank Reference Form Request&body=${encodeURIComponent(`Hi,\n\nI need you to fill a GTBank reference form for my account opening. It only takes about 5 minutes.\n\nPlease open this link, fill in your details, download the completed PDF and send it back to me:\n\n${link}\n\nThank you.`)}" style="display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:14px 24px;font-size:15px;font-weight:700;color:#2D2416;text-decoration:none;text-align:center;width:100%;box-sizing:border-box"><img src="data:image/svg+xml;base64,${emailIconB64}" width="20" height="20" alt="" style="vertical-align:middle" /> Share via Email</a>
    </td>
  </tr></table>

  <p style="font-size:12px;color:#7A6E64;margin:0 0 6px">Or copy the link below and send it yourself:</p>
  <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px"><tr>
    <td style="background:#FFF0EB;border-radius:8px;padding:12px 14px;border:1px solid #FDDFD0">
      <a href="${link}" style="font-size:12px;color:#E8470A;word-break:break-all;text-decoration:none;line-height:1.6;display:block">${link}</a>
    </td>
  </tr></table>

  <p style="font-size:13px;color:#7A6E64;line-height:1.6;margin:0;border-top:1px solid #EAE5DF;padding-top:20px">Questions? Contact your account officer <strong>${officerName}</strong> directly.</p>
</td></tr>
<tr><td style="background:#F8F6F4;padding:16px 32px;border-top:1px solid #EAE5DF">
  <p style="font-size:11px;color:#7A6E64;margin:0;text-align:center">Sent via <strong>FormPilot</strong> &nbsp;·&nbsp; Your data stays on your device &nbsp;·&nbsp; Never stored on our servers</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

function buildCustomerEmailHtml(customerName, officerName, bank, link) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0EB;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;padding:32px 16px"><tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
<tr><td style="background:#E8470A;padding:28px 32px">
  <div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:rgba(255,255,255,.7);text-transform:uppercase;margin-bottom:6px">FormPilot</div>
  <div style="font-size:22px;font-weight:700;color:#fff;line-height:1.25">Your bank form is ready 📋</div>
</td></tr>
<tr><td style="padding:32px">
  <p style="font-size:16px;color:#1A1208;margin:0 0 12px;font-weight:600">Hi ${customerName},</p>
  <p style="font-size:15px;color:#5A5048;line-height:1.7;margin:0 0 28px">${officerName} from <strong>${bank}</strong> has sent you a form to complete online. It takes just a few minutes — when you're done, you'll download a ready-to-sign PDF to bring to the bank.</p>
  <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px"><tr>
    <td align="center" style="background:#E8470A;border-radius:12px">
      <a href="${link}" style="display:block;padding:16px 24px;font-size:16px;font-weight:700;color:#fff;text-decoration:none;text-align:center">Open Your Form →</a>
    </td>
  </tr></table>
  <p style="font-size:12px;color:#7A6E64;margin:0 0 6px">Can't click the button? Copy this link:</p>
  <p style="font-size:11px;color:#E8470A;word-break:break-all;background:#FFF0EB;border-radius:8px;padding:10px 14px;margin:0 0 24px;line-height:1.6">${link}</p>
  <p style="font-size:13px;color:#7A6E64;line-height:1.6;margin:0;border-top:1px solid #EAE5DF;padding-top:20px">Questions? Contact your account officer <strong>${officerName}</strong> directly.</p>
</td></tr>
<tr><td style="background:#F8F6F4;padding:16px 32px;border-top:1px solid #EAE5DF">
  <p style="font-size:11px;color:#7A6E64;margin:0;text-align:center">Sent via <strong>FormPilot</strong> &nbsp;·&nbsp; Your data stays on your device &nbsp;·&nbsp; Never stored on our servers</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

function sendResultEmail() {
  const custEmail = document.getElementById('resultEmail').value.trim();
  if (!custEmail || !custEmail.includes('@')) { showToast('Please enter a valid email address.'); return; }
  const btn = document.getElementById('emailSendBtn');
  btn.textContent = '⏳';
  btn.disabled = true;

  const isRef = lastGeneratedIsReference;
  const subject = isRef
    ? `GTBank Reference Form — ${lastGeneratedCustomer}`
    : `${lastGeneratedBank} Form — ${lastGeneratedCustomer}`;
  const text = isRef
    ? `Hi ${lastGeneratedCustomer},\n\n${OFFICER_NAME} at ${lastGeneratedBank} has generated a reference form link for your account opening.\n\nForward this link to your referee:\n${lastGeneratedLink}\n\nYour referee fills the form, downloads the PDF, and sends it back to you. You then hand it to your bank officer.\n\n— FormPilot`
    : `Hi ${lastGeneratedCustomer},\n\n${OFFICER_NAME} from ${lastGeneratedBank} has sent you a bank form to complete online.\n\n🔗 Your link: ${lastGeneratedLink}\n\nOnce you open the link, fill in your details and download the completed PDF to bring to the bank.\n\n— FormPilot`;
  const html = isRef
    ? buildReferenceEmailHtml(lastGeneratedCustomer, OFFICER_NAME, lastGeneratedBank, lastGeneratedLink)
    : buildCustomerEmailHtml(lastGeneratedCustomer, OFFICER_NAME, lastGeneratedBank, lastGeneratedLink);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);

  fetch(`${_SUPA_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_SUPA_KEY}` },
    body: JSON.stringify({ to: custEmail, subject, text, html }),
    signal: ctrl.signal,
  })
  .then(r => { clearTimeout(timer); return r.json(); })
  .then(d => {
    if (d.ok) {
      btn.textContent = '✅ Sent!';
      showToast(`Email sent to ${custEmail}`);
    } else {
      throw new Error(JSON.stringify(d.error));
    }
  })
  .catch((err) => {
    clearTimeout(timer);
    console.error('Email error:', err);
    btn.textContent = '✉️ Send';
    btn.disabled = false;
    showToast(err.name === 'AbortError' ? 'Email timed out — check your connection and try again.' : 'Failed to send email. Check Supabase function logs.');
  });
}

function copyFormLink(sessionId) {
  const form = ALL_FORMS.find(f => f.sessionId === sessionId);
  if (!form?.link) { showToast('Link unavailable for older entries'); return; }
  navigator.clipboard.writeText(form.link).then(() => {
    showToast('Link copied to clipboard');
  }).catch(() => prompt('Copy this link:', form.link));
  if (window.fpAudit) window.fpAudit.log('form.copied', {
    resource_type: 'form', resource_id: sessionId
  });
}

async function resendForm(sessionId) {
  const form = ALL_FORMS.find(f => f.sessionId === sessionId);
  if (!form) { showToast('Form not found'); return; }

  const ok = window.fpModal ? await window.fpModal.confirm({
    title: `Resend link to ${form.customer}?`,
    message: 'The original link will continue to work. This refreshes its status to "pending" so you can track it.',
    confirmText: 'Resend',
    cancelText: 'Cancel',
  }) : true;
  if (!ok) return;

  form.status = 'pending';
  form.sent   = 'Just now';
  form.sentAt = Date.now();
  saveForms(ALL_FORMS);
  applyFilters();
  renderRecentForms();
  updateStatCards();

  if (supa) {
    const { error } = await supa.from('forms')
      .update({ status: 'pending' })
      .eq('slug', sessionId);
    if (error) console.warn('forms resend update:', error.message);
  }
  if (window.fpAudit) window.fpAudit.log('form.resent', {
    resource_type: 'form', resource_id: sessionId,
    metadata: { bank: form.bank, form_type: form.type }
  });
  showToast(`Link refreshed for ${form.customer}`);
}

// ── Poll for completions ──────────────────────────────────────
// Re-fetch from Supabase every 30s. Detects status changes (e.g. customer
// completed their form) even when they fill on a different device.
setInterval(async () => {
  if (!supa) return;
  const before = ALL_FORMS.map(f => `${f.sessionId}:${f.status}`).join(',');
  await refreshForms();
  const after = ALL_FORMS.map(f => `${f.sessionId}:${f.status}`).join(',');
  if (before && after && before !== after) {
    const newlyComplete = ALL_FORMS.some(f =>
      f.status === 'complete' && !before.includes(`${f.sessionId}:complete`)
    );
    if (newlyComplete) showToast('A customer just completed their form! 🎉');
  }
}, 30000);

// ── Toast ─────────────────────────────────────────────────────
let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Preview modal ─────────────────────────────────────────────
function buildPreviewConfig() {
  const bank     = OFFICER_BANK;
  const formType = _selectedFormType;

  if (!bank || !formType) {
    showToast('Select a form first to preview.');
    return null;
  }

  const first = document.getElementById('mCustFirst').value.trim();
  const last  = document.getElementById('mCustLast').value.trim();

  return {
    bank,
    formType,
    customer:     first && last ? `${first} ${last}` : 'Customer',
    officer:      OFFICER_NAME,
    officerEmail: OFFICER_EMAIL,
    sessionId:    'preview',
  };
}

document.getElementById('closePreview').addEventListener('click', () => {
  document.getElementById('previewOverlay').classList.remove('open');
  document.getElementById('previewFrame').src = 'about:blank';
});

// Close on backdrop click
document.getElementById('previewOverlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('previewOverlay')) {
    document.getElementById('previewOverlay').classList.remove('open');
    document.getElementById('previewFrame').src = 'about:blank';
  }
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('previewOverlay').classList.remove('open');
    document.getElementById('previewFrame').src = 'about:blank';
  }
});

// Device toggle (desktop / mobile)
document.querySelectorAll('.device-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('previewFrame').style.width     = btn.dataset.width;
    document.getElementById('previewFrame').style.maxWidth  = btn.dataset.width;
    document.getElementById('previewFrame').style.minWidth  = btn.dataset.width;
  });
});

// ── Init ──────────────────────────────────────────────────────
updateStatCards();
renderRecentForms();
renderAllForms(ALL_FORMS);
