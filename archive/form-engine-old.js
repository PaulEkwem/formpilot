// ─────────────────────────────────────────────────────────────────────────────
// form-engine.js — shared rendering/navigation/PDF engine
// Depends on globals from inline config script: _cfg, CFG_CUSTOMER, CFG_OFFICER,
//   CFG_SESSION, SUPA_URL, SUPA_KEY, supa, S2_ROLE, S2_SESSION
// Depends on globals from forms/<name>.js: SLIDES, GTB_FIELDS, buildStampData,
//   PDF_URL, PAGE_LABELS, PDF_TOTAL_PAGES, SLIDE_PAGE_MAP,
//   ACCT_PRODUCTS, DOMI_CURRENCIES, ID_CFG, ID_KEYS, STATES, DNFI_LIST
// ─────────────────────────────────────────────────────────────────────────────

// ── STATE ─────────────────────────────────────────────────────────────────────
const FD = {}, MULTI = {}, CONSENTS = {};
let TOTAL_Q = 0, cur = 0;

// ── HELPERS ───────────────────────────────────────────────────────────────────
function escQ(s){ return String(s).replace(/'/g,"\\'"); }
function escH(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function lbl(text){ return `<label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:4px;display:block">${text}</label>`; }

function okRow(idx, s){
  const skip = s && s.optional ? `<span class="skip-link" onclick="skipSlide()">Skip →</span>` : '';
  return `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:14px">
    <button class="ok-btn" onclick="tryAdvance(${idx})">Continue <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <span class="press-hint">or <strong>Enter ↵</strong></span>${skip}
  </div>`;
}

// ── GATE ──────────────────────────────────────────────────────────────────────
let _gateAttempts = 0;

function initGate(){
  const legacyCode = (_cfg && _cfg.accessCode) || '';
  const expiresAt  = (_cfg && _cfg.expiresAt)  || 0;
  const gate = document.getElementById('gate-screen');
  if(!gate) return;
  // Show gate if link has a session (new flow) OR a legacy inline code
  if(!CFG_SESSION && !legacyCode) return;

  const cName = document.getElementById('gate-customer-name');
  const oName = document.getElementById('gate-officer-name');
  const oExpired = document.getElementById('expired-officer-name');
  if(cName) cName.textContent = CFG_CUSTOMER ? CFG_CUSTOMER.split(' ')[0] : 'there';
  if(oName) oName.textContent = CFG_OFFICER || 'Your account officer';
  if(oExpired) oExpired.textContent = CFG_OFFICER || 'your account officer';

  if(expiresAt && Date.now() > expiresAt){
    gate.style.display = 'block';
    document.getElementById('gate-body').style.display = 'none';
    document.getElementById('gate-expired').style.display = 'block';
    return;
  }

  const expLine = document.getElementById('gate-expiry-line');
  if(expLine && expiresAt){
    const diff = expiresAt - Date.now();
    const hrs = Math.floor(diff / 36e5);
    const days = Math.floor(hrs / 24);
    expLine.textContent = days >= 2 ? `⏳ This link expires in ${days} days`
      : hrs > 0 ? `⏳ This link expires in ${hrs} hour${hrs !== 1 ? 's' : ''}`
      : '⏳ This link expires soon';
  }
  gate.style.display = 'block';
}

async function unlockForm(){
  const errEl = document.getElementById('gate-err');
  const input = document.getElementById('gate-code-input');
  const btn   = document.querySelector('#gate-body button[onclick*="unlockForm"]');

  function showErr(msg){
    if(errEl){ errEl.textContent = msg || '⚠️ Incorrect code. Please check with your account officer.'; errEl.style.display = 'block'; }
    if(input){ input.style.borderColor = '#c0392b'; setTimeout(() => { input.style.borderColor = '#E8E3DC'; }, 1800); }
  }

  if(_gateAttempts >= 5){ showErr('⚠️ Too many attempts. Please contact your account officer.'); return; }

  const entered = (input ? input.value : '').trim();
  if(!entered) return;

  const legacyCode = (_cfg && _cfg.accessCode) || '';
  if(legacyCode){
    // Old links: code is in the URL (backwards compatibility with existing links)
    if(entered === String(legacyCode)){
      document.getElementById('gate-screen').style.display = 'none';
    } else {
      _gateAttempts++;
      showErr();
    }
    return;
  }

  // New links: verify via Supabase RPC — code was never in the URL
  if(btn){ btn.textContent = 'Verifying…'; btn.disabled = true; }
  try {
    const { data, error } = await supa.rpc('verify_form_code', {
      p_session_id: CFG_SESSION,
      p_code: entered
    });
    if(!error && data === true){
      document.getElementById('gate-screen').style.display = 'none';
    } else {
      _gateAttempts++;
      showErr(_gateAttempts >= 5 ? '⚠️ Too many attempts. Please contact your account officer.' : undefined);
    }
  } catch(e){
    showErr('⚠️ Could not verify. Please check your connection.');
  } finally {
    if(btn){ btn.textContent = 'Unlock form →'; btn.disabled = false; }
  }
}

// ── RENDER DISPATCHER ─────────────────────────────────────────────────────────
function renderSlide(s, idx){
  const div = document.createElement('div');
  div.className = 'slide pos-below';
  div.id = 'slide-' + idx;
  switch(s.type){
    case 'welcome':         div.innerHTML = renderWelcome(); break;
    case 'section':         div.innerHTML = renderSection(s); div.classList.add('section-slide'); break;
    case 'choice':          div.innerHTML = renderChoice(s, idx); break;
    case 'account-product': div.innerHTML = renderAccountProduct(s, idx); break;
    case 'domiciliary':     div.innerHTML = renderDomiciliary(s, idx); break;
    case 'text':            div.innerHTML = renderText(s, idx); break;
    case 'group':           div.innerHTML = renderGroup(s, idx); break;
    case 'bvn':             div.innerHTML = renderBVN(s, idx); break;
    case 'nationality':     div.innerHTML = renderNationality(s, idx); break;
    case 'other-residency': div.innerHTML = renderOtherResidency(s, idx); break;
    case 'id-select':       div.innerHTML = renderIDSelect(s, idx); break;
    case 'address':         div.innerHTML = renderAddress(s, idx); break;
    case 'signature':       div.innerHTML = renderSignature(s, idx); break;
    case 'salary':          div.innerHTML = renderSalary(s, idx); break;
    case 'scuml':           div.innerHTML = renderSCUML(s, idx); break;
    case 'add-signatories': div.innerHTML = renderAddSig(s, idx); break;
    case 'consent':         div.innerHTML = renderConsent(s, idx); break;
    case 'terms':           div.innerHTML = renderTerms(idx); break;
    case 'references':      div.innerHTML = renderReferencesPage(idx); break;
    case 'checklist':       div.innerHTML = renderChecklist(); break;
    case 'documents':       div.innerHTML = renderDocuments(idx); break;
    case 'doc-board-res':   div.innerHTML = renderDocBoardRes(idx); break;
    case 'doc-uploads':     div.innerHTML = renderDocUploads(idx); break;
    case 'doc-references':  div.innerHTML = renderDocRefs(idx); break;
    case 'review':          div.innerHTML = renderReview(); break;
    case 'processing':      div.innerHTML = renderProcessingPage(); break;
    case 'done':            div.innerHTML = renderDone(); break;
  }
  return div;
}

// ── SLIDE RENDERERS ───────────────────────────────────────────────────────────
function renderWelcome(){
  if(S2_ROLE){
    return `<div class="slide-inner">
      <div class="welcome-badge">🏦 GTBank Business Account Opening</div>
      <h1 class="welcome-title">👋 You've been invited<br>to co-sign as <em>Signatory 2</em></h1>
      <p class="welcome-sub">Please fill in your personal details and signature. Takes about 5 minutes.</p>
      <div class="welcome-pills">
        <div class="w-pill">⏱️ About 5 minutes</div>
        <div class="w-pill">🔒 Secure &amp; private</div>
        <div class="w-pill">📱 Works on your phone</div>
      </div>
      <button class="start-btn" onclick="goNext()">Let's go <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </div>`;
  }
  const name = CFG_CUSTOMER ? escH(CFG_CUSTOMER.split(' ')[0]) : '';
  const greeting = name ? `Hi ${name}! 👋` : '👋 Welcome';
  const sentBy = CFG_OFFICER ? `<div class="w-pill">🏦 Sent by <strong style="margin-left:4px">${escH(CFG_OFFICER)}</strong> · GTBank</div>` : '';
  return `<div class="slide-inner">
    <div class="welcome-badge">🏦 GTBank Business Account Opening</div>
    <h1 class="welcome-title">${greeting}<br>Open your GTBank<br>business account <em>stress-free</em></h1>
    <p class="welcome-sub">We'll guide you section by section — just like a conversation. Auto-saves as you go. PDF generated on your device. 🔒</p>
    <div class="welcome-pills">${sentBy}
      <div class="w-pill">⏱️ About 15–20 minutes</div>
      <div class="w-pill">💾 Auto-saves as you go</div>
      <div class="w-pill">📄 PDF on your device</div>
    </div>
    <button class="start-btn" onclick="goNext()">Let's get started <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <p style="margin-top:12px;font-size:12px;color:var(--muted)">Use ↑↓ arrow keys or swipe to navigate</p>
    <p style="margin-top:24px;font-size:11px;color:var(--line)"><span style="cursor:pointer;user-select:none" onclick="devJump()">···</span></p>
  </div>`;
}

function devJump(){
  const idx = SLIDES.findIndex(s => s.type === 'add-signatories');
  if(idx > 0) goToSlide(idx, 0);
}

function renderSection(s){
  return `<div class="slide-inner" style="text-align:center;max-width:480px">
    <span class="slide-emoji">${s.emoji}</span>
    <h2 class="slide-q">${s.q.replace(/\n/g,'<br>')}</h2>
    <p class="slide-sub">${s.sub}</p>
    <button class="ok-btn" onclick="goNext()">Continue <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  </div>`;
}

function renderChoice(s, idx){
  const opts = s.opts.map(o => `
    <button class="choice-btn" data-val="${escQ(o.val)}" onclick="pickChoice('${escQ(s.id)}','${escQ(o.val)}',this,true,${idx})">
      <span class="choice-key">${o.key}</span>
      <span><span class="choice-label">${o.label}</span>${o.sub ? `<div class="choice-sub">${o.sub}</div>` : ''}</span>
    </button>`).join('');
  const skip = s.optional ? `<span class="skip-link" onclick="skipSlide()">Skip →</span>` : '';
  return `<div class="slide-inner">
    <span class="slide-emoji">${s.emoji}</span>
    <h2 class="slide-q">${s.q.replace(/\n/g,'<br>')}</h2>
    ${s.sub ? `<p class="slide-sub">${s.sub}</p>` : ''}
    <div class="choices" id="choices-${s.id}">${opts}</div>
    <div class="err-msg" id="err-${s.id}">Please make a selection to continue.</div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px">
      <button class="ok-btn" onclick="tryAdvance(${idx})">Continue <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <span class="press-hint">or <strong>Enter ↵</strong></span>${skip}
    </div>
  </div>`;
}

function renderText(s, idx){
  return `<div class="slide-inner">
    <span class="slide-emoji">${s.emoji}</span>
    <h2 class="slide-q">${s.q.replace(/\n/g,'<br>')}</h2>
    ${s.sub ? `<p class="slide-sub">${s.sub}</p>` : ''}
    <input class="tally-input" type="${s.inputType || 'text'}" id="${s.id}" placeholder="${s.placeholder || ''}" autocomplete="off"
      oninput="FD['${escQ(s.id)}']=this.value;autoSave()"
      onkeydown="if(event.key==='Enter'){event.preventDefault();tryAdvance(${idx})}">
    <div class="err-msg" id="err-${s.id}">This field is required.</div>
    ${okRow(idx, s)}
  </div>`;
}

function renderGroup(s, idx){
  const fields = s.fields.map(f => {
    if(f.type === 'select'){
      const opts = f.opts.map((o, i) => `<option value="${i === 0 ? '' : escQ(o)}">${o}</option>`).join('');
      return `<div class="group-field"><label for="${f.id}">${f.label}</label><select class="tally-select" id="${f.id}" onchange="FD['${f.id}']=this.value;autoSave()">${opts}</select></div>`;
    }
    return `<div class="group-field"><label for="${f.id}">${f.label}</label><input class="tally-input" type="${f.type || 'text'}" id="${f.id}" placeholder="${f.placeholder || ''}" oninput="FD['${f.id}']=this.value;autoSave()">${f.hint ? `<div style="font-size:12px;margin-top:4px;color:var(--muted)">${f.hint}</div>` : ''}</div>`;
  }).join('');
  const extra = s.extraId === 'scuml-block' ? renderSCUMLInline() : '';
  return `<div class="slide-inner">
    <span class="slide-emoji">${s.emoji}</span>
    <h2 class="slide-q">${s.q.replace(/\n/g,'<br>')}</h2>
    ${s.sub ? `<p class="slide-sub">${s.sub}</p>` : ''}
    <div class="group-fields">${fields}${extra}</div>
    <div class="err-msg" id="err-group-${idx}">Please fill in all required fields.</div>
    ${okRow(idx, s)}
  </div>`;
}

function renderSCUMLInline(){
  const opts = DNFI_LIST.map(d => `<option value="${escQ(d)}">${d}</option>`).join('');
  return `<div class="group-field" id="scuml-wrap">
    <label>Does your business fall into any of these regulated categories?</label>
    <select class="tally-select" id="bizDNFIType" onchange="FD['bizDNFIType']=this.value;toggleSCUML();autoSave()">
      <option value="">None of these apply to my business</option>${opts}
    </select>
    <div id="scuml-input-wrap" style="display:none;margin-top:12px">
      <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:5px;display:block">SCUML Registration Number</label>
      <input class="tally-input" type="text" id="bizSCUML" placeholder="Your SCUML number" oninput="FD['bizSCUML']=this.value;autoSave()">
    </div>
  </div>`;
}

function renderAccountProduct(s, idx){
  const cards = ACCT_PRODUCTS.map(p => {
    const featuresHtml = `<div style="display:flex;flex-direction:column;gap:5px;margin-bottom:${p.variants || p.conditions ? '12px' : '0'}">
      ${p.features.map(f => `<div style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--ink)"><span style="color:var(--success);font-size:11px;flex-shrink:0">✔</span>${f}</div>`).join('')}
    </div>`;
    const tiersHtml = p.variants ? `
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:8px">Choose your tier</div>
      <div class="acct-variant-row">
        ${p.variants.map(v => `
          <button class="acct-variant-btn" id="acct-v-${p.id}-${v.id}"
            onclick="pickProductVariant('${p.id}','${v.id}','${escQ(v.name)}',${idx})">
            <div class="acct-variant-left">
              <span class="acct-variant-name">${v.name}</span>
              <span class="acct-variant-meta">${v.meta}</span>
            </div>
            <span class="acct-variant-badge">${v.badge}</span>
          </button>`).join('')}
      </div>` : '';
    const conditionsHtml = p.conditions
      ? `<div style="margin-top:10px;padding:10px 12px;background:#FFF8F0;border:1px solid #FDDFD0;border-radius:8px;font-size:11px;color:#8B4513;line-height:1.6">⚠️ <strong>Important conditions:</strong> ${p.conditions}</div>`
      : '';
    return `<div class="acct-group" id="acct-group-${p.id}">
      <div class="acct-group-head" onclick="toggleProductGroup('${p.id}',${idx},${p.variants ? 'true' : 'false'})">
        <span class="acct-group-icon">${p.icon}</span>
        <div class="acct-group-info">
          <div class="acct-group-name">${p.name}</div>
          <div class="acct-group-desc">${p.desc}</div>
        </div>
        <div class="acct-group-check" id="acct-check-${p.id}">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </div>
      <div class="acct-variants" id="acct-variants-${p.id}">
        ${featuresHtml}${tiersHtml}${conditionsHtml}
      </div>
    </div>`;
  }).join('');
  return `<div class="slide-inner">
    <span class="slide-emoji">${s.emoji}</span>
    <h2 class="slide-q">${s.q.replace(/\n/g,'<br>')}</h2>
    <p class="slide-sub">${s.sub}</p>
    <div style="margin-bottom:8px">${cards}</div>
    <div class="err-msg" id="err-acct-product">Please select an account type to continue.</div>
    ${okRow(idx, s)}
  </div>`;
}

function renderDomiciliary(s, idx){
  const chips = DOMI_CURRENCIES.map(c => `
    <div class="domi-chip" id="domi-${c.id}" onclick="toggleDomi('${c.id}')">
      <span class="domi-flag">${c.flag}</span>
      <div class="domi-info">
        <span class="domi-name">${c.name}</span>
        <span class="domi-sub">${c.sub}</span>
      </div>
      <div class="domi-check" id="domi-check-${c.id}">
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    </div>`).join('');
  return `<div class="slide-inner">
    <span class="slide-emoji">${s.emoji}</span>
    <h2 class="slide-q">${s.q.replace(/\n/g,'<br>')}</h2>
    <p class="slide-sub">${s.sub}</p>
    <div class="domi-chips">${chips}</div>
    <div style="padding:10px 14px;background:#F8F6F4;border-radius:10px;font-size:12px;color:var(--muted);margin-bottom:20px">
      💡 No additional documents required. A domiciliary account will be opened alongside your naira account.
    </div>
    ${okRow(idx, s)}
  </div>`;
}

function renderBVN(s, idx){
  return `<div class="slide-inner">
    <span class="slide-emoji">${s.emoji}</span>
    <h2 class="slide-q">${s.q.replace(/\n/g,'<br>')}</h2>
    <p class="slide-sub">${s.sub}</p>
    <div class="bvn-wrap">
      <input class="tally-input" type="text" id="${s.id}" maxlength="11" placeholder="${s.placeholder || ''}"
        oninput="onBVNInput('${s.id}',${idx})"
        onkeydown="if(event.key==='Enter'){event.preventDefault();tryAdvance(${idx})}">
      <span class="bvn-ok" id="${s.id}-ok">✓ Valid</span>
    </div>
    <div class="input-hint">11 digits — no spaces or dashes</div>
    <div class="err-msg" id="err-${s.id}">BVN must be exactly 11 digits.</div>
    ${okRow(idx, s)}
  </div>`;
}

function renderNationality(s, idx){
  const px = s.prefix || 's1';
  return `<div class="slide-inner">
    <span class="slide-emoji">${s.emoji}</span>
    <h2 class="slide-q">${s.q}</h2>
    <div class="choices" id="choices-${s.id}">
      <button class="choice-btn" data-val="Nigerian" onclick="pickNationality('Nigerian',this,${idx},'${px}')">
        <span class="choice-key">A</span><span class="choice-label">Nigerian 🇳🇬</span>
      </button>
      <button class="choice-btn" data-val="Other" onclick="pickNationality('Other',this,${idx},'${px}')">
        <span class="choice-key">B</span><span class="choice-label">Other nationality</span>
      </button>
    </div>
    <div class="inline-fields" id="other-country-wrap-${px}">
      <div>${lbl('Country of nationality *')}<input class="tally-input" type="text" id="${px}NationalityCountry" placeholder="e.g. Ghana, United Kingdom…" oninput="FD['${px}NationalityCountry']=this.value;autoSave()"></div>
      <div>${lbl('Resident permit number')}<input class="tally-input" type="text" id="${px}ResidentPermit" placeholder="Permit number" oninput="FD['${px}ResidentPermit']=this.value;autoSave()"></div>
      <div>${lbl('Social security number')}<input class="tally-input" type="text" id="${px}SocialSecurity" placeholder="SSN (if applicable)" oninput="FD['${px}SocialSecurity']=this.value;autoSave()"></div>
      <div style="display:flex;gap:12px">
        <div style="flex:1">${lbl('Permit issue date')}<input class="tally-input" type="date" id="${px}PermitIssue" oninput="FD['${px}PermitIssue']=this.value;autoSave()"></div>
        <div style="flex:1">${lbl('Permit expiry date')}<input class="tally-input" type="date" id="${px}PermitExpiry" oninput="FD['${px}PermitExpiry']=this.value;autoSave()"></div>
      </div>
    </div>
    <div class="err-msg" id="err-${s.id}">Please select your nationality.</div>
    ${okRow(idx, s)}
  </div>`;
}

function renderOtherResidency(s, idx){
  const px = s.prefix || 's1';
  return `<div class="slide-inner">
    <span class="slide-emoji">${s.emoji}</span>
    <h2 class="slide-q">${s.q.replace(/\n/g,'<br>')}</h2>
    <div class="choices" id="choices-${s.id}">
      <button class="choice-btn" data-val="YES" onclick="pickOtherRes('YES',this,${idx},'${px}')">
        <span class="choice-key">A</span><span class="choice-label">Yes</span>
      </button>
      <button class="choice-btn" data-val="NO" onclick="pickOtherRes('NO',this,${idx},'${px}')">
        <span class="choice-key">B</span><span class="choice-label">No</span>
      </button>
    </div>
    <div class="inline-fields" id="other-res-wrap-${px}">
      <div>${lbl('Which country?')}<input class="tally-input" type="text" id="${px}OtherResCountry" placeholder="e.g. United Kingdom" oninput="FD['${px}OtherResCountry']=this.value;autoSave()"></div>
      <div>${lbl('Resident permit number')}<input class="tally-input" type="text" id="${px}ResidentPermit2" placeholder="Permit number" oninput="FD['${px}ResidentPermit2']=this.value;autoSave()"></div>
      <div style="display:flex;gap:12px">
        <div style="flex:1">${lbl('Permit issue date')}<input class="tally-input" type="date" id="${px}PermitIssue2" oninput="FD['${px}PermitIssue2']=this.value;autoSave()"></div>
        <div style="flex:1">${lbl('Permit expiry date')}<input class="tally-input" type="date" id="${px}PermitExpiry2" oninput="FD['${px}PermitExpiry2']=this.value;autoSave()"></div>
      </div>
    </div>
    <div class="err-msg" id="err-${s.id}"></div>
    ${okRow(idx, s)}
  </div>`;
}

function renderIDSelect(s, idx){
  const px = s.prefix || 's1';
  const opts = ID_KEYS.map((k, i) => `
    <button class="choice-btn" data-val="${escQ(k)}" data-kidx="${i}" onclick="pickID('${escQ(s.idField)}',${i},this,${idx},'${px}')">
      <span class="choice-key">${String.fromCharCode(65 + i)}</span>
      <span class="choice-label">${k}</span>
    </button>`).join('');
  return `<div class="slide-inner">
    <span class="slide-emoji">${s.emoji}</span>
    <h2 class="slide-q">${s.q.replace(/\n/g,'<br>')}</h2>
    <p class="slide-sub">${s.sub}</p>
    <div class="choices" id="choices-${s.idField}">${opts}</div>
    <div id="id-number-wrap-${px}" style="display:none">${lbl('ID number *')}<input class="tally-input" type="text" id="${px}IDNumber" placeholder="ID number" oninput="FD['${px}IDNumber']=this.value;autoSave()"></div>
    <div class="inline-fields" id="id-fields-wrap-${px}">
      <div><label>Issue date</label><input class="tally-input" type="date" id="${px}IDIssue" oninput="FD['${px}IDIssue']=this.value;autoSave()"></div>
      <div><label>Expiry date</label><input class="tally-input" type="date" id="${px}IDExpiry" oninput="FD['${px}IDExpiry']=this.value;autoSave()"></div>
    </div>
    <div class="err-msg" id="err-${s.idField}">Please select an ID type.</div>
    ${okRow(idx, s)}
  </div>`;
}

function renderAddress(s, idx){
  const pre = s.prefix;
  const spfx = s.sigPfx || (s.prefix || 's1Res').replace('Res','') || 's1';
  const stateOpts = ['Select state',...STATES].map((o, i) => `<option value="${i === 0 ? '' : escQ(o)}">${o}</option>`).join('');
  return `<div class="slide-inner">
    <span class="slide-emoji">${s.emoji}</span>
    <h2 class="slide-q">${s.q}</h2>
    <p class="slide-sub">${s.sub}</p>
    <label class="same-toggle" id="same-biz-toggle-${spfx}" onclick="toggleSameAsBusiness(this,'${spfx}')">
      <input type="checkbox" id="same-biz-check-${spfx}" style="pointer-events:none">
      <span>Same as business address</span>
    </label>
    <div id="res-fields-wrap-${spfx}" class="group-fields" style="margin-bottom:20px">
      <div class="group-field"><label>House / plot number</label><input class="tally-input" type="text" id="${pre}HousePlot" placeholder="e.g. 12" oninput="FD['${pre}HousePlot']=this.value;autoSave()"></div>
      <div class="group-field"><label>Street name *</label><input class="tally-input" type="text" id="${pre}Street" placeholder="e.g. Broad Street" oninput="FD['${pre}Street']=this.value;autoSave()"></div>
      <div class="group-field"><label>Nearest bus stop / landmark</label><input class="tally-input" type="text" id="${pre}BusStop" placeholder="e.g. Near Shoprite" oninput="FD['${pre}BusStop']=this.value;autoSave()"></div>
      <div class="group-field"><label>City / town *</label><input class="tally-input" type="text" id="${pre}City" placeholder="e.g. Lagos" oninput="FD['${pre}City']=this.value;autoSave()"></div>
      <div class="group-field"><label>LGA</label><input class="tally-input" type="text" id="${pre}LGA" placeholder="Local govt. area" oninput="FD['${pre}LGA']=this.value;autoSave()"></div>
      <div class="group-field"><label>State *</label><select class="tally-select" id="${pre}State" onchange="FD['${pre}State']=this.value;autoSave()">${stateOpts}</select></div>
      <div class="group-field"><label>Mailing address (if different)</label><input class="tally-input" type="text" id="${pre}MailAddr" placeholder="Leave blank if same as above" oninput="FD['${pre}MailAddr']=this.value;autoSave()"></div>
    </div>
    <div class="err-msg" id="err-group-${idx}">Please fill in the required address fields.</div>
    ${okRow(idx, s)}
  </div>`;
}

function renderSignature(s, idx){
  return `<div class="slide-inner">
    <span class="slide-emoji">${s.emoji}</span>
    <h2 class="slide-q">${s.q}</h2>
    <p class="slide-sub">${s.sub}</p>
    <div class="sig-capture-btns" id="sig-capture-btns-${idx}">
      <button class="sig-capture-btn" onclick="openSignatureCapture(${idx},'camera')">
        <span class="sig-icon">📸</span>
        <span><strong>Take a photo</strong><br><span style="font-size:12px;color:var(--muted)">Opens your camera — point at your signature</span></span>
      </button>
      <button class="sig-capture-btn" onclick="openSignatureCapture(${idx},'file')">
        <span class="sig-icon">🖼️</span>
        <span><strong>Upload from gallery</strong><br><span style="font-size:12px;color:var(--muted)">Choose a photo you've already taken</span></span>
      </button>
    </div>
    <input type="file" id="sig-input-${idx}" accept="image/*" capture="environment" style="display:none" onchange="processSignatureFile(${idx},this)">
    <div class="sig-crop-wrap" id="sig-crop-${idx}">
      <p class="sig-crop-hint">✨ <strong>Auto-detected your signature</strong> — drag the box to adjust if needed, then tap Crop &amp; clean</p>
      <div class="sig-crop-stage" id="sig-crop-stage-${idx}">
        <canvas id="sig-crop-canvas-${idx}"></canvas>
        <div class="sig-crop-box" id="sig-crop-box-${idx}" style="display:none"></div>
      </div>
      <div class="sig-crop-btns">
        <button class="sig-crop-btn" onclick="retakeSignature(${idx})">↩ Retake</button>
        <button class="sig-crop-btn primary" onclick="confirmCrop(${idx})">✂️ Crop &amp; clean</button>
      </div>
    </div>
    <div class="sig-processing" id="sig-proc-${idx}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="animation:spin 1s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="var(--orange)" stroke-width="2" stroke-linecap="round"/></svg>
      Cleaning signature…
    </div>
    <div class="sig-accepted-badge" id="sig-ok-badge-${idx}" style="justify-content:space-between">
      <span>✅ Signature captured — looking clean!</span>
      <button onclick="retakeSignature(${idx})" style="background:none;border:none;font-size:12px;color:var(--muted);cursor:pointer;font-weight:600;text-decoration:underline">Redo</button>
    </div>
    <div class="sig-preview-wrap" id="sig-preview-${idx}">
      <div class="sig-canvas-row">
        <div class="sig-canvas-box"><p>Original photo</p><canvas id="sig-before-${idx}" height="120"></canvas></div>
        <div class="sig-canvas-box" style="position:relative">
          <p>Cleaned signature</p>
          <canvas id="sig-after-${idx}" class="clean-bg" height="120"></canvas>
          <div id="sig-confirm-btns-${idx}" style="display:none;margin-top:8px;flex-direction:column;gap:8px">
            <button class="sig-confirm-btn accept" onclick="acceptSignature(${idx})">✅ Looks good — use this</button>
            <button class="sig-confirm-btn" onclick="retakeSignature(${idx})">🔄 Retake</button>
          </div>
        </div>
      </div>
    </div>
    <div class="err-msg" id="err-${s.id}">Please capture your signature to continue.</div>
    <button class="ok-btn" id="sig-continue-${idx}" style="display:none;margin-top:8px" onclick="goNext()">Continue <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  </div>`;
}

function renderSalary(s, idx){
  return `<div class="slide-inner">
    <span class="slide-emoji">${s.emoji}</span>
    <h2 class="slide-q">${s.q.replace(/\n/g,'<br>')}</h2>
    <div class="choices" id="choices-salary">
      <button class="choice-btn" data-val="Yes" onclick="pickSalary('Yes',this)">
        <span class="choice-key">A</span><span class="choice-label">Yes — we pay salaries from this account</span>
      </button>
      <button class="choice-btn" data-val="No" onclick="pickSalary('No',this)">
        <span class="choice-key">B</span><span class="choice-label">No salary payments needed</span>
      </button>
    </div>
    <div id="employees-wrap" style="display:none;margin-bottom:20px">
      <div class="group-field">
        <label>Number of employees on payroll</label>
        <select class="tally-select" id="staffCount" onchange="FD['staffCount']=this.value;autoSave()">
          <option value="">Select range</option>
          <option>1 – 50</option><option>51 – 200</option><option>201 – 500</option><option>Over 500</option>
        </select>
      </div>
    </div>
    <button class="ok-btn" id="salary-ok-btn" style="display:none;margin-top:14px" onclick="goNext()">OK ✓</button>
    <span class="skip-link" onclick="skipSlide()">Skip →</span>
  </div>`;
}

function renderSCUML(s, idx){
  return `<div class="slide-inner" style="display:none"></div>`;
}

function renderAddSig(s, idx){
  const hasSent = !!FD._s2SessionId;
  const hasS2 = !!FD._hasS2 || !!(FD.s2Surname);
  return `<div class="slide-inner">
    <span class="slide-emoji">👥</span>
    <h2 class="slide-q">Do you need to add\nanother signatory?</h2>
    <p class="slide-sub">For partnerships you need at least 2 signatories. Add them here or send a private link for them to fill on their own device.</p>
    ${hasS2 ? `<div style="padding:12px 16px;background:var(--success-bg);border:1px solid var(--success);border-radius:10px;font-size:13px;color:var(--success);margin-bottom:16px">
      ✅ <strong>Signatory 2${FD.s2Surname ? ' — ' + FD.s2FirstName + ' ' + FD.s2Surname : ''} added.</strong>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="ok-btn" style="font-size:12px;padding:6px 12px" onclick="FD._hasS2=true;autoSave();goToSlide(SLIDES.findIndex(s=>s.s2slide),cur)">Edit Signatory 2 →</button>
        <button class="ok-btn" style="font-size:12px;padding:6px 12px;background:var(--muted)" onclick="goNext()">Continue ↓</button>
      </div>
    </div>` : ''}
    <div id="s2-status-badge" style="margin-bottom:16px"></div>
    <div style="margin-bottom:20px">
      <div class="sig-option-card" onclick="addSigHere()">
        <div class="sig-option-title">➕ Fill Signatory 2 here</div>
        <div class="sig-option-sub">You have their info — fill it in yourself on this device</div>
      </div>
      <div class="sig-option-card" onclick="sendSigLink()">
        <div class="sig-option-title">📨 Send them a private link</div>
        <div class="sig-option-sub">They fill on their own phone — signature, photo, everything</div>
      </div>
      <div class="sig-option-card" onclick="goNext()">
        <div class="sig-option-title">⏭️ Skip — sole proprietorship</div>
        <div class="sig-option-sub">Only one signatory needed</div>
      </div>
    </div>
    <div id="send-sig-wrap" style="display:none;padding:16px;background:#F8F6F4;border-radius:10px;margin-bottom:16px">
      <div class="group-field" style="margin-bottom:12px"><label>Signatory 2 full name</label><input class="tally-input" type="text" id="sig2LinkName" placeholder="Full name" value="${escH(FD.sig2LinkName || '')}" oninput="FD['sig2LinkName']=this.value"></div>
      <div class="group-field" style="margin-bottom:12px"><label>Their email address *</label><input class="tally-input" type="email" id="sig2LinkEmail" placeholder="signatory@email.com" value="${escH(FD.sig2LinkEmail || '')}" oninput="FD['sig2LinkEmail']=this.value"></div>
      <button id="send-link-btn" class="ok-btn" onclick="confirmSendLink()">📨 Send link via email</button>
      <div style="margin-top:8px;font-size:12px;color:var(--muted)">A unique secure link will be emailed to them. Only valid for 7 days.</div>
    </div>
    ${hasSent ? `<div style="margin-bottom:16px;font-size:13px;color:var(--muted)">Link already sent. <button style="background:none;border:none;color:var(--orange);cursor:pointer;font-size:13px;text-decoration:underline" onclick="checkS2Status()">Check if submitted →</button></div>` : ''}
  </div>`;
}

function renderConsent(s, idx){
  const skip = s.optional ? `<span class="skip-link" onclick="skipSlide()">Skip / decide later →</span>` : '';
  const warn = s.warn ? `<div class="consent-warn" id="consent-warn-${s.id}">${s.warn}</div>` : '';
  return `<div class="slide-inner" style="max-width:640px">
    <span class="slide-emoji">${s.emoji}</span>
    <h2 class="slide-q">${s.q.replace(/\n/g,'<br>')}</h2>
    <p class="slide-sub">${s.sub}</p>
    <div class="consent-body">${s.body}</div>
    <div class="consent-btns">
      <button class="c-btn yes" id="c-yes-${s.id}" onclick="giveConsent('${s.id}','accepted',${idx},${s.required})">✅ I accept</button>
      <button class="c-btn no"  id="c-no-${s.id}"  onclick="giveConsent('${s.id}','declined',${idx},${s.required})">✗ I decline</button>
    </div>${warn}${skip}
  </div>`;
}

function renderTerms(idx){
  return `<div class="slide-inner" style="max-width:640px">
    <span class="slide-emoji">📜</span>
    <h2 class="slide-q">Terms, Privacy\n&amp; Declaration</h2>
    <p class="slide-sub">Please read and accept all sections below to continue.</p>
    <div class="terms-block">
      <div class="terms-block-title">Terms &amp; Conditions</div>
      <div class="terms-scroll">
        <p>These Terms and Conditions govern your application to open a business account with <strong>Guaranty Trust Bank Limited</strong> ("GTBank", "the Bank"). By submitting this form, you agree to be bound by the following:</p>
        <h4>1. Account Opening</h4>
        <p>The Bank reserves the right to accept or decline any account opening application at its sole discretion. Approval is subject to satisfactory KYC and AML checks as required by the CBN.</p>
        <h4>2. Global Standing Instruction (GSI)</h4>
        <p>By accepting these terms, I/we give express consent to GTBank to invoke the CBN's Global Standing Instruction (GSI) framework to recover any outstanding loan obligations.</p>
        <h4>3. Account Operation</h4>
        <ul>
          <li>You must operate your account in accordance with the Bank's guidelines and applicable Nigerian laws.</li>
          <li>The Bank may place restrictions on transactions that appear suspicious or inconsistent with your stated business activity.</li>
          <li>You are responsible for the security of your account credentials and online banking tokens.</li>
          <li>The Bank reserves the right to close or suspend any account found to be used for fraudulent, illegal, or unauthorized activities.</li>
        </ul>
        <h4>4. Fees &amp; Charges</h4>
        <p>Account maintenance fees, transaction charges, and other applicable fees will be applied in accordance with GTBank's current tariff schedule, which may be updated from time to time.</p>
        <h4>5. Accuracy of Information</h4>
        <p>You certify that all information provided is true, complete, and accurate. Providing false or misleading information is a criminal offence under Nigerian law.</p>
        <h4>6. Governing Law</h4>
        <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>
      </div>
    </div>
    <div class="terms-block">
      <div class="terms-block-title">Privacy Policy</div>
      <div class="terms-scroll">
        <p><strong>Guaranty Trust Bank Limited</strong> is committed to protecting your personal data in accordance with the Nigeria Data Protection Act 2023 (NDPA), the NDPR, and the CBN Consumer Protection Framework.</p>
        <h4>What We Collect</h4>
        <p>We collect personal data including: full name, date of birth, BVN, contact details, identification documents, residential address, employment information, and financial information.</p>
        <h4>How We Use Your Data</h4>
        <ul>
          <li>To open and manage your business account</li>
          <li>To verify your identity and conduct KYC/AML checks</li>
          <li>To comply with regulatory and legal obligations (CBN, FIRS, NFIU, SCUML)</li>
          <li>To detect and prevent fraud</li>
          <li>To communicate account statements, alerts, and service updates</li>
        </ul>
        <h4>Data Sharing</h4>
        <p>Your data may be shared with regulatory authorities (CBN, NDPC, NFIU), credit bureaus, GTBank Group entities, and trusted third-party service providers. We do not sell your personal data.</p>
        <h4>Your Rights</h4>
        <p>You have the right to access, correct, or request deletion of your personal data. Contact our Data Protection Officer at <strong>dpo.ng@gtbank.com</strong>.</p>
      </div>
    </div>
    <div class="terms-block">
      <div class="terms-block-title">Declaration</div>
      <div class="terms-scroll">
        <p>I/We hereby declare that:</p>
        <ul>
          <li>All information provided is true, accurate, and complete to the best of my/our knowledge.</li>
          <li>I/We are not subject to any sanctions or legal restrictions that would prevent me/us from opening a bank account.</li>
          <li>The funds to be deposited are from legitimate sources and are not proceeds of any unlawful activity.</li>
          <li>I/We will promptly notify GTBank of any changes to the information provided.</li>
        </ul>
      </div>
    </div>
    <div class="terms-consent-box" id="terms-consent-box">
      <label class="terms-consent-label">
        <input type="checkbox" id="terms-check" onchange="onTermsCheck(${idx})">
        <span>I have read and understood the Terms &amp; Conditions, Privacy Policy, and Declaration above. I/We consent to the Global Standing Instruction (GSI), data processing, and confirm that all information provided is accurate and truthful.</span>
      </label>
    </div>
    <div class="terms-consent-box" id="marketing-consent-box" style="border-color:var(--line)">
      <label class="terms-consent-label">
        <input type="checkbox" id="marketing-check" onchange="onMarketingCheck()">
        <span><strong>Optional:</strong> I agree to receive marketing communications from GTBank via SMS, email, or phone. I can withdraw this consent at any time.</span>
      </label>
    </div>
    <div class="terms-err" id="terms-err">You must accept the Terms, Privacy Policy and Declaration to continue.</div>
    <div style="margin-top:16px">
      <button class="ok-btn" onclick="tryTermsAdvance(${idx})">I agree — Continue <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </div>
  </div>`;
}

function renderReferencesPage(idx){
  function refBlock(n){
    return `<div style="border:1.5px solid var(--line);border-radius:12px;padding:16px;margin-bottom:14px;background:#fff">
      <div style="font-size:12px;font-weight:700;color:var(--orange);margin-bottom:12px">Referee ${n}</div>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <button class="doc-upload-btn" id="ref${n}-upload-btn" style="flex:1;justify-content:center" onclick="toggleRefMode(${n},'upload')">📎 Upload filled form</button>
        <button class="doc-upload-btn" id="ref${n}-link-btn" style="flex:1;justify-content:center" onclick="toggleRefMode(${n},'link')">📨 Send a link</button>
      </div>
      <div id="ref${n}-upload-wrap" style="display:none">
        <input type="file" id="ref${n}-file-input" accept="image/*,.pdf" style="display:none" onchange="markRefUploaded(${n},this)">
        <button class="doc-upload-btn" onclick="document.getElementById('ref${n}-file-input').click()">📎 Choose referee form</button>
        <div id="ref${n}-upload-done" style="display:none;font-size:12px;color:var(--success);font-weight:600;margin-top:8px">✅ Referee form uploaded</div>
      </div>
      <div id="ref${n}-link-wrap" style="display:none">
        <div class="group-fields" style="margin-bottom:12px">
          <div class="group-field"><label>Referee's full name *</label><input class="tally-input" type="text" id="ref${n}Name" placeholder="Full name" oninput="FD['ref${n}Name']=this.value;autoSave()"></div>
          <div class="group-field"><label>Email address *</label><input class="tally-input" type="email" id="ref${n}Email" placeholder="referee@email.com" oninput="FD['ref${n}Email']=this.value;autoSave()"></div>
        </div>
        <button class="ok-btn" style="font-size:12px;padding:8px 16px" onclick="generateRefLink(${n})">📨 Generate &amp; copy link</button>
        <div id="ref${n}-link-sent" style="display:none;margin-top:10px;font-size:12px;color:var(--success);font-weight:600">✅ Link copied! Send via WhatsApp or email.</div>
      </div>
    </div>`;
  }
  return `<div class="slide-inner" style="max-width:640px">
    <div style="margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid var(--line)">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--orange);margin-bottom:6px">Account References</div>
      <h2 style="font-family:'DM Serif Display',serif;font-size:clamp(22px,4vw,32px);color:var(--dark);line-height:1.2;margin-bottom:6px">Your two referees</h2>
      <p style="font-size:13px;color:var(--muted)">GTBank requires two referees. Upload their completed referee form, or send them a link to fill it online.</p>
    </div>
    <div style="padding:10px 14px;background:#F8F6F4;border-radius:10px;font-size:12px;color:var(--ink);line-height:1.8;margin-bottom:16px">
      Accepted combinations:<br>
      ✔ Two personal GTBank current / domiciliary account holders<br>
      ✔ One GTBank holder + one other bank business account holder<br>
      ✔ Two other bank business account holders
    </div>
    ${refBlock(1)}
    ${refBlock(2)}
    ${okRow(idx, {optional:true})}
  </div>`;
}

function renderChecklist(){
  const sigCount = 1 + (FD['s2Surname'] ? 1 : 0) + (FD['s3Surname'] ? 1 : 0);
  const sigLabel = sigCount > 1 ? `Signatories' details (${sigCount})` : 'Signatory details';
  function chk(label, done, optional){
    const cls = done ? 'done' : optional ? 'pending' : 'warn';
    const icon = done ? '✅' : optional ? '○' : '⚠️';
    const status = done ? 'Done' : optional ? 'Optional' : 'Incomplete';
    return `<div class="chk-item ${cls}"><span class="chk-icon">${icon}</span><span class="chk-label">${label}</span><span class="chk-status">${status}</span></div>`;
  }
  const bizDone  = !!(FD.bizName && FD.bizAccountProduct && FD.bizAddr1 && FD.bizState);
  const sigDone  = !!(FD.s1Surname && FD.s1FirstName && FD.s1BVN && FD.s1IDType && FD.s1Signature && (FD.s1ResStreet || FD.sameAsBusiness));
  const nokDone  = !!(FD.nokSurname && FD.nokRelationship);
  const svcsDone = !!(FD.onlineBanking || FD.stmtFreq || FD.chequeBook);
  const termsDone = CONSENTS.terms === 'accepted';
  const allRequired = bizDone && sigDone && nokDone && termsDone;
  return `<div class="slide-inner" style="max-width:620px">
    <span class="slide-emoji">📋</span>
    <h2 class="slide-q">Almost there —\nquick check</h2>
    <p class="slide-sub">Here's where things stand before we get to your documents.</p>
    <div class="chk-list">
      ${chk('Business details', bizDone, false)}
      ${chk(sigLabel, sigDone, false)}
      ${chk('Next of kin', nokDone, false)}
      ${chk('Account services', svcsDone, true)}
      ${chk('Terms & Declaration', termsDone, false)}
    </div>
    ${allRequired
      ? `<div style="padding:12px 14px;background:var(--success-bg);border-radius:10px;font-size:13px;color:var(--success);font-weight:600;margin-bottom:20px">✅ All required sections complete — you're good to go!</div>`
      : `<div style="padding:12px 14px;background:#FFF8F0;border-radius:10px;font-size:12px;color:#8B4513;margin-bottom:20px">Some sections are incomplete. You can still continue but the bank may require you to complete them.</div>`
    }
    <button class="ok-btn" onclick="goNext()">Continue to documents <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  </div>`;
}

function _boardResLetterHTML(){
  const biz = FD.bizName || '[Business Name]';
  const bn = FD.bizRegNumber || '[BN Number]';
  const addr = [FD.bizHousePlot,FD.bizAddr1,FD.bizCity,FD.bizState].filter(Boolean).join(', ') || '[Business Address]';
  const mobile = FD.bizMobile || FD.s1Mobile || '';
  const email = FD.bizEmail || FD.s1Email || '';
  const sig1 = [FD.s1Title,FD.s1FirstName,FD.s1OtherNames,FD.s1Surname].filter(Boolean).join(' ') || '[Signatory Name]';
  const position = FD.s1Position || 'Director';
  const today = new Date().toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'});
  const sigImg = FD.s1Signature ? `<img src="${escH(FD.s1Signature)}" style="height:52px;max-width:180px;display:block;margin-bottom:4px;object-fit:contain">` : `<div style="width:160px;border-bottom:1.5px solid #333;margin-bottom:4px;height:48px"></div>`;
  const contactLine = [mobile ? `📞 ${mobile}` : '', email ? `✉ ${email}` : ''].filter(Boolean).join('&nbsp;&nbsp;·&nbsp;&nbsp;');
  const html = `
    <div style="text-align:center;padding-bottom:14px;margin-bottom:14px;border-bottom:2.5px solid #E8470A">
      <div style="font-family:'DM Serif Display',serif;font-size:22px;font-weight:700;color:#1A1208;letter-spacing:-.3px;text-transform:uppercase">${biz}</div>
      <div style="font-size:11px;color:#555;margin-top:4px">${addr}</div>
      ${contactLine ? `<div style="font-size:11px;color:#555;margin-top:2px">${contactLine}</div>` : ''}
    </div>
    <div style="font-size:12px;line-height:1.9;color:#1A1208">
      <p>The Manager,<br>Guaranty Trust Bank Ltd,<br>Lagos State.</p>
      <p style="margin-top:12px">Dear Sir/Ma,</p>
      <p style="margin-top:12px;font-weight:700;text-decoration:underline;text-align:center">RESOLUTION FOR ACCOUNT OPENING / CONFIRMATION OF NO PRIOR ANNUAL REPORT (BN NO ${bn})</p>
      <p style="margin-top:12px">At the Meeting of the Board of Directors of <strong>${biz.toUpperCase()}</strong>, held at <strong>${addr}</strong> on the <strong>${today}</strong>, the following resolutions were duly passed:</p>
      <ol style="margin:12px 0 12px 18px;display:flex;flex-direction:column;gap:10px">
        <li>THAT the Company be and is hereby authorized to open and operate an account with <strong>Guaranty Trust Bank Ltd</strong> ("the Bank");</li>
        <li>THAT the following signatories are hereby authorized:<br><br>
          <span style="margin-left:16px">Signatory: <strong>${sig1}</strong> — A</span><br>
          <span style="margin-left:16px">Mandate: <strong>Sole Signatory</strong></span>
        </li>
        <li>THAT as of the date of this letter, <strong>${biz.toUpperCase()}</strong> has not prepared, filed, or published any annual reports for any previous fiscal years.</li>
      </ol>
      <p>Thank you for your cooperation.</p>
      <div style="margin-top:28px">
        ${sigImg}
        <div style="font-weight:700;font-size:12px">${sig1}</div>
        <div style="font-size:11px;color:#555">${position}</div>
      </div>
    </div>`;
  window._boardResolutionHTML = html;
  window._boardResolutionText = `${biz}\n${addr}\n\nThe Manager,\nGuaranty Trust Bank Ltd,\nLagos State.\n\nRESOLUTION FOR ACCOUNT OPENING (BN NO ${bn})\n\nHeld at ${addr} on ${today}.\n\n1. THAT the Company be authorized to open an account with Guaranty Trust Bank Ltd.\n2. Signatory: ${sig1} — Mandate: Sole Signatory\n3. No prior annual reports filed.\n\n______________________________\n${sig1}\n${position}`;
  return html;
}

function renderDocBoardRes(idx){
  const letterHTML = _boardResLetterHTML();
  return `<div class="slide-inner" style="max-width:640px">
    <div style="margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid var(--line)">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--orange);margin-bottom:6px">Documents · 1 of 3</div>
      <h2 style="font-family:'DM Serif Display',serif;font-size:clamp(20px,4vw,28px);color:var(--dark);line-height:1.2;margin-bottom:6px">Board Resolution</h2>
      <p style="font-size:13px;color:var(--muted)">We've pre-filled your board resolution using your details. Review it and adopt — or download to edit.</p>
    </div>
    <div class="resolution-box" style="margin-bottom:8px">
      <div class="resolution-head">
        <span class="resolution-head-title">📄 Pre-filled board resolution</span>
        <span style="font-size:11px;color:var(--muted)">Your details &amp; signature included</span>
      </div>
      <div class="resolution-preview" id="resolution-preview" style="max-height:300px;background:#fff;padding:20px 22px;font-family:'DM Sans',sans-serif">${letterHTML}</div>
      <div class="resolution-actions">
        <button class="res-btn primary" onclick="adoptResolution()">Adopt this resolution</button>
        <button class="res-btn" onclick="downloadResolution()">⬇️ Download to edit (.doc)</button>
      </div>
    </div>
    <div id="resolution-adopted" style="display:none;padding:10px 14px;background:var(--success-bg);border-radius:8px;font-size:12px;color:var(--success);font-weight:600;margin-bottom:8px">✅ Resolution adopted.</div>
    ${okRow(idx, {optional:true})}
  </div>`;
}

function renderDocUploads(idx){
  function docItem(id, label, sub){
    return `<div class="doc-upload-item" id="${id}-wrap">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><div class="doc-upload-label">${label}</div><div class="doc-upload-sub">${sub}</div></div>
        <div class="doc-upload-done" style="flex-shrink:0;margin-left:10px">✅</div>
      </div>
      <input type="file" id="${id}-input" accept="image/*,.pdf" style="display:none" onchange="markDocUploaded('${id}',this)">
      <button class="doc-upload-btn" style="margin-top:10px" onclick="document.getElementById('${id}-input').click()">📎 Upload file</button>
    </div>`;
  }
  return `<div class="slide-inner" style="max-width:640px">
    <div style="margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid var(--line)">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--orange);margin-bottom:6px">Documents · 2 of 3</div>
      <h2 style="font-family:'DM Serif Display',serif;font-size:clamp(20px,4vw,28px);color:var(--dark);line-height:1.2;margin-bottom:6px">Upload ID &amp; CAC documents</h2>
      <p style="font-size:13px;color:var(--muted)">These three documents are required to verify your identity and business registration.</p>
    </div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--orange);margin:0 0 8px">Valid ID — Signatory 1</div>
    ${docItem('doc-id','Government-issued ID','NIN slip, Driver\'s Licence, International Passport or Voter\'s Card')}
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--orange);margin:16px 0 8px">CAC Certificate</div>
    ${docItem('doc-cac','Certificate of Registration','Issued by the Corporate Affairs Commission (CAC)')}
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--orange);margin:16px 0 8px">Form 2 — Particulars of Directors</div>
    ${docItem('doc-form2','CAC Form BN 1 / Form 2','Particulars of directors or business name status report from CAC')}
    ${okRow(idx, {optional:true})}
  </div>`;
}

function renderDocRefs(idx){
  function refBlock(n){
    return `<div style="border:1.5px solid var(--line);border-radius:12px;padding:16px;margin-bottom:12px;background:#fff" id="ref${n}-card">
      <div style="font-size:12px;font-weight:700;color:var(--orange);margin-bottom:12px">Referee ${n}</div>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <button class="doc-upload-btn" id="ref${n}-upload-btn" style="flex:1;justify-content:center" onclick="toggleRefMode(${n},'upload')">📎 Upload filled form</button>
        <button class="doc-upload-btn" id="ref${n}-link-btn" style="flex:1;justify-content:center" onclick="toggleRefMode(${n},'link')">📨 Send a link</button>
      </div>
      <div id="ref${n}-upload-wrap" style="display:none">
        <input type="file" id="ref${n}-file-input" accept="image/*,.pdf" style="display:none" onchange="markRefUploaded(${n},this)">
        <button class="doc-upload-btn" onclick="document.getElementById('ref${n}-file-input').click()">📎 Choose referee form</button>
        <div id="ref${n}-upload-done" style="display:none;font-size:12px;color:var(--success);font-weight:600;margin-top:8px">✅ Referee form uploaded</div>
      </div>
      <div id="ref${n}-link-wrap" style="display:none">
        <div class="group-fields" style="margin-bottom:12px">
          <div class="group-field"><label>Referee's full name *</label><input class="tally-input" type="text" id="ref${n}Name" placeholder="Full name" oninput="FD['ref${n}Name']=this.value;autoSave()"></div>
          <div class="group-field"><label>Email address *</label><input class="tally-input" type="email" id="ref${n}Email" placeholder="referee@email.com" oninput="FD['ref${n}Email']=this.value;autoSave()"></div>
        </div>
        <button class="ok-btn" style="font-size:12px;padding:8px 16px" onclick="generateRefLink(${n})">📨 Generate &amp; copy link</button>
        <div id="ref${n}-link-sent" style="display:none;margin-top:10px;font-size:12px;color:var(--success);font-weight:600">✅ Link copied! Send via WhatsApp or email.</div>
      </div>
    </div>`;
  }
  return `<div class="slide-inner" style="max-width:640px">
    <div style="margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid var(--line)">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--orange);margin-bottom:6px">Documents · 3 of 3</div>
      <h2 style="font-family:'DM Serif Display',serif;font-size:clamp(20px,4vw,28px);color:var(--dark);line-height:1.2;margin-bottom:6px">References</h2>
      <p style="font-size:13px;color:var(--muted)">GTBank requires two referees. Upload a completed referee form, or send the link to your referees to fill online.</p>
    </div>
    <div style="padding:10px 14px;background:#F8F6F4;border-radius:10px;font-size:12px;color:var(--ink);line-height:1.8;margin-bottom:16px">
      Accepted combinations:<br>
      ✔ Two personal GTBank current / domiciliary account holders<br>
      ✔ One GTBank holder + one other bank business account holder<br>
      ✔ Two other bank business account holders
    </div>
    ${refBlock(1)}
    ${refBlock(2)}
    ${okRow(idx, {optional:true})}
  </div>`;
}

function renderDocuments(idx){
  const letterHTML = _boardResLetterHTML();
  function docItem(id, label, sub){
    return `<div class="doc-upload-item" id="${id}-wrap">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><div class="doc-upload-label">${label}</div><div class="doc-upload-sub">${sub}</div></div>
        <div class="doc-upload-done" style="flex-shrink:0;margin-left:10px">✅</div>
      </div>
      <input type="file" id="${id}-input" accept="image/*,.pdf" style="display:none" onchange="markDocUploaded('${id}',this)">
      <button class="doc-upload-btn" style="margin-top:10px" onclick="document.getElementById('${id}-input').click()">📎 Upload file</button>
    </div>`;
  }
  function refBlock(n){
    return `<div style="border:1.5px solid var(--line);border-radius:12px;padding:16px;margin-bottom:12px;background:#fff" id="ref${n}-card">
      <div style="font-size:12px;font-weight:700;color:var(--orange);margin-bottom:12px">Referee ${n}</div>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <button class="doc-upload-btn" id="ref${n}-upload-btn" style="flex:1;justify-content:center" onclick="toggleRefMode(${n},'upload')">📎 Upload filled form</button>
        <button class="doc-upload-btn" id="ref${n}-link-btn" style="flex:1;justify-content:center" onclick="toggleRefMode(${n},'link')">📨 Send a link</button>
      </div>
      <div id="ref${n}-upload-wrap" style="display:none">
        <input type="file" id="ref${n}-file-input" accept="image/*,.pdf" style="display:none" onchange="markRefUploaded(${n},this)">
        <button class="doc-upload-btn" onclick="document.getElementById('ref${n}-file-input').click()">📎 Choose referee form</button>
        <div id="ref${n}-upload-done" style="display:none;font-size:12px;color:var(--success);font-weight:600;margin-top:8px">✅ Referee form uploaded</div>
      </div>
      <div id="ref${n}-link-wrap" style="display:none">
        <div class="group-fields" style="margin-bottom:12px">
          <div class="group-field"><label>Referee's full name *</label><input class="tally-input" type="text" id="ref${n}Name" placeholder="Full name" oninput="FD['ref${n}Name']=this.value;autoSave()"></div>
          <div class="group-field"><label>Email address *</label><input class="tally-input" type="email" id="ref${n}Email" placeholder="referee@email.com" oninput="FD['ref${n}Email']=this.value;autoSave()"></div>
        </div>
        <button class="ok-btn" style="font-size:12px;padding:8px 16px" onclick="generateRefLink(${n})">📨 Generate &amp; copy link</button>
        <div id="ref${n}-link-sent" style="display:none;margin-top:10px;font-size:12px;color:var(--success);font-weight:600">✅ Link copied! Send via WhatsApp or email.</div>
      </div>
    </div>`;
  }
  return `<div class="slide-inner" style="max-width:640px">
    <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid var(--line)">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--orange);margin-bottom:6px">Supporting Documents</div>
      <h2 style="font-family:'DM Serif Display',serif;font-size:clamp(22px,4vw,32px);color:var(--dark);line-height:1.2;margin-bottom:6px">Attach your documents</h2>
      <p style="font-size:13px;color:var(--muted)">Upload all items below before submitting.</p>
    </div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--orange);margin-bottom:8px">1 · Board Resolution</div>
    <div class="resolution-box" style="margin-bottom:4px">
      <div class="resolution-head">
        <span class="resolution-head-title">📄 Pre-filled board resolution</span>
        <span style="font-size:11px;color:var(--muted)">Your details &amp; signature included</span>
      </div>
      <div class="resolution-preview" id="resolution-preview" style="max-height:300px;background:#fff;padding:20px 22px;font-family:'DM Sans',sans-serif">${letterHTML}</div>
      <div class="resolution-actions">
        <button class="res-btn primary" onclick="adoptResolution()">Adopt this resolution</button>
        <button class="res-btn" onclick="downloadResolution()">⬇️ Download to edit (.doc)</button>
      </div>
    </div>
    <div id="resolution-adopted" style="display:none;padding:10px 14px;background:var(--success-bg);border-radius:8px;font-size:12px;color:var(--success);font-weight:600;margin-bottom:4px">✅ Resolution adopted.</div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--orange);margin:20px 0 8px">2 · Valid ID (Signatory 1)</div>
    ${docItem('doc-id','Government-issued ID','NIN slip, Driver\'s Licence, International Passport or Voter\'s Card')}
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--orange);margin:20px 0 8px">3 · CAC Certificate</div>
    ${docItem('doc-cac','Certificate of Registration','Issued by the Corporate Affairs Commission (CAC)')}
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--orange);margin:20px 0 8px">4 · Form 2 — Particulars of Directors</div>
    ${docItem('doc-form2','CAC Form BN 1 / Form 2','Particulars of directors or business name status report from CAC')}
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--orange);margin:20px 0 8px">5 · References</div>
    <div style="padding:10px 14px;background:#F8F6F4;border-radius:10px;font-size:12px;color:var(--ink);line-height:1.8;margin-bottom:14px">
      ✔ Two personal GTBank current / domiciliary account holders<br>
      ✔ One GTBank holder + one other bank business account holder<br>
      ✔ Two other bank business account holders
    </div>
    ${refBlock(1)}
    ${refBlock(2)}
    ${okRow(idx, {optional:true})}
  </div>`;
}

function renderProcessingPage(){
  const r = 47; const circ = 2 * Math.PI * r;
  return `<div class="slide-inner proc-wrap" style="max-width:480px">
    <div class="proc-ring-wrap">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle class="proc-ring-bg" cx="55" cy="55" r="${r}"/>
        <circle class="proc-ring-fg" id="proc-ring" cx="55" cy="55" r="${r}" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="0"/>
      </svg>
      <div class="proc-countdown-num" id="proc-num">10</div>
    </div>
    <h2 class="slide-q" style="margin-bottom:6px">Generating your<br>application…</h2>
    <p class="slide-sub" style="margin-bottom:0">Compiling details, building your PDF, packaging everything up.</p>
    <div class="proc-steps" id="proc-steps">
      <div class="proc-step" id="ps1"><span class="proc-step-dot"></span>Compiling your details</div>
      <div class="proc-step" id="ps2"><span class="proc-step-dot"></span>Generating PDF document</div>
      <div class="proc-step" id="ps3"><span class="proc-step-dot"></span>Embedding signature &amp; data</div>
      <div class="proc-step" id="ps4"><span class="proc-step-dot"></span>Merging supporting documents</div>
      <div class="proc-step" id="ps5"><span class="proc-step-dot"></span>Wrapping up &amp; finalising</div>
    </div>
  </div>`;
}

function renderReview(){
  if(S2_ROLE){
    return `<div class="slide-inner" style="max-width:660px">
      <span class="slide-emoji">🔍</span>
      <h2 class="slide-q">Review your details</h2>
      <p class="slide-sub">Check your information before submitting. The account officer will be notified when you submit.</p>
      <div id="review-content" style="margin-bottom:24px"></div>
      <p class="privacy-note" style="margin-bottom:18px">🔒 Your data is sent securely. Only the account officer can access it.</p>
      <button id="s2-submit-btn" class="ok-btn" style="font-size:16px;padding:15px 30px" onclick="submitS2Data()">✅ Submit my details</button>
    </div>`;
  }
  return `<div class="slide-inner" style="max-width:660px">
    <span class="slide-emoji">🔍</span>
    <h2 class="slide-q">Review your details</h2>
    <p class="slide-sub">Check everything. Click any section to edit before generating your form.</p>
    <div id="review-content" style="margin-bottom:24px"></div>
    <p class="privacy-note" style="margin-bottom:18px">🔒 Your data stays on your device.</p>
    <button class="ok-btn" style="font-size:16px;padding:15px 30px" onclick="goNext()">🚀 Generate my form</button>
  </div>`;
}

// ── DOCUMENT HELPERS ─────────────────────────────────────────────────────────
function toggleRefMode(n, mode){
  const uploadWrap = document.getElementById('ref'+n+'-upload-wrap');
  const linkWrap   = document.getElementById('ref'+n+'-link-wrap');
  const uploadBtn  = document.getElementById('ref'+n+'-upload-btn');
  const linkBtn    = document.getElementById('ref'+n+'-link-btn');
  if(mode === 'upload'){
    if(uploadWrap) uploadWrap.style.display = 'block';
    if(linkWrap)   linkWrap.style.display   = 'none';
    if(uploadBtn)  uploadBtn.style.cssText += 'border-color:var(--orange);color:var(--orange)';
    if(linkBtn)    linkBtn.style.cssText    = 'flex:1;justify-content:center';
  } else {
    if(linkWrap)   linkWrap.style.display   = 'block';
    if(uploadWrap) uploadWrap.style.display = 'none';
    if(linkBtn)    linkBtn.style.cssText   += 'border-color:var(--orange);color:var(--orange)';
    if(uploadBtn)  uploadBtn.style.cssText  = 'flex:1;justify-content:center';
  }
  FD['ref'+n+'Mode'] = mode;
  autoSave();
}

function markRefUploaded(n, inputEl){
  if(!inputEl.files[0]) return;
  FD['ref'+n+'File'] = inputEl.files[0].name;
  const done = document.getElementById('ref'+n+'-upload-done');
  if(done) done.style.display = 'block';
  autoSave();
}

function generateRefLink(n){
  const name  = FD['ref'+n+'Name']  || '';
  const email = FD['ref'+n+'Email'] || '';
  if(!name || !email){ alert('Please enter the referee\'s name and email address first.'); return; }
  const refConfig = btoa(JSON.stringify({
    refFor: FD.bizName || '',
    refForDirector: [FD.s1Title, FD.s1FirstName, FD.s1Surname].filter(Boolean).join(' '),
    refName: name,
    refN: n,
    sessionId: CFG_SESSION || ''
  }));
  const base = window.location.href.replace(/[^/]*$/, '');
  const link = base + 'gtbank-referee.html?ref=' + refConfig;
  navigator.clipboard.writeText(link).then(() => {
    const el = document.getElementById('ref'+n+'-link-sent');
    if(el) el.style.display = 'block';
  }).catch(() => {
    prompt('Copy this link and send to the referee:', link);
  });
}

function markDocUploaded(docId, inputEl){
  if(!inputEl.files[0]) return;
  const wrap = document.getElementById(docId+'-wrap');
  if(wrap) wrap.classList.add('uploaded');
  FD['doc_'+docId] = inputEl.files[0].name;
  autoSave();
}

function adoptResolution(){
  FD['boardResolutionAdopted'] = 'Yes';
  FD['boardResolutionText']    = window._boardResolutionText || '';
  autoSave();
  const el = document.getElementById('resolution-adopted');
  if(el) el.style.display = 'block';
}

function downloadResolution(){
  const inner = window._boardResolutionHTML || '';
  const html  = `<html><head><style>body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.9;margin:72px 80px;color:#000}h4{margin-top:14px}ol{margin-left:20px}</style></head><body>${inner}</body></html>`;
  const blob  = new Blob([html], {type:'application/msword'});
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href = url;
  a.download = 'Board_Resolution_' + (FD.bizName || 'GTBank').replace(/\s+/g,'_') + '.doc';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── INTERACTION HANDLERS ──────────────────────────────────────────────────────
