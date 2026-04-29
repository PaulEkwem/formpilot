/**
 * Lightweight confirmation modal.
 *
 *   const ok = await window.fpModal.confirm({
 *     title: 'Resend link?',
 *     message: 'A new email will go to the customer.',
 *     confirmText: 'Resend',
 *     cancelText: 'Cancel',
 *     danger: false
 *   });
 *   if (ok) { ... }
 *
 * Builds DOM lazily on first call. No dependencies beyond fpIcons (optional).
 */
(function () {
  let overlayEl = null;

  function build() {
    if (overlayEl) return;
    overlayEl = document.createElement('div');
    overlayEl.className = 'fp-confirm-overlay';
    overlayEl.innerHTML = `
      <div class="fp-confirm-card" role="dialog" aria-modal="true">
        <div class="fp-confirm-icon" data-fp-icon-wrap>
          <i data-lucide="alert-triangle"></i>
        </div>
        <h3 class="fp-confirm-title" data-fp-title></h3>
        <p class="fp-confirm-message" data-fp-message></p>
        <div class="fp-confirm-actions">
          <button class="fp-btn fp-btn-secondary" data-fp-cancel>Cancel</button>
          <button class="fp-btn fp-btn-primary" data-fp-confirm>Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(overlayEl);
  }

  function confirm({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = {}) {
    build();
    overlayEl.querySelector('[data-fp-title]').textContent   = title || 'Are you sure?';
    overlayEl.querySelector('[data-fp-message]').textContent = message || '';
    overlayEl.querySelector('[data-fp-cancel]').textContent  = cancelText;
    const confirmBtn = overlayEl.querySelector('[data-fp-confirm]');
    confirmBtn.textContent = confirmText;
    confirmBtn.classList.toggle('fp-btn-danger', !!danger);
    confirmBtn.classList.toggle('fp-btn-primary', !danger);

    const iconWrap = overlayEl.querySelector('[data-fp-icon-wrap]');
    iconWrap.classList.toggle('danger', !!danger);
    iconWrap.querySelector('[data-lucide]')?.setAttribute('data-lucide', danger ? 'alert-octagon' : 'alert-triangle');
    if (window.fpIcons) window.fpIcons.refresh();

    overlayEl.classList.add('show');
    confirmBtn.focus();

    return new Promise((resolve) => {
      const cleanup = (result) => {
        overlayEl.classList.remove('show');
        confirmBtn.removeEventListener('click', onYes);
        cancelBtn.removeEventListener('click', onNo);
        overlayEl.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      };
      const onYes  = () => cleanup(true);
      const onNo   = () => cleanup(false);
      const onBackdrop = (e) => { if (e.target === overlayEl) cleanup(false); };
      const onKey  = (e) => {
        if (e.key === 'Escape') cleanup(false);
        if (e.key === 'Enter')  cleanup(true);
      };
      const cancelBtn = overlayEl.querySelector('[data-fp-cancel]');
      confirmBtn.addEventListener('click', onYes);
      cancelBtn.addEventListener('click', onNo);
      overlayEl.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);
    });
  }

  window.fpModal = { confirm };
})();
