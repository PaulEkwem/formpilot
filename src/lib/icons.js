/**
 * Lucide icon helper.
 *
 * Lucide is loaded from CDN as window.lucide. This module wraps two
 * common operations:
 *   1. fpIcons.refresh()       — re-scan DOM and replace [data-lucide]
 *                                placeholders with rendered SVGs.
 *   2. fpIcons.icon(name, attrs) — return inline SVG markup string for
 *                                  use in template literals.
 *
 * Use <i data-lucide="icon-name"></i> in markup, then call
 * window.fpIcons.refresh() after mutating the DOM.
 *
 * Icon names: https://lucide.dev/icons
 */
(function () {
  function refresh(root) {
    if (!window.lucide) {
      console.warn('[fp-icons] lucide not loaded yet');
      return;
    }
    try {
      window.lucide.createIcons({
        attrs: { 'stroke-width': 2 },
        ...(root ? { nameAttr: 'data-lucide', root } : {}),
      });
    } catch (e) {
      console.warn('[fp-icons] refresh failed:', e);
    }
  }

  function icon(name, attrs = {}) {
    const attrStr = Object.entries(attrs)
      .map(([k, v]) => ` ${k}="${String(v).replace(/"/g, '&quot;')}"`)
      .join('');
    return `<i data-lucide="${name}"${attrStr}></i>`;
  }

  window.fpIcons = { refresh, icon };

  // Auto-refresh on DOMContentLoaded once lucide is available.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => refresh());
  } else {
    refresh();
  }
})();
