// ── Form library — bank → available forms ─────────────────────
const FORM_LIBRARY = {
  'Access Bank': [
    { type: 'Account Opening — Individual',      icon: '👤' },
    { type: 'Account Opening — Business',         icon: '🏢' },
    { type: 'KYC Update',                         icon: '🔄' },
    { type: 'Mandate Form',                       icon: '✍️' },
    { type: 'Change of Address',                  icon: '📍' },
    { type: 'Indemnity Form',                     icon: '📋' },
  ],
  'GTBank': [
    { type: 'Account Opening — Individual',                      icon: '👤' },
    { type: 'Account Opening — Sole Proprietorship / Partnership', icon: '🏪' },
    { type: 'Account Opening — Corporate',                       icon: '🏢' },
    { type: 'Account Opening — Trustees',                        icon: '⚖️' },
    { type: 'Account Opening — Societies',                       icon: '🤝' },
    { type: 'KYC Update',                                        icon: '🔄' },
    { type: 'GAPS / Internet Banking',                           icon: '💻' },
  ],
  'Zenith Bank': [
    { type: 'Account Opening — Individual',  icon: '👤' },
    { type: 'Account Opening — Business',    icon: '🏢' },
    { type: 'KYC Update',                    icon: '🔄' },
    { type: 'Indemnity Form',                icon: '📋' },
  ],
  'First Bank': [
    { type: 'Account Opening — Individual',  icon: '👤' },
    { type: 'KYC Update',                    icon: '🔄' },
    { type: 'Mandate Form',                  icon: '✍️' },
  ],
  'UBA': [
    { type: 'Account Opening — Individual',  icon: '👤' },
    { type: 'Account Opening — Business',    icon: '🏢' },
    { type: 'KYC Update',                    icon: '🔄' },
    { type: 'Change of Address',             icon: '📍' },
  ],
  'Stanbic IBTC': [
    { type: 'Account Opening — Individual',  icon: '👤' },
    { type: 'KYC Update',                    icon: '🔄' },
  ],
  'FCMB':         [],
  'Fidelity Bank':[],
  'Union Bank':   [],
  'Sterling Bank':[],
  'Polaris Bank': [],
  'Wema Bank':    [],
};

// ── Session ───────────────────────────────────────────────────
const session = (() => {
  try { return JSON.parse(sessionStorage.getItem('fp_user') || '{}'); } catch(e) { return {}; }
})();

// Guard — redirect to login if no session
if (!session.name) { window.location.href = 'login.html'; }

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

// ── Seed forms from localStorage or use defaults ──────────────
const DEFAULT_FORMS = [
  { sessionId:'s001', customer:'Kemi Adeyemi',    initials:'KA', bank:'Access Bank', type:'Account Opening',   sent:'Today, 9:14 am',        status:'pending',  sentAt: Date.now() - 1000*60*30 },
  { sessionId:'s002', customer:'Tunde Olawale',   initials:'TO', bank:'GTBank',      type:'KYC Update',         sent:'Yesterday, 3:40 pm',    status:'complete', sentAt: Date.now() - 1000*60*60*20 },
  { sessionId:'s003', customer:'Chidinma Ibe',    initials:'CI', bank:'Zenith Bank', type:'Account Opening',   sent:'Yesterday, 11:02 am',   status:'complete', sentAt: Date.now() - 1000*60*60*23 },
  { sessionId:'s004', customer:'Bello Musa',      initials:'BM', bank:'First Bank',  type:'Mandate Form',       sent:'28 Mar, 2:15 pm',       status:'expired',  sentAt: Date.now() - 1000*60*60*48 },
  { sessionId:'s005', customer:'Fatima Okoro',    initials:'FO', bank:'Access Bank', type:'Account Opening',   sent:'27 Mar, 10:50 am',      status:'pending',  sentAt: Date.now() - 1000*60*60*56 },
  { sessionId:'s006', customer:'Emeka Nwosu',     initials:'EN', bank:'UBA',         type:'KYC Update',         sent:'26 Mar, 4:05 pm',       status:'complete', sentAt: Date.now() - 1000*60*60*72 },
  { sessionId:'s007', customer:'Sade Balogun',    initials:'SB', bank:'GTBank',      type:'Account Opening',   sent:'25 Mar, 1:30 pm',       status:'complete', sentAt: Date.now() - 1000*60*60*80 },
  { sessionId:'s008', customer:'Ibrahim Lawal',   initials:'IL', bank:'Zenith Bank', type:'Change of Address', sent:'24 Mar, 9:00 am',       status:'expired',  sentAt: Date.now() - 1000*60*60*96 },
  { sessionId:'s009', customer:'Ngozi Eze',       initials:'NE', bank:'Access Bank', type:'Indemnity Form',    sent:'23 Mar, 11:45 am',      status:'complete', sentAt: Date.now() - 1000*60*60*110 },
  { sessionId:'s010', customer:'Yusuf Abdullahi', initials:'YA', bank:'First Bank',  type:'Account Opening',   sent:'22 Mar, 2:20 pm',       status:'pending',  sentAt: Date.now() - 1000*60*60*125 },
];