function pickChoice(field, val, btn, autoAdv, idx){
  FD[field] = val;
  btn.closest('.choices').querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  btn.querySelector('.choice-key').style.cssText = 'background:var(--orange);color:#fff;border-color:var(--orange)';
  clearErr(field);
  autoSave();
}

function _toggleInline(wrapId, show){
  const wrap = document.getElementById(wrapId);
  if(wrap){
    wrap.style.display = show ? 'flex' : 'none';
    if(show) wrap.classList.add('show'); else wrap.classList.remove('show');
  }
}

function pickNationality(val, btn, idx, px){
  px = px || 's1';
  try {
    const wasSelected = btn.classList.contains('selected');
    btn.parentNode.querySelectorAll('.choice-btn').forEach(b => {
      b.classList.remove('selected');
      const k = b.querySelector('.choice-key'); if(k) k.style.cssText = '';
    });
    if(wasSelected){
      FD[px+'Nationality'] = '';
      _toggleInline('other-country-wrap-'+px, false);
      autoSave(); return;
    }
    btn.classList.add('selected');
    const kEl = btn.querySelector('.choice-key'); if(kEl) kEl.style.cssText = 'background:var(--orange);color:#fff;border-color:var(--orange)';
    FD[px+'Nationality'] = val;
    if(val !== 'Other'){ FD[px+'NationalityCountry'] = ''; const nc = document.getElementById(px+'NationalityCountry'); if(nc) nc.value = ''; }
    clearErr(px+'Nationality');
    _toggleInline('other-country-wrap-'+px, val === 'Other');
    autoSave();
  } catch(e){ console.error('pickNationality error:', e); }
}

