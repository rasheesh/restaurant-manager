(function () {
  const root = document.documentElement;
  const body = document.body;

  function cssVar(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  function applyRuntimeVars(collapsed) {
    const expanded = cssVar('--sidebar-width') || '240px';
    const collapsedVal = cssVar('--sidebar-collapsed-width') || '60px';
    const current = collapsed ? collapsedVal : expanded;
    root.style.setProperty('--sidebar-current', current);
    root.style.setProperty('--hamburger-left', `calc(${current} - 8px)`);
    // keep body classes for app code expecting them
    body.classList.toggle('sidebar-collapsed', collapsed);
    body.classList.toggle('fp-sidebar-collapsed', collapsed);
  }

  function getPrimarySidebar() {
    return document.querySelector('.sidebar') || document.querySelector('.fp-sidebar') || null;
  }

  function syncFromDOM() {
    const sb = getPrimarySidebar();
    const collapsedByBody = body.classList.contains('sidebar-collapsed') || body.classList.contains('fp-sidebar-collapsed');
    const collapsedBySidebar = sb && sb.classList.contains('collapsed');
    const collapsed = collapsedByBody || collapsedBySidebar;
    applyRuntimeVars(collapsed);
  }

  function toggleSidebar() {
    const sb = getPrimarySidebar();
    if (sb) {
      const nowCollapsed = sb.classList.toggle('collapsed');
      applyRuntimeVars(nowCollapsed);
    } else {
      // fallback: toggle body class
      const nowCollapsed = !body.classList.contains('sidebar-collapsed');
      body.classList.toggle('sidebar-collapsed', nowCollapsed);
      body.classList.toggle('fp-sidebar-collapsed', nowCollapsed);
      applyRuntimeVars(nowCollapsed);
    }
  }

  function initHamburger() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.hamburger-btn, .fp-hamburger');
      if (!btn) return;
      toggleSidebar();
    }, { capture: true });
  }

  function observeChanges() {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && (m.attributeName === 'class')) {
          // if a sidebar or body class changed, resync
          if (m.target === body || (m.target instanceof Element && (m.target.classList.contains('sidebar') || m.target.classList.contains('fp-sidebar')))) {
            syncFromDOM();
            return;
          }
        }
      }
    });
    observer.observe(document, { attributes: true, subtree: true, attributeOldValue: true, attributeFilter: ['class'] });
  }

  function init() {
    syncFromDOM();
    initHamburger();
    observeChanges();
    // ensure variables stay correct on resize (optional)
    window.addEventListener('resize', () => syncFromDOM());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