function loadForms() {
  try {
    const stored = JSON.parse(localStorage.getItem('fp_forms') || 'null');
    return stored || DEFAULT_FORMS;
  } catch(e) { return DEFAULT_FORMS; }
}

function saveForms(forms) {
  localStorage.setItem('fp_forms', JSON.stringify(forms));
}

// Init store with defaults if empty
if (!localStorage.getItem('fp_forms')) saveForms(DEFAULT_FORMS);
let ALL_FORMS = loadForms();

function reloadForms() {
  ALL_FORMS = loadForms();
  updateStatCards();
  renderAllForms(ALL_FORMS);
  renderRecentForms();
}

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
function renderRecentForms() {
  const tbody = document.querySelector('#view-overview .forms-table tbody');
  if (!tbody) return;
  const recent = ALL_FORMS.slice(0, 5);
  tbody.innerHTML = recent.map(row => formRow(row)).join('');
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="icon-action" title="Resend" onclick="resendForm('${row.sessionId}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function renderAllForms(data) {
  const tbody = document.getElementById('allFormsBody');
  if (!tbody) return;
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2.5rem;color:var(--muted)">No forms found.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(row => formRow(row)).join('');
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

// ── Generate link ─────────────────────────────────────────────
function buildLink(config) {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
  const base = window.location.href.replace(/dashboard\.html.*$/, '');
  // Route GTBank Sole Prop / Partnership to dedicated form page
  if (config.bank === 'GTBank' &&
      (config.formType.includes('Sole Proprietorship') || config.formType.includes('Partnership'))) {
    return `${base}gtbank-form.html?config=${encoded}`;
  }
  return `${base}fill.html?config=${encoded}`;
}

// ── Form picker ───────────────────────────────────────────────
let selectedFormType = '';

document.getElementById('sendBank').addEventListener('change', function () {
  const bank  = this.value;
  const forms = FORM_LIBRARY[bank];
  const wrap  = document.getElementById('formPickerWrap');
  const none  = document.getElementById('noFormsState');
  const input = document.getElementById('sendFormType');

  // Reset selection
  selectedFormType = '';
  input.value = '';

  if (!bank) { wrap.style.display = 'none'; none.style.display = 'none'; return; }

  if (!forms || forms.length === 0) {
    wrap.style.display = 'none';
    none.style.display = 'block';
    return;
  }

  none.style.display = 'none';
  wrap.style.display = 'block';
  document.getElementById('formCountBadge').textContent = `${forms.length} available`;

  document.getElementById('formPicker').innerHTML = forms.map(f => `
    <button type="button" class="form-pill" data-type="${f.type}" onclick="selectFormType(this, '${f.type.replace(/'/g,"\\'")}')">
      <span class="form-pill-icon">${f.icon}</span>
      <span>${f.type}</span>
      <span class="form-pill-check">✓</span>
    </button>
  `).join('');
});

function selectFormType(btn, type) {
  document.querySelectorAll('.form-pill').forEach(p => p.classList.remove('selected'));
  btn.classList.add('selected');
  selectedFormType = type;
  document.getElementById('sendFormType').value = type;
}

// ── Send form ─────────────────────────────────────────────────
let lastGeneratedLink = '';
let lastGeneratedSessionId = '';

document.getElementById('sendForm').addEventListener('submit', function (e) {
  e.preventDefault();
  try {

  const first    = document.getElementById('custFirst').value.trim();
  const last     = document.getElementById('custLast').value.trim();
  const custEmail = document.getElementById('custEmail').value.trim();
  const custPhone = document.getElementById('custPhone').value.trim();
  const bank     = document.getElementById('sendBank').value;
  const formType = selectedFormType;
  const note     = document.getElementById('sendNote').value.trim();

  if (!first || !last) { showToast('Please enter the customer\'s name.'); return; }
  if (!bank)           { showToast('Please select a bank.'); return; }
  if (!formType)       { showToast('Please select a form type.'); return; }

  const sessionId  = 'fp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const accessCode = String(Math.floor(100000 + Math.random() * 900000));
  const expiryHours = parseInt(document.getElementById('linkExpiry').value, 10) || 168;
  const expiresAt  = Date.now() + expiryHours * 60 * 60 * 1000;
  const config = {
    bank,
    formType,
    customer:     `${first} ${last}`,
    custEmail:    custEmail || '',
    officer:      OFFICER_NAME,
    officerEmail: OFFICER_EMAIL,
    officerPhone: '',
    sessionId,
    note,
    accessCode,
    expiresAt,
  };

  const link = buildLink(config);
  lastGeneratedLink      = link;
  lastGeneratedSessionId = sessionId;

  // Save to forms store
  const initials = (first[0] + last[0]).toUpperCase();
  const now = new Date();
  const sentLabel = 'Just now';
  const newForm = {
    sessionId,
    customer: `${first} ${last}`,
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
  // Update badge
  const badge = document.querySelector('.nav-badge');
  if (badge) badge.textContent = ALL_FORMS.filter(f => f.status === 'pending').length;

  // Show result
  document.getElementById('generatedLink').textContent = link;
  document.getElementById('accessCodeDisplay').textContent = accessCode;
  document.getElementById('linkCustomerName').textContent = `${first} ${last}`;
  document.getElementById('linkResultDesc').innerHTML =
    `Link ready for <strong>${first} ${last}</strong>. Copy it or share directly.`;
  const expiryLabels = {24:'24 hours',48:'48 hours',72:'3 days',168:'7 days',720:'30 days'};
  document.getElementById('linkExpiryLabel').textContent = `🕐 Link expires in ${expiryLabels[expiryHours]||expiryHours+' hours'}`;

  const method = document.querySelector('input[name="sendMethod"]:checked').value;
  const waBtn  = document.getElementById('whatsappBtn');
  const expiryLabels2 = {24:'24 hours',48:'48 hours',72:'3 days',168:'7 days',720:'30 days'};
  const expiryLabel = expiryLabels2[expiryHours] || expiryHours + ' hours';

  if (method === 'email' && custEmail) {
    waBtn.textContent = '📧 Send email now';
    waBtn.onclick = () => sendViaEmailJS({ first, last, custEmail, bank, link, accessCode, note, expiryLabel });
  } else {
    const waMsg = encodeURIComponent(
      `Hi ${first}, I'm your account officer from ${bank}. I've sent you a quick online form to fill — it only takes a few minutes.\n\nHere's your link: ${link}\n\nOnce you're done, you'll download a PDF to send back to me. Let me know if you need help!`
    );
    waBtn.textContent = '📱 Share on WhatsApp';
    waBtn.onclick = () => window.open(`https://wa.me/?text=${waMsg}`, '_blank');
  }

  document.getElementById('sendForm').closest('.send-card').style.display = 'none';
  document.getElementById('linkResult').hidden = false;

  } catch(err) {
    console.error('Generate link error:', err);
    showToast('Error generating link — check console (F12) for details');
  }
});

function resetSendForm() {
  document.getElementById('sendForm').reset();
  document.getElementById('sendForm').closest('.send-card').style.display = '';
  document.getElementById('linkResult').hidden = true;
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

function sendViaEmailJS({ first, last, custEmail, bank, link, accessCode, note, expiryLabel }) {
  const btn = document.getElementById('whatsappBtn');
  btn.textContent = '⏳ Sending...';
  btn.disabled = true;

  emailjs.send('service_vancprr', 'template_oeqmbz5', {
    to_email:      custEmail,
    customer_name: `${first} ${last}`,
    officer_name:  OFFICER_NAME,
    bank:          bank,
    form_link:     link,
    access_code:   accessCode,
    note:          note || '',
    expiry:        expiryLabel,
  })
  .then(() => {
    btn.textContent = '✅ Email sent!';
    showToast(`Email sent to ${custEmail}`);
  })
  .catch((err) => {
    console.error('EmailJS error:', err);
    btn.textContent = '📧 Retry send';
    btn.disabled = false;
    showToast('Failed to send email — check your EmailJS setup');
  });
}

function copyFormLink(sessionId) {
  const form = ALL_FORMS.find(f => f.sessionId === sessionId);
  if (!form?.link) { showToast('Link unavailable for older entries'); return; }
  navigator.clipboard.writeText(form.link).then(() => {
    showToast('Link copied to clipboard');
  }).catch(() => prompt('Copy this link:', form.link));
}

function resendForm(sessionId) {
  const form = ALL_FORMS.find(f => f.sessionId === sessionId);
  if (!form) { showToast('Form not found'); return; }
  // Mark as pending again (re-issued)
  form.status = 'pending';
  form.sent   = 'Just now';
  form.sentAt = Date.now();
  saveForms(ALL_FORMS);
  showToast(`Link resent to ${form.customer}`);
  applyFilters();
  renderRecentForms();
  updateStatCards();
}

// ── Poll for completions ──────────────────────────────────────
// Check localStorage every 5 s (works when customer fills in same browser)
setInterval(() => {
  const fresh = loadForms();
  const changed = fresh.some(f => {
    const old = ALL_FORMS.find(o => o.sessionId === f.sessionId);
    return old && old.status !== f.status;
  });
  if (changed) {
    ALL_FORMS = fresh;
    updateStatCards();
    renderRecentForms();
    applyFilters();
    showToast('A customer just completed their form! 🎉');
  }
}, 5000);

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
  const first    = document.getElementById('custFirst').value.trim();
  const last     = document.getElementById('custLast').value.trim();
  const bank     = document.getElementById('sendBank').value;
  const formType = selectedFormType;

  if (!bank || !formType) {
    showToast('Select a bank and form type first to preview.');
    return null;
  }

  return {
    bank,
    formType,
    customer:     first && last ? `${first} ${last}` : 'Customer',
    officer:      OFFICER_NAME,
    officerEmail: OFFICER_EMAIL,
    sessionId:    'preview',
  };
}

document.getElementById('previewFormBtn').addEventListener('click', () => {
  const config = buildPreviewConfig();
  if (!config) return;

  const url = buildLink(config);

  document.getElementById('previewFrame').src    = url;
  const filePart = url.includes('gtbank-form.html') ? 'gtbank-form.html' : 'fill.html';
  document.getElementById('previewUrlBar').textContent = `${filePart}?bank=${encodeURIComponent(config.bank)}&form=${encodeURIComponent(config.formType)}`;
  document.getElementById('previewOverlay').classList.add('open');
});

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