function pickOtherRes(val, btn, idx, px){
  px = px || 's1';
  try {
    const wasSelected = btn.classList.contains('selected');
    btn.parentNode.querySelectorAll('.choice-btn').forEach(b => {
      b.classList.remove('selected');
      const k = b.querySelector('.choice-key'); if(k) k.style.cssText = '';
    });
    if(wasSelected){
      FD[px+'OtherResidency'] = '';
      _toggleInline('other-res-wrap-'+px, false);
      autoSave(); return;
    }
    btn.classList.add('selected');
    const kEl = btn.querySelector('.choice-key'); if(kEl) kEl.style.cssText = 'background:var(--orange);color:#fff;border-color:var(--orange)';
    FD[px+'OtherResidency'] = val;
    _toggleInline('other-res-wrap-'+px, val === 'YES');
    autoSave();
    if(val === 'NO') setTimeout(() => tryAdvance(idx), 320);
  } catch(e){ console.error('pickOtherRes error:', e); }
}

function pickID(field, kidx, btn, idx, px){
  px = px || 's1';
  try {
    const key = ID_KEYS[kidx];
    const cfg = ID_CFG[key] || {fields:['number']};
    const wasSelected = btn.classList.contains('selected');
    btn.parentNode.querySelectorAll('.choice-btn').forEach(b => {
      b.classList.remove('selected');
      const k = b.querySelector('.choice-key'); if(k) k.style.cssText = '';
    });
    const numWrap  = document.getElementById('id-number-wrap-'+px);
    const dateWrap = document.getElementById('id-fields-wrap-'+px);
    if(wasSelected){
      FD[field] = '';
      if(numWrap)  numWrap.style.display = 'none';
      if(dateWrap){ dateWrap.style.display = 'none'; dateWrap.classList.remove('show'); }
      autoSave(); return;
    }
    btn.classList.add('selected');
    const kEl = btn.querySelector('.choice-key'); if(kEl) kEl.style.cssText = 'background:var(--orange);color:#fff;border-color:var(--orange)';
    FD[field] = key;
    clearErr(field);
    const needsDates = cfg.fields.includes('issue') || cfg.fields.includes('expiry');
    if(numWrap) numWrap.style.display = 'block';
    if(dateWrap){ dateWrap.style.display = needsDates ? 'flex' : 'none'; if(needsDates) dateWrap.classList.add('show'); else dateWrap.classList.remove('show'); }
    autoSave();
    setTimeout(() => { const inp = document.getElementById(px+'IDNumber'); if(inp) inp.focus(); }, 100);
  } catch(e){ console.error('pickID error:', e); }
}

function pickSalary(val, btn){
  FD['salaryPayments'] = val;
  document.querySelectorAll('#choices-salary .choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  btn.querySelector('.choice-key').style.cssText = 'background:var(--orange);color:#fff;border-color:var(--orange)';
  autoSave();
  const empWrap = document.getElementById('employees-wrap');
  const okBtn   = document.getElementById('salary-ok-btn');
  if(val === 'Yes'){
    if(empWrap) empWrap.style.display = 'block';
    if(okBtn)   okBtn.style.display   = 'inline-flex';
  } else {
    if(empWrap) empWrap.style.display = 'none';
    if(okBtn)   okBtn.style.display   = 'none';
    setTimeout(() => goNext(), 320);
  }
}

function toggleProductGroup(pid, idx, hasVariants){
  const group    = document.getElementById('acct-group-'+pid);
  const expandEl = document.getElementById('acct-variants-'+pid);
  const isSelected = group.classList.contains('selected');
  ACCT_PRODUCTS.forEach(p => {
    document.getElementById('acct-group-'+p.id)?.classList.remove('selected');
    document.getElementById('acct-variants-'+p.id)?.classList.remove('show');
  });
  if(!isSelected){
    group.classList.add('selected');
    if(expandEl) expandEl.classList.add('show');
    FD['bizAccountProduct']     = pid;
    FD['bizAccountProductName'] = ACCT_PRODUCTS.find(p => p.id === pid)?.name || pid;
    FD['bizAccountVariant']     = '';
    FD['bizAccountVariantName'] = '';
    autoSave();
    clearErr('acct-product');
  } else {
    FD['bizAccountProduct']  = '';
    FD['bizAccountVariant']  = '';
    autoSave();
  }
}

function pickProductVariant(pid, vid, vname, idx){
  FD['bizAccountProduct']     = pid;
  FD['bizAccountProductName'] = ACCT_PRODUCTS.find(p => p.id === pid)?.name || pid;
  FD['bizAccountVariant']     = vid;
  FD['bizAccountVariantName'] = vname;
  autoSave();
  clearErr('acct-product');
  const p = ACCT_PRODUCTS.find(x => x.id === pid);
  if(p && p.variants) p.variants.forEach(v => {
    const el = document.getElementById('acct-v-'+pid+'-'+v.id);
    if(el) el.classList.toggle('sel', v.id === vid);
  });
}

function toggleDomi(cid){
  if(!MULTI['domiCurrencies']) MULTI['domiCurrencies'] = new Set();
  const s = MULTI['domiCurrencies'];
  if(s.has(cid)) s.delete(cid); else s.add(cid);
  FD['domiCurrencies'] = Array.from(s).join(', ');
  DOMI_CURRENCIES.forEach(c => {
    const chip  = document.getElementById('domi-'+c.id);
    const check = document.getElementById('domi-check-'+c.id);
    const sel   = s.has(c.id);
    chip?.classList.toggle('selected', sel);
    if(check) check.style.cssText = sel ? 'background:var(--orange);border-color:var(--orange);color:#fff' : '';
  });
  autoSave();
}

function toggleSameAsBusiness(label, spfx){
  spfx = spfx || 's1';
  const check = document.getElementById('same-biz-check-'+spfx);
  check.checked = !check.checked;
  label.classList.toggle('active', check.checked);
  const wrap = document.getElementById('res-fields-wrap-'+spfx);
  if(check.checked){
    FD[spfx+'ResHousePlot'] = FD['bizHousePlot'] || '';
    FD[spfx+'ResStreet']    = FD['bizAddr1']     || '';
    FD[spfx+'ResBusStop']   = FD['bizBusStop']   || '';
    FD[spfx+'ResCity']      = FD['bizCity']       || '';
    FD[spfx+'ResLGA']       = FD['bizLGA']        || '';
    FD[spfx+'ResState']     = FD['bizState']      || '';
    FD[spfx+'SameAsBusiness'] = 'Yes';
    if(wrap) wrap.style.opacity = '.4';
    [spfx+'ResHousePlot',spfx+'ResStreet',spfx+'ResBusStop',spfx+'ResCity',spfx+'ResLGA'].forEach(k => {
      const el = document.getElementById(k); if(el) el.value = FD[k] || '';
    });
    const st = document.getElementById(spfx+'ResState'); if(st) st.value = FD['bizState'] || '';
    autoSave();
  } else {
    FD[spfx+'SameAsBusiness'] = '';
    if(wrap) wrap.style.opacity = '1';
    autoSave();
  }
}

function toggleSCUML(){
  const v    = document.getElementById('bizDNFIType').value;
  const wrap = document.getElementById('scuml-input-wrap');
  if(wrap) wrap.style.display = v ? 'block' : 'none';
}

function addSigHere(){
  FD._hasS2 = true;
  autoSave();
  const idx = SLIDES.findIndex(s => s.s2slide);
  if(idx > 0) goToSlide(idx, cur);
}

function sendSigLink(){
  const s = document.getElementById('send-sig-wrap');
  if(s) s.style.display = 'block';
}

function onBVNInput(field, idx){
  const inp = document.getElementById(field);
  const val = inp.value.replace(/\D/g,'');
  inp.value = val;
  FD[field]  = val;
  const ok   = document.getElementById(field+'-ok');
  if(ok) ok.classList.toggle('show', val.length === 11);
  if(val.length === 11) clearErr(field);
  autoSave();
}

function giveConsent(key, val, idx, required){
  CONSENTS[key] = val;
  FD['consent_'+key] = val;
  document.getElementById('c-yes-'+key)?.classList.toggle('active', val === 'accepted');
  document.getElementById('c-no-'+key)?.classList.toggle('active',  val === 'declined');
  const warn = document.getElementById('consent-warn-'+key);
  if(required && val === 'declined'){ if(warn) warn.classList.add('show'); return; }
  if(warn) warn.classList.remove('show');
  autoSave();
  if(!required || val === 'accepted') setTimeout(() => goNext(), 320);
}

function onTermsCheck(idx){
  const chk = document.getElementById('terms-check');
  const box = document.getElementById('terms-consent-box');
  const err = document.getElementById('terms-err');
  if(box) box.classList.toggle('accepted', chk.checked);
  if(err && chk.checked) err.classList.remove('show');
  CONSENTS.terms   = chk.checked ? 'accepted' : '';
  FD.consent_terms = CONSENTS.terms;
  autoSave();
}

function onMarketingCheck(){
  const chk = document.getElementById('marketing-check');
  const box = document.getElementById('marketing-consent-box');
  if(box) box.classList.toggle('accepted', chk.checked);
  CONSENTS.marketing   = chk.checked ? 'accepted' : 'declined';
  FD.consent_marketing = CONSENTS.marketing;
  autoSave();
}

function tryTermsAdvance(idx){
  const chk = document.getElementById('terms-check');
  if(!chk || !chk.checked){
    const err = document.getElementById('terms-err');
    if(err) err.classList.add('show');
    return;
  }
  goNext();
}

// ── SIGNATURE CAPTURE ─────────────────────────────────────────────────────────
function openSignatureCapture(idx, mode){
  const inp = document.getElementById('sig-input-'+idx);
  if(!inp) return;
  if(mode === 'file') inp.removeAttribute('capture');
  else inp.setAttribute('capture','environment');
  inp.click();
}

function autoDetectInkRegion(img, w, h){
  const THUMB = 150;
  const tw = THUMB, th = Math.round(h * THUMB / w);
  const tc = document.createElement('canvas');
  tc.width = tw; tc.height = th;
  const tctx = tc.getContext('2d');
  tctx.drawImage(img, 0, 0, tw, th);
  const id = tctx.getImageData(0, 0, tw, th);
  const px = id.data;
  const brightness = new Uint8Array(tw * th);
  for(let i = 0; i < tw * th; i++)
    brightness[i] = Math.round(px[i*4]*0.299 + px[i*4+1]*0.587 + px[i*4+2]*0.114);
  const sample = Array.from(brightness).sort((a,b) => a-b);
  const median = sample[Math.floor(sample.length * 0.7)];
  const inkThresh = Math.max(30, median * 0.72);
  let minX = tw, maxX = 0, minY = th, maxY = 0, found = false;
  for(let y = 0; y < th; y++){
    for(let x = 0; x < tw; x++){
      if(brightness[y*tw+x] < inkThresh){
        if(x < minX) minX = x; if(x > maxX) maxX = x;
        if(y < minY) minY = y; if(y > maxY) maxY = y;
        found = true;
      }
    }
  }
  if(!found) return {x:Math.round(w*0.05), y:Math.round(h*0.1), w:Math.round(w*0.9), h:Math.round(h*0.8)};
  const scaleX = w/tw, scaleY = h/th;
  const padX = Math.round(w*0.08), padY = Math.round(h*0.08);
  let rx  = Math.max(0, Math.round(minX*scaleX) - padX);
  let ry  = Math.max(0, Math.round(minY*scaleY) - padY);
  let rx2 = Math.min(w, Math.round(maxX*scaleX) + padX);
  let ry2 = Math.min(h, Math.round(maxY*scaleY) + padY);
  if(rx2-rx < 40){ rx = Math.max(0,rx-20); rx2 = Math.min(w,rx2+20); }
  if(ry2-ry < 20){ ry = Math.max(0,ry-10); ry2 = Math.min(h,ry2+10); }
  return {x:rx, y:ry, w:rx2-rx, h:ry2-ry};
}

function processSignatureFile(idx, inputEl){
  const file = inputEl.files[0];
  if(!file) return;
  const cropWrap = document.getElementById('sig-crop-'+idx);
  const captBtns = document.getElementById('sig-capture-btns-'+idx);
  const preview  = document.getElementById('sig-preview-'+idx);
  const badge    = document.getElementById('sig-ok-badge-'+idx);
  if(captBtns) captBtns.style.display = 'none';
  if(preview)  preview.classList.remove('show');
  if(badge)    badge.classList.remove('show');
  const reader = new FileReader();
  reader.onload = function(e){
    const img = new Image();
    img.onload = function(){
      const MAX = 1200;
      let w = img.width, h = img.height;
      if(w > MAX){ h = Math.round(h*MAX/w); w = MAX; }
      if(h > MAX){ w = Math.round(w*MAX/h); h = MAX; }
      window['_sigOrigImg_'+idx] = {img, w, h};
      const cc = document.getElementById('sig-crop-canvas-'+idx);
      cc.width = w; cc.height = h;
      cc.getContext('2d').drawImage(img, 0, 0, w, h);
      const detected = autoDetectInkRegion(img, w, h);
      window['_sigCrop_'+idx] = detected;
      updateCropBox(idx);
      setupCropDrag(idx);
      if(cropWrap) cropWrap.classList.add('show');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function updateCropBox(idx){
  const cc  = document.getElementById('sig-crop-canvas-'+idx);
  const box = document.getElementById('sig-crop-box-'+idx);
  if(!cc || !box) return;
  const crop = window['_sigCrop_'+idx];
  if(!crop) return;
  const scaleX = cc.offsetWidth  / cc.width;
  const scaleY = cc.offsetHeight / cc.height;
  box.style.display = 'block';
  box.style.left    = Math.round(crop.x * scaleX) + 'px';
  box.style.top     = Math.round(crop.y * scaleY) + 'px';
  box.style.width   = Math.round(crop.w * scaleX) + 'px';
  box.style.height  = Math.round(crop.h * scaleY) + 'px';
}

function setupCropDrag(idx){
  const stage = document.getElementById('sig-crop-stage-'+idx);
  const cc    = document.getElementById('sig-crop-canvas-'+idx);
  if(!stage || !cc) return;
  function getPos(e){
    const rect   = cc.getBoundingClientRect();
    const scaleX = cc.width / cc.offsetWidth;
    const scaleY = cc.height / cc.offsetHeight;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {x:(clientX-rect.left)*scaleX, y:(clientY-rect.top)*scaleY};
  }
  let startPos = null;
  function onDown(e){
    e.preventDefault();
    const pos = getPos(e);
    startPos = {x:pos.x, y:pos.y};
    window['_sigCrop_'+idx] = {x:pos.x, y:pos.y, w:1, h:1};
    updateCropBox(idx);
  }
  function onMove(e){
    e.preventDefault();
    if(!startPos) return;
    const pos  = getPos(e);
    const orig = window['_sigOrigImg_'+idx];
    const x = Math.min(startPos.x, pos.x);
    const y = Math.min(startPos.y, pos.y);
    const w = Math.max(10, Math.abs(pos.x - startPos.x));
    const h = Math.max(10, Math.abs(pos.y - startPos.y));
    window['_sigCrop_'+idx] = {x:Math.max(0,x), y:Math.max(0,y), w:Math.min(w,orig.w-x), h:Math.min(h,orig.h-y)};
    updateCropBox(idx);
  }
  function onUp(){ startPos = null; }
  stage.addEventListener('mousedown',  onDown);
  stage.addEventListener('mousemove',  onMove);
  stage.addEventListener('mouseup',    onUp);
  stage.addEventListener('touchstart', onDown, {passive:false});
  stage.addEventListener('touchmove',  onMove, {passive:false});
  stage.addEventListener('touchend',   onUp);
}

function confirmCrop(idx){
  const crop = window['_sigCrop_'+idx];
  const orig = window['_sigOrigImg_'+idx];
  if(!crop || !orig) return;
  const cropWrap = document.getElementById('sig-crop-'+idx);
  const proc     = document.getElementById('sig-proc-'+idx);
  if(cropWrap) cropWrap.classList.remove('show');
  if(proc)     proc.classList.add('show');
  requestAnimationFrame(() => setTimeout(() => cleanAndShowSignature(idx, orig.img, crop), 30));
}

function cleanAndShowSignature(idx, img, crop){
  const proc        = document.getElementById('sig-proc-'+idx);
  const preview     = document.getElementById('sig-preview-'+idx);
  const confirmBtns = document.getElementById('sig-confirm-btns-'+idx);
  const bc          = document.getElementById('sig-before-'+idx);
  const ac          = document.getElementById('sig-after-'+idx);
  const cw = Math.max(4, Math.min(crop.w, img.width  - crop.x));
  const ch = Math.max(4, Math.min(crop.h, img.height - crop.y));
  if(bc){ bc.width = cw; bc.height = ch; bc.getContext('2d').drawImage(img, crop.x, crop.y, cw, ch, 0, 0, cw, ch); }
  if(ac){
    ac.width = cw; ac.height = ch;
    const ctx = ac.getContext('2d');
    ctx.drawImage(img, crop.x, crop.y, cw, ch, 0, 0, cw, ch);
    const id = ctx.getImageData(0, 0, cw, ch);
    const px = id.data;
    const N  = cw * ch;
    const gray = new Float32Array(N);
    for(let i = 0; i < N; i++) gray[i] = px[i*4]*0.299 + px[i*4+1]*0.587 + px[i*4+2]*0.114;
    const W1 = cw + 1;
    const S  = new Float64Array((cw+1)*(ch+1));
    const S2 = new Float64Array((cw+1)*(ch+1));
    for(let y = 1; y <= ch; y++){
      for(let x = 1; x <= cw; x++){
        const v = gray[(y-1)*cw+(x-1)];
        S [y*W1+x] = v   + S [(y-1)*W1+x] + S [y*W1+(x-1)] - S [(y-1)*W1+(x-1)];
        S2[y*W1+x] = v*v + S2[(y-1)*W1+x] + S2[y*W1+(x-1)] - S2[(y-1)*W1+(x-1)];
      }
    }
    const WS = Math.max(20, Math.round(Math.min(cw,ch)*0.12));
    const k = 0.34, R = 128;
    for(let y = 0; y < ch; y++){
      for(let x = 0; x < cw; x++){
        const x1 = Math.min(x+WS,cw), y1 = Math.min(y+WS,ch);
        const x0 = Math.max(x-WS,0),  y0 = Math.max(y-WS,0);
        const area  = (x1-x0)*(y1-y0);
        const sum   = S [y1*W1+x1]-S [y0*W1+x1]-S [y1*W1+x0]+S [y0*W1+x0];
        const sum2  = S2[y1*W1+x1]-S2[y0*W1+x1]-S2[y1*W1+x0]+S2[y0*W1+x0];
        const mean  = sum / area;
        const std   = Math.sqrt(Math.max(0, sum2/area - mean*mean));
        const thresh = mean * (1 + k*(std/R - 1));
        const isInk  = gray[y*cw+x] < thresh;
        const i = y*cw+x;
        px[i*4]=0; px[i*4+1]=0; px[i*4+2]=0; px[i*4+3] = isInk ? 220 : 0;
      }
    }
    ctx.putImageData(id, 0, 0);
    let minX = cw, maxX = 0, minY = ch, maxY = 0;
    for(let y2 = 0; y2 < ch; y2++)
      for(let x2 = 0; x2 < cw; x2++)
        if(px[(y2*cw+x2)*4+3] > 10){
          if(x2<minX) minX=x2; if(x2>maxX) maxX=x2;
          if(y2<minY) minY=y2; if(y2>maxY) maxY=y2;
        }
    const PAD = 4;
    minX = Math.max(0,minX-PAD); minY = Math.max(0,minY-PAD);
    maxX = Math.min(cw-1,maxX+PAD); maxY = Math.min(ch-1,maxY+PAD);
    const tw2 = maxX-minX+1, th2 = maxY-minY+1;
    const tc2 = document.createElement('canvas');
    tc2.width = tw2; tc2.height = th2;
    tc2.getContext('2d').drawImage(ac, minX, minY, tw2, th2, 0, 0, tw2, th2);
    ac.width = tw2; ac.height = th2;
    ac.getContext('2d').drawImage(tc2, 0, 0);
    window['_sigPending_'+idx] = tc2.toDataURL('image/png');
  }
  if(proc)     proc.classList.remove('show');
  if(preview)  preview.classList.add('show');
  if(confirmBtns){ confirmBtns.style.display = 'flex'; confirmBtns.style.flexDirection = 'column'; }
}

function acceptSignature(idx){
  const sigData = window['_sigPending_'+idx];
  if(!sigData) return;
  const s   = SLIDES[idx];
  FD[s.id]  = sigData;
  if(s.id === 's1Signature'){ _sigImg = new Image(); _sigImg.onload = () => { if(_previewOpen) drawPreviewOverlay(); }; _sigImg.src = sigData; _sigImgSrc = sigData; }
  if(s.id === 's2Signature'){ _sigImg2 = new Image(); _sigImg2.onload = () => { if(_previewOpen) drawPreviewOverlay(); }; _sigImg2.src = sigData; }
  autoSave();
  const confirmBtns = document.getElementById('sig-confirm-btns-'+idx);
  const captBtns    = document.getElementById('sig-capture-btns-'+idx);
  const badge       = document.getElementById('sig-ok-badge-'+idx);
  const cont        = document.getElementById('sig-continue-'+idx);
  if(confirmBtns) confirmBtns.style.display = 'none';
  if(captBtns)    captBtns.style.display    = 'none';
  if(badge)       badge.classList.add('show');
  if(cont)        cont.style.display        = 'inline-flex';
  clearErr(s.id);
}

function retakeSignature(idx){
  try {
    const s = SLIDES[idx];
    if(s){
      delete FD[s.id];
      try{ const sigs = JSON.parse(localStorage.getItem('gtb_sigs')||'{}'); delete sigs[s.id]; localStorage.setItem('gtb_sigs', JSON.stringify(sigs)); }catch(e){}
      try{ autoSave(); }catch(e){}
    }
    const preview  = document.getElementById('sig-preview-'+idx);
    const badge    = document.getElementById('sig-ok-badge-'+idx);
    const cont     = document.getElementById('sig-continue-'+idx);
    const captBtns = document.getElementById('sig-capture-btns-'+idx);
    const cropWrap = document.getElementById('sig-crop-'+idx);
    const proc     = document.getElementById('sig-proc-'+idx);
    const inp      = document.getElementById('sig-input-'+idx);
    if(preview)  preview.classList.remove('show');
    if(badge)    badge.classList.remove('show');
    if(cont)     cont.style.display = 'none';
    if(cropWrap) cropWrap.classList.remove('show');
    if(proc)     proc.classList.remove('show');
    if(captBtns) captBtns.style.display = 'flex';
    if(inp)      inp.value = '';
  } catch(e){ console.error('retakeSignature error:', e); }
}

function renderDone(){
  function docLine(icon, label, status, ready){
    return `<div class="doc-final-item ${ready ? 'ready' : 'pending'}">
      <span class="doc-final-icon">${icon}</span>
      <span class="doc-final-label">${label}</span>
      <span class="doc-final-status">${status}</span>
    </div>`;
  }
  const hasBoardRes = FD.boardResolutionAdopted === 'Yes';
  const hasID       = !!FD['doc_doc-id'];
  const hasCAC      = !!FD['doc_doc-cac'];
  const hasForm2    = !!FD['doc_doc-form2'];
  const hasRef1     = !!(FD.ref1Name || FD['ref1File']);
  const hasRef2     = !!(FD.ref2Name || FD['ref2File']);
  const biz         = FD.bizName || 'your business';
  return `<div class="slide-inner done-wrap" style="max-width:500px;margin:auto">
    <div class="done-burst">🎉</div>
    <div class="done-title">Application complete!</div>
    <div class="done-sub" id="done-sub">Your GTBank account opening form for <strong>${biz}</strong> has been generated and downloaded.</div>
    <div class="doc-final-list">
      ${docLine('📄','GTBank Application Form (PDF)','Downloaded ✓',true)}
      ${docLine('📋','Board Resolution', hasBoardRes ? 'Adopted ✓' : 'Not adopted', hasBoardRes)}
      ${docLine('🪪','Valid ID (Signatory 1)', hasID ? 'Uploaded ✓' : 'Not uploaded', hasID)}
      ${docLine('🏢','CAC Certificate', hasCAC ? 'Uploaded ✓' : 'Not uploaded', hasCAC)}
      ${docLine('📄','Form 2 / BN 1', hasForm2 ? 'Uploaded ✓' : 'Not uploaded', hasForm2)}
      ${docLine('🤝','Referee 1', hasRef1 ? 'Ready ✓' : 'Pending', hasRef1)}
      ${docLine('🤝','Referee 2', hasRef2 ? 'Ready ✓' : 'Pending', hasRef2)}
    </div>
    <div class="done-actions">
      <a href="#" id="wa-btn" class="btn-wa" target="_blank" rel="noopener">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
        Send via WhatsApp
      </a>
      <a href="#" id="email-btn" class="btn-email">📧 Send by email</a>
    </div>
    <p class="privacy-note">🔒 No data stored on any server.</p>
  </div>`;
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
function goToSlide(to, from){
  document.querySelectorAll('.slide').forEach((el, i) => {
    if(i === to)       el.className = 'slide pos-active';
    else if(i < to)    el.className = 'slide pos-above';
    else               el.className = 'slide pos-below';
  });
  cur = to;
  updateChrome();
  setTimeout(() => { autoFocus(to); restoreSlideValues(to); }, 460);
  if(_previewOpen){
    const suggested = SLIDE_PAGE_MAP[to];
    if(suggested && suggested !== _previewPage) renderPreviewPage(suggested);
    else if(_previewOpen) drawPreviewOverlay();
  }
  if(SLIDES[to].type === 'review')      buildReview();
  if(SLIDES[to].type === 'checklist'){
    const el = document.getElementById('slide-'+to);
    if(el){ el.innerHTML = renderChecklist(); el.className = 'slide pos-active'; setTimeout(() => el.scrollTop = 0, 50); }
  }
  if(SLIDES[to].type === 'documents'){
    const el = document.getElementById('slide-'+to);
    if(el){ el.innerHTML = renderDocuments(to); el.className = 'slide pos-active'; setTimeout(() => el.scrollTop = 0, 50); }
  }
  if(SLIDES[to].type === 'doc-board-res'){
    const el = document.getElementById('slide-'+to);
    if(el){ el.innerHTML = renderDocBoardRes(to); el.className = 'slide pos-active'; setTimeout(() => el.scrollTop = 0, 50); }
  }
  if(SLIDES[to].type === 'doc-uploads'){
    const el = document.getElementById('slide-'+to);
    if(el){ el.innerHTML = renderDocUploads(to); el.className = 'slide pos-active'; setTimeout(() => el.scrollTop = 0, 50); }
  }
  if(SLIDES[to].type === 'doc-references'){
    const el = document.getElementById('slide-'+to);
    if(el){ el.innerHTML = renderDocRefs(to); el.className = 'slide pos-active'; setTimeout(() => el.scrollTop = 0, 50); }
  }
  if(SLIDES[to].type === 'references'){
    const el = document.getElementById('slide-'+to);
    if(el){ el.innerHTML = renderReferencesPage(to); el.className = 'slide pos-active'; setTimeout(() => el.scrollTop = 0, 50); }
  }
  if(SLIDES[to].type === 'processing'){
    const el = document.getElementById('slide-'+to);
    if(el){ el.innerHTML = renderProcessingPage(); el.className = 'slide pos-active'; }
    setTimeout(startProcessing, 400);
  }
  if(SLIDES[to].type === 'done'){
    const el = document.getElementById('slide-'+to);
    if(el){ el.innerHTML = renderDone(); el.className = 'slide pos-active'; setTimeout(() => el.scrollTop = 0, 50); }
    setTimeout(() => {
      const waEl = document.getElementById('wa-btn');   if(waEl  && window._doneWA)    waEl.href  = 'https://wa.me/?text=' + window._doneWA;
      const emEl = document.getElementById('email-btn'); if(emEl && window._doneEmail) emEl.href  = window._doneEmail;
    }, 100);
  }
}

function _shouldSkipSlide(n){
  const s = SLIDES[n];
  if(S2_ROLE){
    if(!s.s2slide && !['review','processing','done'].includes(s.type)) return true;
  }
  return s.skip && s.skip();
}

function goNext(){
  let n = cur + 1;
  while(n < SLIDES.length - 1 && _shouldSkipSlide(n)) n++;
  if(n < SLIDES.length) goToSlide(n, cur);
}

function goBack(){
  let n = cur - 1;
  while(n > 0 && _shouldSkipSlide(n)) n--;
  if(n >= 0) goToSlide(n, cur);
}

function skipSlide(){ goNext(); }

function tryAdvance(idx){
  if(!validateSlide(SLIDES[idx], idx)) return;
  goNext();
}

function updateChrome(){
  const s       = SLIDES[cur];
  const isWelcome = s.type === 'welcome', isDone = s.type === 'done';
  document.getElementById('back-btn').style.display = (cur > 0 && !isDone) ? 'flex' : 'none';
  const cnt  = document.getElementById('counter');
  const pill = document.getElementById('section-pill');
  if(isWelcome || isDone || s.type === 'review'){
    cnt.style.display  = 'none';
    pill.style.display = 'none';
  } else if(s.type === 'section'){
    cnt.style.display  = 'none';
    pill.style.display = 'none';
  } else {
    const q = SLIDES.slice(0, cur+1).filter(x => !['welcome','section','review','done'].includes(x.type)).length;
    cnt.textContent    = q + ' / ' + TOTAL_Q;
    cnt.style.display  = 'block';
    if(s.sec){ pill.textContent = s.sec; pill.style.display = 'block'; }
    else pill.style.display = 'none';
  }
  const pct = (cur / (SLIDES.length - 1)) * 100;
  document.getElementById('prog-fill').style.width = pct + '%';
}

function autoFocus(idx){
  const el = document.querySelector('#slide-'+idx+' .tally-input:not([type="date"]), #slide-'+idx+' .tally-select');
  if(el) el.focus();
}

// ── VALIDATION ────────────────────────────────────────────────────────────────
function validateSlide(s, idx){
  if(!s) return true;
  if(s.type === 'references'){
    if(!(FD.ref1Name||'').trim() || !(FD.ref2Name||'').trim()){
      const e = document.getElementById('err-refs'); if(e) e.classList.add('show'); return false;
    }
    return true;
  }
  if(s.type === 'account-product'){
    if(!(FD['bizAccountProduct']||'').trim()){ const e = document.getElementById('err-acct-product'); if(e) e.classList.add('show'); return false; }
    return true;
  }
  if(s.type === 'domiciliary') return true;
  if(s.type === 'text'){
    const v = FD[s.id] || '';
    if(s.required && !v.trim()){ showErr(s.id); return false; }
    return true;
  }
  if(s.type === 'bvn'){
    const v = FD[s.id] || '';
    if(s.required && (!v || !/^\d{11}$/.test(v))){ showErr(s.id); return false; }
    return true;
  }
  if(s.type === 'group'){
    let ok = true;
    (s.fields || []).forEach(f => {
      if(f.required && !(FD[f.id]||'').trim()){
        const el = document.getElementById(f.id); if(el) el.classList.add('err-i');
        ok = false;
      }
    });
    if(!ok){ const e = document.getElementById('err-group-'+idx); if(e) e.classList.add('show'); }
    return ok;
  }
  if(s.type === 'address'){
    const street = (FD[s.prefix+'Street']||'').trim();
    const city   = (FD[s.prefix+'City']  ||'').trim();
    const state  = (FD[s.prefix+'State'] ||'').trim();
    const spfx2  = s.sigPfx || (s.prefix||'s1Res').replace('Res','') || 's1';
    const sameCheck = document.getElementById('same-biz-check-'+spfx2);
    if(sameCheck && sameCheck.checked) return true;
    if(!street || !city || !state){ const e = document.getElementById('err-group-'+idx); if(e) e.classList.add('show'); return false; }
    return true;
  }
  if(s.type === 'id-select'){
    if(!(FD[s.idField]||'').trim()){ showErr(s.idField); return false; }
    const px2 = s.prefix || 's1';
    if(!(FD[px2+'IDNumber']||'').trim()){ const el = document.getElementById(px2+'IDNumber'); if(el) el.classList.add('err-i'); return false; }
    return true;
  }
  if(s.type === 'nationality'){
    if(!(FD[s.id]||'').trim()){ showErr(s.id); return false; }
    return true;
  }
  if(s.type === 'choice' && s.required){
    if(!(FD[s.id]||'').trim()){ showErr(s.id); return false; }
  }
  return true;
}

function showErr(field){
  const e = document.getElementById('err-'+field); if(e) e.classList.add('show');
  const i = document.getElementById(field); if(i) i.classList.add('err-i');
}
function clearErr(field){
  const e = document.getElementById('err-'+field); if(e) e.classList.remove('show');
  const i = document.getElementById(field); if(i) i.classList.remove('err-i');
}

// ── RESTORE SLIDE VALUES ──────────────────────────────────────────────────────
function restoreSlideValues(idx){
  const s = SLIDES[idx]; if(!s) return;
  if(s.type === 'text' || s.type === 'bvn'){
    const el = document.getElementById(s.id); if(el && FD[s.id]) el.value = FD[s.id];
    if(s.type === 'bvn'){ const ok = document.getElementById(s.id+'-ok'); if(ok) ok.classList.toggle('show', (FD[s.id]||'').length === 11); }
  }
  if(s.type === 'group' || s.type === 'address'){
    (s.fields || []).forEach(f => { const el = document.getElementById(f.id); if(el && FD[f.id]) el.value = FD[f.id]; });
    if(s.type === 'address'){
      const spfx = s.sigPfx || (s.prefix||'s1Res').replace('Res','') || 's1';
      if(FD[spfx+'SameAsBusiness'] === 'Yes'){
        const chk  = document.getElementById('same-biz-check-'+spfx);
        const lbl2 = document.getElementById('same-biz-toggle-'+spfx);
        const wrap = document.getElementById('res-fields-wrap-'+spfx);
        if(chk) chk.checked = true; if(lbl2) lbl2.classList.add('active'); if(wrap) wrap.style.opacity = '.4';
      }
    }
  }
  if(s.type === 'account-product' && FD['bizAccountProduct']){
    const pid = FD['bizAccountProduct'], vid = FD['bizAccountVariant'];
    const grp = document.getElementById('acct-group-'+pid); if(grp) grp.classList.add('selected');
    const varWrap = document.getElementById('acct-variants-'+pid); if(varWrap) varWrap.classList.add('show');
    if(vid){ const vBtn = document.getElementById('acct-v-'+pid+'-'+vid); if(vBtn) vBtn.classList.add('sel'); }
  }
  if(s.type === 'domiciliary' && MULTI['domiCurrencies']){
    MULTI['domiCurrencies'].forEach(cid => {
      const chip  = document.getElementById('domi-'+cid);
      const check = document.getElementById('domi-check-'+cid);
      if(chip)  chip.classList.add('selected');
      if(check) check.style.cssText = 'background:var(--orange);border-color:var(--orange);color:#fff';
    });
  }
  if(s.type === 'choice' && FD[s.id]){
    const btn = document.querySelector('#slide-'+idx+' .choice-btn[data-val="'+CSS.escape(FD[s.id])+'"]');
    if(btn){ btn.classList.add('selected'); const k = btn.querySelector('.choice-key'); if(k) k.style.cssText = 'background:var(--orange);color:#fff;border-color:var(--orange)'; }
  }
  if(s.type === 'terms'){
    const tc = document.getElementById('terms-check');
    if(tc && CONSENTS.terms === 'accepted'){ tc.checked = true; document.getElementById('terms-consent-box')?.classList.add('accepted'); }
    const mc = document.getElementById('marketing-check');
    if(mc && CONSENTS.marketing === 'accepted'){ mc.checked = true; document.getElementById('marketing-consent-box')?.classList.add('accepted'); }
  }
  if(s.type === 'consent' && CONSENTS[s.id]){
    document.getElementById('c-yes-'+s.id)?.classList.toggle('active', CONSENTS[s.id] === 'accepted');
    document.getElementById('c-no-'+s.id)?.classList.toggle('active',  CONSENTS[s.id] === 'declined');
  }
  if(s.type === 'nationality'){
    const px = s.prefix || 's1';
    const natVal = FD[px+'Nationality'];
    if(natVal){
      const btn = document.querySelector('#slide-'+idx+' .choice-btn[data-val="'+CSS.escape(natVal)+'"]');
      if(btn){ btn.classList.add('selected'); const k = btn.querySelector('.choice-key'); if(k) k.style.cssText = 'background:var(--orange);color:#fff;border-color:var(--orange)'; }
      if(natVal === 'Other'){ const w = document.getElementById('other-country-wrap-'+px); if(w) w.classList.add('show'); }
      ['NationalityCountry','ResidentPermit','SocialSecurity','PermitIssue','PermitExpiry'].forEach(f => {
        const el = document.getElementById(px+f); if(el && FD[px+f]) el.value = FD[px+f];
      });
    }
  }
  if(s.type === 'other-residency'){
    const px = s.prefix || 's1';
    const resVal = FD[px+'OtherResidency'];
    if(resVal){
      const btn = document.querySelector('#slide-'+idx+' .choice-btn[data-val="'+CSS.escape(resVal)+'"]');
      if(btn){ btn.classList.add('selected'); const k = btn.querySelector('.choice-key'); if(k) k.style.cssText = 'background:var(--orange);color:#fff;border-color:var(--orange)'; }
      if(resVal === 'YES'){ const w = document.getElementById('other-res-wrap-'+px); if(w) w.classList.add('show'); }
      ['OtherResCountry','ResidentPermit2','PermitIssue2','PermitExpiry2'].forEach(f => {
        const el = document.getElementById(px+f); if(el && FD[px+f]) el.value = FD[px+f];
      });
    }
  }
  if(s.type === 'id-select' && FD[s.idField]){
    const px  = s.prefix || 's1';
    const btn = document.querySelector('#slide-'+idx+' .choice-btn[data-val="'+CSS.escape(FD[s.idField])+'"]');
    if(btn){ btn.classList.add('selected'); const k = btn.querySelector('.choice-key'); if(k) k.style.cssText = 'background:var(--orange);color:#fff;border-color:var(--orange)'; }
    const cfg2 = ID_CFG[FD[s.idField]] || {fields:['number']};
    const needsDates = cfg2.fields.includes('issue') || cfg2.fields.includes('expiry');
    const numWrap  = document.getElementById('id-number-wrap-'+px);  if(numWrap)  numWrap.style.display = 'block';
    const dateWrap = document.getElementById('id-fields-wrap-'+px);
    if(dateWrap){ dateWrap.style.display = needsDates ? 'flex' : 'none'; if(needsDates) dateWrap.classList.add('show'); }
    const numEl = document.getElementById(px+'IDNumber');  if(numEl  && FD[px+'IDNumber'])  numEl.value  = FD[px+'IDNumber'];
    const isEl  = document.getElementById(px+'IDIssue');   if(isEl   && FD[px+'IDIssue'])   isEl.value   = FD[px+'IDIssue'];
    const exEl  = document.getElementById(px+'IDExpiry');  if(exEl   && FD[px+'IDExpiry'])  exEl.value   = FD[px+'IDExpiry'];
  }
  if(s.type === 'signature' && FD[s.id]){
    const badge    = document.getElementById('sig-ok-badge-'+idx);
    const captBtns = document.getElementById('sig-capture-btns-'+idx);
    if(badge)    badge.classList.add('show');
    if(captBtns) captBtns.style.display = 'none';
    const cont = document.getElementById('sig-continue-'+idx);
    if(cont) cont.style.display = 'inline-flex';
    const img = new Image();
    img.onload = function(){
      const ac = document.getElementById('sig-after-'+idx);
      if(ac){
        ac.width = img.width; ac.height = img.height;
        ac.getContext('2d').drawImage(img, 0, 0);
        const pv = document.getElementById('sig-preview-'+idx);
        if(pv){ pv.classList.add('show'); const cb = document.getElementById('sig-confirm-btns-'+idx); if(cb) cb.style.display = 'none'; }
      }
    };
    img.src = FD[s.id];
    window['_sigPending_'+idx] = FD[s.id];
  }
  if(s.type === 'salary' && FD['salaryPayments']){
    const btn = document.querySelector('#choices-salary .choice-btn[data-val="'+FD['salaryPayments']+'"]');
    if(btn){ btn.classList.add('selected'); const k = btn.querySelector('.choice-key'); if(k) k.style.cssText = 'background:var(--orange);color:#fff;border-color:var(--orange)'; }
    if(FD['salaryPayments'] === 'Yes'){
      const ew = document.getElementById('employees-wrap'); if(ew) ew.style.display = 'block';
      const ob = document.getElementById('salary-ok-btn');  if(ob) ob.style.display = 'inline-flex';
      const sc = document.getElementById('staffCount');      if(sc && FD['staffCount']) sc.value = FD['staffCount'];
    }
  }
}

// ── KEYBOARD & WHEEL ──────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  const s = SLIDES[cur]; if(!s) return;
  if(s.type === 'choice' && /^[A-Ea-e]$/.test(e.key)){
    const o = s.opts && s.opts.find(x => x.key === e.key.toUpperCase());
    if(o){ const b = document.querySelector(`#slide-${cur} .choice-btn[data-val="${CSS.escape(o.val)}"]`); if(b) pickChoice(s.id, o.val, b, true, cur); }
    return;
  }
  if((e.key === 'ArrowDown' || e.key === 'PageDown') && ['section','welcome'].includes(s.type)){ e.preventDefault(); goNext(); }
  if(e.key === 'ArrowUp' || e.key === 'PageUp'){ e.preventDefault(); goBack(); }
});

let _wl = false;
document.addEventListener('wheel', e => {
  const s = SLIDES[cur]; if(!s) return;
  if(['review','group','consent','address','add-signatories','salary','id-select','scuml'].includes(s.type)) return;
  if(_wl) return; _wl = true; setTimeout(() => _wl = false, 700);
  if(e.deltaY >  40 && ['section','welcome','choice'].includes(s.type)) goNext();
  if(e.deltaY < -40) goBack();
}, {passive: true});

// ── AUTO-SAVE / RESTORE ───────────────────────────────────────────────────────
function autoSave(){
  try {
    const sigKeys = Object.keys(FD).filter(k => k.endsWith('Signature'));
    const sigs    = {};
    sigKeys.forEach(k => { sigs[k] = FD[k]; delete FD[k]; });
    localStorage.setItem('gtb_fd',     JSON.stringify(FD));
    sigKeys.forEach(k => FD[k] = sigs[k]);
    try { localStorage.setItem('gtb_sigs', JSON.stringify(sigs)); } catch(e2){}
    localStorage.setItem('gtb_multi',    JSON.stringify(Object.fromEntries(Object.entries(MULTI).map(([k,v]) => [k, Array.from(v)]))));
    localStorage.setItem('gtb_consents', JSON.stringify(CONSENTS));
  } catch(e){}
  if(_previewOpen) updatePreviewFields();
}

function restoreFromStorage(){
  try {
    Object.assign(FD, JSON.parse(localStorage.getItem('gtb_fd')    || '{}'));
    Object.assign(FD, JSON.parse(localStorage.getItem('gtb_sigs')  || '{}'));
    if(FD.s1Signature && FD.s1Signature !== _sigImgSrc){ _sigImg = new Image(); _sigImg.src = FD.s1Signature; _sigImgSrc = FD.s1Signature; }
    if(FD.s2Signature){ _sigImg2 = new Image(); _sigImg2.src = FD.s2Signature; }
    // Migrate stale ID type values
    if(FD.s1IDType === 'National ID (NIN Slip)') FD.s1IDType = 'National ID (NIN)';
    ['s2','s3'].forEach(p => { if(FD[p+'IDType'] === 'National ID (NIN Slip)') FD[p+'IDType'] = 'National ID (NIN)'; });
    const m = JSON.parse(localStorage.getItem('gtb_multi') || '{}');
    Object.entries(m).forEach(([k,v]) => { MULTI[k] = new Set(v); FD[k] = v.join(', '); });
    Object.assign(CONSENTS, JSON.parse(localStorage.getItem('gtb_consents') || '{}'));
    if(CFG_CUSTOMER && !FD.s1FirstName && !FD.s1Surname){
      const p = CFG_CUSTOMER.trim().split(' ');
      FD.s1FirstName = p[0] || ''; FD.s1Surname = p.slice(1).join(' ') || '';
    }
  } catch(e){}
}

// ── REVIEW BUILDER ────────────────────────────────────────────────────────────
function buildReview(){
  const s1Name = [FD.s1FirstName, FD.s1Surname].filter(Boolean).join(' ') || 'Signatory 1';
  const s2Name = [FD.s2FirstName, FD.s2Surname].filter(Boolean).join(' ');
  const s3Name = [FD.s3FirstName, FD.s3Surname].filter(Boolean).join(' ');
  const secs = [
    {title:'🏢 Business Info', goTo:2, rows:[
      ['Category',FD.bizCategory],['Account',FD.bizAccountVariantName||FD.bizAccountProductName],
      ['Domiciliary',FD.domiCurrencies||'None'],['Business name',FD.bizName],['CAC number',FD.bizRegNumber],
      ['Nature',FD.bizNature],['Sector',FD.bizSector],['Turnover',FD.bizTurnover],['TIN',FD.bizTIN],
      ['Address',[FD.bizHousePlot,FD.bizAddr1,FD.bizCity,FD.bizState].filter(Boolean).join(', ')],
      ['LGA',FD.bizLGA],['Mobile',FD.bizMobile],['Email',FD.bizEmail]
    ]},
    {title:'👤 Signatory 1 — '+s1Name, goTo:10, rows:[
      ['Full name',[FD.s1Title,FD.s1FirstName,FD.s1OtherNames,FD.s1Surname].filter(Boolean).join(' ')],
      ['Gender',FD.s1Gender],['DOB',FD.s1DOB],
      ['Nationality',FD.s1Nationality+(FD.s1NationalityCountry?' — '+FD.s1NationalityCountry:'')],
      ['BVN',FD.s1BVN],['ID type',FD.s1IDType],['ID number',FD.s1IDNumber],
      ['Mobile',FD.s1Mobile],['Email',FD.s1Email],
      ['Residential address',[FD.s1ResHousePlot,FD.s1ResStreet,FD.s1ResCity,FD.s1ResState].filter(Boolean).join(', ')],
      ['Signature',FD.s1Signature?'Captured ✅':'Not yet']
    ]},
    ...(s2Name ? [{title:'👤 Signatory 2 — '+s2Name, goTo:SLIDES.findIndex(s=>s.s2slide&&s.type==='group'&&s.emoji==='✍️')||29, rows:[
      ['Full name',[FD.s2Title,FD.s2FirstName,FD.s2OtherNames,FD.s2Surname].filter(Boolean).join(' ')],
      ['DOB',FD.s2DOB],['BVN',FD.s2BVN],['Mobile',FD.s2Mobile],['Email',FD.s2Email],
      ['Signature',FD.s2Signature?'Captured ✅':'Not yet']
    ]}] : []),
    ...(s3Name ? [{title:'👤 Signatory 3 — '+s3Name, goTo:27, rows:[
      ['Full name',[FD.s3Title,FD.s3FirstName,FD.s3OtherNames,FD.s3Surname].filter(Boolean).join(' ')],
      ['BVN',FD.s3BVN],['Mobile',FD.s3Mobile],['Email',FD.s3Email]
    ]}] : []),
    {title:'👨‍👩‍👧 Next of Kin', goTo:20, rows:[
      ['Name',[FD.nokFirstName,FD.nokSurname].filter(Boolean).join(' ')],
      ['Relationship',FD.nokRelationship],['Mobile',FD.nokMobile],
      ['Address',[FD.nokStreet,FD.nokCity,FD.nokState].filter(Boolean).join(', ')]
    ]},
    {title:'⚙️ Account Services', goTo:23, rows:[
      ['Online banking',FD.onlineBanking],['Statement',FD.stmtFreq],
      ['Cheque book',FD.chequeBook],['Salary payments',FD.salaryPayments],['Employees',FD.staffCount]
    ]},
    {title:'📜 Consents', goTo:26, rows:[
      ['Terms & Declaration',CONSENTS.terms==='accepted'?'Accepted':'Not accepted'],
      ['Marketing',CONSENTS.marketing==='accepted'?'Opted in':'Not opted in']
    ]},
    {title:'🤝 References', goTo:29, rows:[
      ['Ref 1',FD.ref1Name||null],['Ref 2',FD.ref2Name||null]
    ]},
  ];
  let html = '';
  secs.forEach(sec => {
    const rows = sec.rows.filter(r => r[1]);
    if(!rows.length) return;
    html += `<div class="review-section"><div class="review-head"><span>${sec.title}</span><button class="review-edit" onclick="goToSlide(${sec.goTo},${SLIDES.length-2})">✏️ Edit</button></div><div class="review-rows">${rows.map(r=>`<div class="review-row"><span class="review-row-label">${escH(r[0])}</span><span class="review-row-value">${escH(r[1])}</span></div>`).join('')}</div></div>`;
  });
  const el = document.getElementById('review-content'); if(el) el.innerHTML = html;
}

// ── PROCESSING COUNTDOWN ──────────────────────────────────────────────────────
let _procTimers = [];
function startProcessing(){
  _procTimers.forEach(clearTimeout); _procTimers = [];
  const r = 47; const circ = 2 * Math.PI * r;
  let count = 10;
  const ring  = document.getElementById('proc-ring');
  const numEl = document.getElementById('proc-num');
  const steps = ['ps1','ps2','ps3','ps4','ps5'];
  function setStep(i, state){ const el = document.getElementById(steps[i]); if(el) el.className = 'proc-step ' + state; }
  function tick(){
    count--;
    if(numEl) numEl.textContent = count;
    if(ring)  ring.style.strokeDashoffset = (circ * (count / 10)).toFixed(1);
    if(count <= 0){
      steps.forEach((_,i) => setStep(i,'done'));
      if(numEl){ numEl.style.fontSize = '28px'; numEl.textContent = '✓'; numEl.style.color = 'var(--success)'; }
      if(ring)  ring.style.stroke = 'var(--success)';
      _procTimers.push(setTimeout(() => goToSlide(SLIDES.length-1, SLIDES.length-2), 900));
      return;
    }
    _procTimers.push(setTimeout(tick, 1000));
  }
  setStep(0,'active');
  _procTimers.push(setTimeout(() => { setStep(0,'done'); setStep(1,'active'); }, 2000));
  _procTimers.push(setTimeout(() => { setStep(1,'done'); setStep(2,'active'); }, 4000));
  _procTimers.push(setTimeout(() => { setStep(2,'done'); setStep(3,'active'); }, 6000));
  _procTimers.push(setTimeout(() => { setStep(3,'done'); setStep(4,'active'); }, 8000));
  _procTimers.push(setTimeout(generatePDF, 800));
  _procTimers.push(setTimeout(tick, 1000));
}

// ── SUPABASE ──────────────────────────────────────────────────────────────────
async function confirmSendLink(){
  const n     = (document.getElementById('sig2LinkName')  || {}).value || (FD['sig2LinkName']  || '');
  const email = (document.getElementById('sig2LinkEmail') || {}).value || (FD['sig2LinkEmail'] || '');
  if(!n || !email){ alert('Please enter the signatory\'s name and email address.'); return; }
  FD['sig2LinkName'] = n; FD['sig2LinkEmail'] = email; autoSave();
  const btn = document.getElementById('send-link-btn');
  if(btn){ btn.disabled = true; btn.textContent = '⏳ Sending…'; }
  const sessionId = crypto.randomUUID();
  FD._s2SessionId = sessionId;
  autoSave();
  try {
    const {error} = await supa.from('signatory_sessions').insert({
      id: sessionId,
      officer_session_id: CFG_SESSION || 'direct',
      s2_name: n, s2_email: email,
      biz_name: FD.bizName || '',
      status: 'pending',
      form_data: {},
      expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
    });
    if(error) throw error;
  } catch(e){
    console.error('Supabase insert error:', e);
    if(btn){ btn.disabled = false; btn.textContent = '⚠️ Retry'; }
    alert('Could not create session. Check internet connection.\n' + e.message);
    return;
  }
  const base = window.location.href.split('?')[0];
  const link = `${base}?role=s2&session=${sessionId}`;
  try {
    await emailjs.send('service_vancprr','template_oeqmbz5',{
      to_email: email, customer_name: n,
      officer_name: CFG_OFFICER || 'Your account officer',
      bank: 'GTBank', form_link: link,
      access_code: sessionId.slice(0,8).toUpperCase(),
      note: `Please fill your signatory details for ${FD.bizName || 'the business account'} opening.`,
      expiry: '7 days',
    });
  } catch(e){ console.warn('EmailJS error (link still created):', e); }
  const wrap = document.getElementById('send-sig-wrap');
  if(wrap) wrap.innerHTML = `
    <div style="padding:14px;background:var(--success-bg);border:1px solid var(--success);border-radius:10px;font-size:13px;color:var(--success)">
      <strong>✅ Link sent to ${email}</strong><br>
      <span style="color:var(--muted);font-size:12px">They can open it on any device. You'll be able to merge their data here once they submit.</span>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="ok-btn" style="font-size:13px;padding:8px 14px" onclick="navigator.clipboard.writeText('${base}?role=s2&session=${sessionId}').then(()=>this.textContent='✅ Copied')">📋 Copy link</button>
        <button class="ok-btn" style="font-size:13px;padding:8px 14px;background:#1DA1F2" onclick="checkS2Status()">🔄 Check status</button>
      </div>
    </div>`;
}

async function checkS2Status(){
  if(!FD._s2SessionId){ alert('No session created yet.'); return; }
  const btn = event && event.target;
  if(btn){ const orig = btn.textContent; btn.textContent = '⏳ Checking…'; btn.disabled = true; setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 3000); }
  try {
    const {data, error} = await supa.from('signatory_sessions').select('status,form_data,s2_name').eq('id', FD._s2SessionId).single();
    if(error) throw error;
    const statusEl = document.getElementById('s2-status-badge');
    if(data.status === 'submitted'){
      if(statusEl) statusEl.innerHTML = `<div style="padding:12px 16px;background:var(--success-bg);border:1px solid var(--success);border-radius:10px;font-size:13px;color:var(--success)">
        ✅ <strong>${data.s2_name||'Signatory 2'} has submitted!</strong>
        <button class="ok-btn" style="margin-top:10px;font-size:13px;padding:8px 16px" onclick="mergeS2Data()">Merge their data →</button>
      </div>`;
    } else {
      if(statusEl) statusEl.innerHTML = `<div style="padding:10px 14px;background:#FFF8F0;border:1px solid #FDDFD0;border-radius:8px;font-size:13px;color:#8B4513">
        ⏳ Still pending — ${data.s2_name||'Signatory 2'} hasn't submitted yet.
      </div>`;
    }
  } catch(e){ console.error('checkS2Status error:', e); alert('Could not check status: ' + e.message); }
}

async function mergeS2Data(){
  if(!FD._s2SessionId) return;
  try {
    const {data, error} = await supa.from('signatory_sessions').select('form_data').eq('id', FD._s2SessionId).single();
    if(error) throw error;
    Object.assign(FD, data.form_data || {});
    autoSave();
    const idx = SLIDES.findIndex(s => s.type === 'add-signatories');
    const el  = document.getElementById('slide-'+idx);
    if(el){ el.innerHTML = renderAddSig(SLIDES[idx], idx); el.className = 'slide pos-active'; }
    const statusEl = document.getElementById('s2-status-badge');
    if(statusEl) statusEl.innerHTML = `<div style="padding:12px 16px;background:var(--success-bg);border:1px solid var(--success);border-radius:10px;font-size:13px;color:var(--success)">
      ✅ <strong>Signatory 2 data merged!</strong>
      <div style="margin-top:8px"><button class="ok-btn" style="font-size:13px;padding:8px 16px" onclick="goNext()">Continue →</button></div>
    </div>`;
  } catch(e){ console.error('mergeS2Data error:', e); alert('Could not merge data: ' + e.message); }
}

async function submitS2Data(){
  const btn = document.getElementById('s2-submit-btn');
  if(btn){ btn.disabled = true; btn.textContent = '⏳ Submitting…'; }
  try {
    const payload = {};
    Object.keys(FD).forEach(k => { if(k.startsWith('s2') || k === 's2Signature') payload[k] = FD[k]; });
    const {error} = await supa.from('signatory_sessions')
      .update({status:'submitted', form_data:payload, submitted_at:new Date().toISOString()})
      .eq('id', S2_SESSION);
    if(error) throw error;
    const container = document.getElementById('slides');
    container.innerHTML = `<div class="slide pos-active"><div class="slide-inner" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center">
      <span style="font-size:64px;margin-bottom:24px">🎉</span>
      <h2 class="slide-q" style="text-align:center">All done!</h2>
      <p class="slide-sub" style="text-align:center">Your signatory details have been submitted. The account officer will be notified.<br><br>You can close this page.</p>
    </div></div>`;
  } catch(e){
    console.error('submitS2Data error:', e);
    if(btn){ btn.disabled = false; btn.textContent = '⚠️ Retry'; }
    alert('Submission failed: ' + e.message);
  }
}

// ── PDF GENERATION ────────────────────────────────────────────────────────────
function wordWrapChars(val, rows){
  const result = [];
  const words  = val.split(' ');
  let ri = 0, ci = 0;
  for(let wi = 0; wi < words.length; wi++){
    const word = words[wi];
    if(!word){ ci++; continue; }
    if(word.length > rows[ri].n - ci && ci > 0){ ri++; ci = 0; if(ri >= rows.length) break; }
    for(const ch of word){
      if(ri >= rows.length) break;
      if(ci >= rows[ri].n){ ri++; ci = 0; if(ri >= rows.length) break; }
      result.push({r:ri, c:ci, ch});
      ci++;
    }
    if(wi < words.length - 1 && ri < rows.length){ ci++; if(ci >= rows[ri].n){ ri++; ci = 0; } }
  }
  return result;
}

async function generatePDF(){
  try {
    const {PDFDocument, rgb} = PDFLib;
    const BLACK = rgb(0,0,0);
    const pdfResp = await fetch('Account-Opening-Documentation-Sole-Proprietorship-Partnership-Form-Jan-2026.pdf');
    if(!pdfResp.ok) throw new Error('Could not load GTBank PDF template');
    const pdfBytes = await pdfResp.arrayBuffer();
    const doc      = await PDFDocument.load(pdfBytes);
    const font     = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    const zapf     = await doc.embedFont(PDFLib.StandardFonts.ZapfDingbats);
    const pages    = doc.getPages();
    const PI       = {3:2,4:3,5:4,6:5,7:6,8:7,9:8,10:9,16:15};
    const data     = buildStampData();

    for(const f of GTB_FIELDS){
      const pg = pages[PI[f.page]];
      if(f.drawBox){
        if(f.type === 'text'){
          for(const row of f.rows)
            for(let ci = 0; ci < row.n; ci++)
              pg.drawRectangle({x:row.x+ci*f.bw, y:row.yc-f.bh/2, width:f.bw, height:f.bh, borderColor:BLACK, borderWidth:0.5, color:rgb(1,1,1)});
        } else {
          pg.drawRectangle({x:f.x-f.bw/2, y:f.y-f.bh/2, width:f.bw, height:f.bh, borderColor:BLACK, borderWidth:0.5, color:rgb(1,1,1)});
        }
      }
      const val = data[f.fd];
      if(f.fd === '_bizTINoverflow' && val){
        const tx = 242.0, ty = 144.54;
        pg.drawLine({start:{x:tx,y:ty},   end:{x:tx+8,y:ty},   thickness:1.2, color:BLACK});
        pg.drawLine({start:{x:tx+8,y:ty}, end:{x:tx+4,y:ty+3}, thickness:1.2, color:BLACK});
        pg.drawLine({start:{x:tx+8,y:ty}, end:{x:tx+4,y:ty-3}, thickness:1.2, color:BLACK});
      }
      if(!val) continue;
      if(f.type === 'text'){
        if(f.fullText){
          const row = f.rows[0];
          const bh = row.bh || f.bh, bw = row.bw || f.bw;
          const fs = Math.round(bh * 0.62 * 10) / 10;
          pg.drawText(val, {x:row.x+bw*0.1, y:row.yc-fs*0.32, size:fs, font, color:BLACK});
        } else {
          for(const {r, c, ch} of wordWrapChars(val, f.rows)){
            const row = f.rows[r];
            const bw  = row.bw || f.bw, bh = row.bh || f.bh;
            const fs  = Math.round(bh * 0.62 * 10) / 10;
            const isPunct = ch === '.' || ch === ',';
            const charFs  = isPunct ? Math.round(bh * 1.1 * 10) / 10 : fs;
            const tx = row.x + c*bw + (isPunct ? bw*0.32 : bw*0.15);
            const ty = isPunct ? row.yc + bh*0.06 : row.yc - fs*0.32;
            pg.drawText(ch, {x:tx, y:ty, size:charFs, font, color:BLACK});
          }
        }
      } else if(f.type === 'tick'){
        if(val !== f.match) continue;
        const fs = Math.max(5, Math.round(f.bw * 0.9 * 10) / 10);
        pg.drawText('\x34', {x:f.x-f.bw*0.2, y:f.y-f.bh*0.25, size:fs, font:zapf, color:BLACK});
      }
    }

    async function embedSig(dataUrl, spots){
      if(!dataUrl) return;
      try {
        const b64      = dataUrl.split(',')[1];
        const sigBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const sigPdf   = dataUrl.startsWith('data:image/png') ? await doc.embedPng(sigBytes) : await doc.embedJpg(sigBytes);
        const {width:iw, height:ih} = sigPdf.size();
        const aspect = iw / ih;
        for(const sp of spots){
          const pg = pages[PI[sp.page]]; if(!pg) continue;
          const h  = Math.min(sp.maxH, sp.maxW / aspect);
          const w  = h * aspect;
          const cx = sp.x + (sp.maxW - w) / 2;
          const yDraw = sp.mode === 'box' ? sp.yc - h*0.5 : sp.yc + (sp.yOff || 0);
          pg.drawImage(sigPdf, {x:cx, y:yDraw, width:w, height:h});
        }
      } catch(e){ console.warn('Sig embed error:', e); }
    }
    await embedSig(FD.s1Signature, [
      {page:6,  x:99.0,  yc:783.6,  maxW:283.2, maxH:35, yOff:-10},
      {page:8,  x:90.9,  yc:762.1,  maxW:160,   maxH:55},
      {page:9,  x:38.5,  yc:586.85, maxW:240,   maxH:38, mode:'box'},
      {page:10, x:248.0, yc:607.0,  maxW:110.0, maxH:38, mode:'box'},
      {page:16, x:91.0,  yc:692.32, maxW:271,   maxH:30},
      {page:16, x:275.5, yc:494.32, maxW:137,   maxH:25},
    ]);
    await embedSig(FD.s2Signature, [
      {page:6, x:99.0, yc:718.0, maxW:283.2, maxH:35, yOff:-10},
    ]);

    const outBytes = await doc.save();
    const blob     = new Blob([outBytes], {type:'application/pdf'});
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    const name     = (FD.bizName || FD.s1Surname || 'gtbank').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    a.href = url; a.download = name + '_account-opening.pdf';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    const biz      = FD.bizName || 'your business';
    const og       = CFG_OFFICER ? `Hi ${CFG_OFFICER.split(' ')[0]},` : 'Hi,';
    const waMsg    = encodeURIComponent(`${og}\n\nCompleted GTBank form for ${biz}. PDF attached.\n\nRegards,\n${CFG_CUSTOMER || FD.s1FirstName || ''}`);
    const emailHref = `mailto:?subject=Completed: GTBank Account Opening — ${biz}&body=${encodeURIComponent(og+'\n\nCompleted form for '+biz+'.\nPDF attached.\n\n'+(CFG_SESSION?'Ref: '+CFG_SESSION+'\n\n':'')+'Regards,\n'+(CFG_CUSTOMER||FD.s1FirstName||''))}`;
    window._doneWA    = waMsg;
    window._doneEmail = emailHref;
    const waEl = document.getElementById('wa-btn');   if(waEl)  waEl.href  = 'https://wa.me/?text=' + waMsg;
    const emEl = document.getElementById('email-btn'); if(emEl) emEl.href  = emailHref;
  } catch(err){
    console.error('PDF generation error:', err);
    alert('PDF error: ' + err.message + '\n\nMake sure the GTBank PDF file is in the same folder.');
  }
}

// ── PDF PREVIEW ───────────────────────────────────────────────────────────────
let _pdfDoc = null, _previewPage = 3, _previewScale = 1, _previewOpen = false;
let _renderTimer = null;
let _sigImg = null, _sigImgSrc = null, _sigImg2 = null;

function togglePreview(){
  _previewOpen = !_previewOpen;
  document.body.classList.toggle('preview-open', _previewOpen);
  document.getElementById('preview-btn').classList.toggle('active', _previewOpen);
  document.getElementById('preview-btn-label').textContent = _previewOpen ? 'Hide PDF' : 'Show PDF';
  if(_previewOpen){
    const suggested = SLIDE_PAGE_MAP[cur] || 3;
    renderPreviewPage(suggested);
  }
}

function previewGoTo(pn){
  document.querySelectorAll('.pnav-btn').forEach(b => b.classList.toggle('active', +b.dataset.page === pn));
  renderPreviewPage(pn);
}

async function renderPreviewPage(pageNum){
  if(!_previewOpen) return;
  _previewPage = pageNum;
  document.getElementById('preview-page-label').textContent = PAGE_LABELS[pageNum] || 'Page ' + pageNum;
  const pnumEl = document.getElementById('preview-pnum'); if(pnumEl) pnumEl.textContent = pageNum + ' / ' + PDF_TOTAL_PAGES;
  document.getElementById('preview-loading').style.display       = 'flex';
  document.getElementById('preview-canvas-wrap').style.display   = 'none';
  document.querySelectorAll('.pnav-btn').forEach(b => b.classList.toggle('active', +b.dataset.page === pageNum));
  try {
    if(!_pdfDoc) _pdfDoc = await pdfjsLib.getDocument(PDF_URL).promise;
    const page = await _pdfDoc.getPage(pageNum);
    const vp0  = page.getViewport({scale:1});
    const scroll = document.getElementById('preview-scroll');
    const availW = scroll.clientWidth - 32;
    const scale  = Math.min(availW / vp0.width, 2.5);
    _previewScale = scale;
    const vp = page.getViewport({scale});
    const c  = document.getElementById('preview-canvas');
    const oc = document.getElementById('preview-overlay-canvas');
    c.width  = vp.width;  c.height  = vp.height;
    oc.width = vp.width;  oc.height = vp.height;
    await page.render({canvasContext: c.getContext('2d'), viewport: vp}).promise;
    document.getElementById('preview-loading').style.display     = 'none';
    document.getElementById('preview-canvas-wrap').style.display = 'block';
    drawPreviewOverlay();
  } catch(e){
    const errEl = document.getElementById('preview-loading');
    if(errEl){ errEl.innerHTML = '<div style="color:#e74c3c;font-size:12px"></div>'; errEl.firstChild.textContent = 'Error: ' + e.message; }
  }
}

function drawPreviewOverlay(){
  if(!_previewOpen) return;
  const oc = document.getElementById('preview-overlay-canvas');
  if(!oc || !oc.width) return;
  const ctx  = oc.getContext('2d');
  ctx.clearRect(0, 0, oc.width, oc.height);
  const PH = 841.890, PW = 595.276;
  const data = buildStampData();

  function toCanvasX(pdfX){ return pdfX / PW * oc.width; }
  function toCanvasY(pdfYcenter){ return (1 - (pdfYcenter / PH)) * oc.height; }

  for(const f of GTB_FIELDS){
    if(f.page !== _previewPage) continue;
    if(f.drawBox){
      ctx.strokeStyle = '#000'; ctx.lineWidth = 0.8;
      if(f.type === 'text'){
        const bwPx = f.bw / PW * oc.width, bhPx = f.bh / PH * oc.height;
        for(const row of f.rows)
          for(let ci = 0; ci < row.n; ci++)
            ctx.strokeRect(toCanvasX(row.x + ci*f.bw), toCanvasY(row.yc + f.bh/2), bwPx, bhPx);
      } else {
        const bwPx = f.bw / PW * oc.width, bhPx = f.bh / PH * oc.height;
        ctx.strokeRect(toCanvasX(f.x - f.bw/2), toCanvasY(f.y + f.bh/2), bwPx, bhPx);
      }
    }
    const val = data[f.fd];
    if(f.fd === '_bizTINoverflow' && val){
      const tx = toCanvasX(242.0), ty = toCanvasY(144.54), aw = 10, ah = 4;
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(tx+aw,ty); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx+aw,ty); ctx.lineTo(tx+aw-ah,ty-ah); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx+aw,ty); ctx.lineTo(tx+aw-ah,ty+ah); ctx.stroke();
    }
    if(!val) continue;
    if(f.type === 'text'){
      const bwPx = f.bw / PW * oc.width, bhPx = f.bh / PH * oc.height;
      const fs   = Math.max(4, bhPx * 0.62);
      ctx.fillStyle = '#000000'; ctx.textBaseline = 'middle';
      if(f.fullText){
        const row = f.rows[0];
        ctx.font = `${fs}px Arial`; ctx.textAlign = 'left';
        ctx.fillText(val, toCanvasX(row.x) + bwPx*0.1, toCanvasY(row.yc));
      } else {
        ctx.font = `${fs}px Arial`; ctx.textAlign = 'left';
        for(const {r, c, ch} of wordWrapChars(val, f.rows)){
          const row = f.rows[r];
          const startX = toCanvasX(row.x), centerY = toCanvasY(row.yc);
          const isPunct = ch === '.' || ch === ',';
          const cx2 = startX + c*bwPx + (isPunct ? bwPx*0.32 : bwPx*0.15);
          if(isPunct){
            ctx.font = `${Math.max(4, bhPx*1.1)}px Arial`; ctx.textBaseline = 'alphabetic';
            ctx.fillText(ch, cx2, centerY + bhPx*0.25);
            ctx.font = `${fs}px Arial`; ctx.textBaseline = 'middle';
          } else {
            ctx.fillText(ch, cx2, centerY);
          }
        }
      }
    } else if(f.type === 'tick'){
      if(val !== f.match) continue;
      const cxT = toCanvasX(f.x), cyT = toCanvasY(f.y);
      const szT = Math.max(5, f.bw / PW * oc.width * 0.9);
      ctx.font = `bold ${szT}px Arial`; ctx.fillStyle = '#000000';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✓', cxT, cyT);
    }
  }

  function drawSigOnPreview(img, spots){
    if(!img || !img.complete || !img.naturalWidth) return;
    const aspect = img.naturalWidth / img.naturalHeight;
    for(const sp of spots){
      if(sp.page !== _previewPage) continue;
      const h_pdf  = Math.min(sp.maxH, sp.maxW / aspect);
      const w_pdf  = h_pdf * aspect;
      const offsetX = sp.x + (sp.maxW - w_pdf) / 2;
      const cxS = toCanvasX(offsetX);
      const cyS = sp.mode === 'box' ? toCanvasY(sp.yc + h_pdf*0.5) : toCanvasY(sp.yc + (sp.yOff||0) + h_pdf);
      const cwS = w_pdf / PW * oc.width, chS = h_pdf / PH * oc.height;
      ctx.drawImage(img, cxS, cyS, cwS, chS);
    }
  }
  drawSigOnPreview(_sigImg, [
    {page:6,  x:99.0,  yc:783.6,  maxW:283.2, maxH:35, yOff:-10},
    {page:8,  x:90.9,  yc:762.1,  maxW:160,   maxH:55},
    {page:9,  x:38.5,  yc:586.85, maxW:240,   maxH:38, mode:'box'},
    {page:10, x:248.0, yc:607.0,  maxW:110.0, maxH:38, mode:'box'},
    {page:16, x:91.0,  yc:692.32, maxW:271,   maxH:30},
    {page:16, x:275.5, yc:494.32, maxW:137,   maxH:25},
  ]);
  if(_sigImg2) drawSigOnPreview(_sigImg2, [
    {page:6, x:99.0, yc:718.0, maxW:283.2, maxH:35, yOff:-10},
  ]);
}

function updatePreviewFields(){
  if(!_previewOpen) return;
  clearTimeout(_renderTimer);
  _renderTimer = setTimeout(() => {
    const suggested = SLIDE_PAGE_MAP[cur];
    if(suggested && suggested !== _previewPage) renderPreviewPage(suggested);
    else drawPreviewOverlay();
  }, 80);
}

function openPreview(){  if(!_previewOpen) togglePreview(); }
function closePreview(){ if(_previewOpen)  togglePreview(); }
function previewPrev(){ if(_previewPage > 1)               renderPreviewPage(_previewPage - 1); }
function previewNext(){ if(_previewPage < PDF_TOTAL_PAGES)  renderPreviewPage(_previewPage + 1); }

// ── INIT ──────────────────────────────────────────────────────────────────────
function init(){
  TOTAL_Q = SLIDES.filter(s => !['welcome','section','review','done'].includes(s.type)).length;
  const container = document.getElementById('slides');
  SLIDES.forEach((s, i) => container.appendChild(renderSlide(s, i)));
  restoreFromStorage();
  initGate();
  goToSlide(0, 0);
}
window.addEventListener('DOMContentLoaded', init);
