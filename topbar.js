// =============================================================
// Persistent dashboard sidebar navigation.
// Drop this on any page with:
//     <script src="topbar.js" defer></script>
// Self-injects sidebar HTML + CSS, reads progress from the same
// localStorage keys the dashboard already uses, and handles
// mobile hamburger toggle + Supabase water sync.
// =============================================================
(function () {
  'use strict';

  const TOPBAR_SUPABASE_URL = 'https://qcfkihqbnviixdyozjdt.supabase.co';
  const TOPBAR_SUPABASE_KEY = 'sb_publishable_lyyriM6T3NkqUDIcPpT2Xw_AKUXJoc-';

  // -------- CSS --------
  const css = `
/* ===== Sidebar ===== */
.sidebar {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: 220px;
  z-index: 40;
  background: #0a0a0b;
  border-right: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  padding: max(16px, env(safe-area-inset-top)) 10px max(16px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left));
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-brand {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.28);
  padding: 4px 10px 20px;
  flex-shrink: 0;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  border-radius: 10px;
  text-decoration: none;
  color: rgba(255,255,255,0.52);
  border: 1px solid transparent;
  background: transparent;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.sidebar-item:hover {
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.85);
}
.sidebar-item.active {
  background: rgba(255,255,255,0.07);
  border-color: rgba(255,255,255,0.09);
  color: #fafafa;
}

.sidebar-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #6ee7b7;
  flex-shrink: 0;
}
.sidebar-item.warn .sidebar-dot,
.sidebar-water-link.warn .sidebar-dot { background: #fbbf24; }
.sidebar-item.miss .sidebar-dot,
.sidebar-water-link.miss .sidebar-dot {
  background: #ff8a8a;
  animation: sb-miss-pulse 1.6s ease-in-out infinite;
}
@keyframes sb-miss-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
  50%       { box-shadow: 0 0 0 5px rgba(239,68,68,0); }
}

.sidebar-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  flex: 1;
}

.sidebar-count {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 11px;
  font-weight: 700;
  color: #fafafa;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Water row: nav link + quick-add button */
.sidebar-water-row {
  display: flex;
  align-items: stretch;
}
.sidebar-water-link {
  flex: 1; min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 8px 9px 10px;
  border-radius: 10px 0 0 10px;
  text-decoration: none;
  color: rgba(255,255,255,0.52);
  border: 1px solid transparent;
  border-right: none;
  background: transparent;
  transition: background 0.15s, color 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.sidebar-water-link:hover { background: rgba(125,211,252,0.07); color: rgba(255,255,255,0.85); }
.sidebar-water-link.active {
  background: rgba(125,211,252,0.08);
  border-color: rgba(125,211,252,0.16);
  color: #fafafa;
}
.sidebar-water-link .sidebar-dot { background: #7DD3FC; }

.sidebar-water-add {
  flex: 0 0 34px;
  border: 1px solid rgba(125,211,252,0.16);
  border-left: none;
  background: linear-gradient(180deg, rgba(125,211,252,0.15), rgba(110,231,183,0.15));
  color: #fff;
  font-size: 18px; font-weight: 700;
  cursor: pointer;
  border-radius: 0 10px 10px 0;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, transform 0.10s;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
}
.sidebar-water-add:hover {
  background: linear-gradient(180deg, rgba(125,211,252,0.28), rgba(110,231,183,0.28));
}
.sidebar-water-add:active { transform: scale(0.90); }
.sidebar-water-add.flash {
  background: linear-gradient(180deg, rgba(125,211,252,0.55), rgba(110,231,183,0.55));
}

/* ===== Hamburger toggle — mobile only ===== */
.sidebar-toggle {
  display: none;
  position: fixed;
  top: max(10px, env(safe-area-inset-top));
  left: max(10px, env(safe-area-inset-left));
  z-index: 50;
  width: 38px; height: 38px;
  background: rgba(10,10,11,0.92);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 10px;
  cursor: pointer;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: background 0.15s;
}
.sidebar-toggle:hover { background: rgba(36,36,40,0.96); }
.sidebar-toggle-bar {
  width: 16px; height: 1.5px;
  background: rgba(255,255,255,0.75);
  border-radius: 2px;
}

/* ===== Overlay — mobile only ===== */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 39;
  -webkit-tap-highlight-color: transparent;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}
.sidebar-overlay.is-open { display: block; }

/* ===== Desktop: push body right by sidebar width ===== */
/* Scoped to min-width so it never fights mobile pages' own left padding */
@media (min-width: 769px) {
  body.has-sidebar {
    padding-left: 220px;
  }
}

/* ===== Mobile: sidebar off-screen until toggled ===== */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    box-shadow: none;
  }
  .sidebar.is-open {
    transform: translateX(0);
    box-shadow: 6px 0 28px rgba(0,0,0,0.45);
  }
  .sidebar-toggle {
    display: flex;
  }
}

/* ===== Global mobile polish (carried over from old topbar) ===== */
html, body { -webkit-text-size-adjust: 100%; }
@media (max-width: 768px) {
  html { touch-action: pan-y; }
  ::-webkit-scrollbar { width: 0; height: 0; display: none; }
  html, body { scrollbar-width: none; -ms-overflow-style: none; }
}
.modal-bg, .modal, .po-modal-bg, .po-modal, .wt-overlay, .wt-viewer {
  overscroll-behavior: contain;
}
body.topbar-modal-open { overflow: hidden; touch-action: none; }
@media (max-width: 480px) {
  .modal-bg, .po-modal-bg {
    padding: 0 !important;
    align-items: stretch !important;
    justify-content: stretch !important;
  }
  .modal, .po-modal {
    width: 100% !important;
    max-width: 100% !important;
    max-height: 100vh !important;
    height: 100vh !important;
    border-radius: 0 !important;
    padding-top: max(20px, env(safe-area-inset-top)) !important;
    padding-bottom: max(28px, env(safe-area-inset-bottom)) !important;
    overflow-y: auto !important;
    overscroll-behavior: contain;
  }
}
`;

  // -------- HTML --------
  const html = `
<aside class="sidebar" id="sidebar" role="navigation" aria-label="Dashboard navigation">
  <div class="sidebar-brand">Row</div>
  <nav class="sidebar-nav">
    <a href="index.html" class="sidebar-item" id="sidebarGoals">
      <span class="sidebar-dot"></span>
      <span class="sidebar-label">Goals</span>
      <span class="sidebar-count" id="sidebarGoalsCount">—/—</span>
    </a>
    <a href="health.html" class="sidebar-item" id="sidebarStack">
      <span class="sidebar-dot"></span>
      <span class="sidebar-label">Stack</span>
      <span class="sidebar-count" id="sidebarStackCount">—/—</span>
    </a>
    <div class="sidebar-water-row">
      <a href="health.html#water" class="sidebar-water-link" id="sidebarWater">
        <span class="sidebar-dot"></span>
        <span class="sidebar-label">Water</span>
        <span class="sidebar-count" id="sidebarWaterCount">—/—</span>
      </a>
      <button class="sidebar-water-add" id="sidebarWaterAdd" aria-label="Log one drink" type="button">+</button>
    </div>
    <a href="gym.html" class="sidebar-item" id="sidebarGym">
      <span class="sidebar-dot"></span>
      <span class="sidebar-label">Gym</span>
    </a>
    <a href="finance.html" class="sidebar-item" id="sidebarFinance">
      <span class="sidebar-dot"></span>
      <span class="sidebar-label">Finance</span>
    </a>
  </nav>
</aside>
<button class="sidebar-toggle" id="sidebarToggle" aria-label="Open navigation" aria-expanded="false" type="button">
  <span class="sidebar-toggle-bar"></span>
  <span class="sidebar-toggle-bar"></span>
  <span class="sidebar-toggle-bar"></span>
</button>
<div class="sidebar-overlay" id="sidebarOverlay"></div>
`;

  function injectStyleAndHTML() {
    if (document.getElementById('sidebar')) return;
    const style = document.createElement('style');
    style.id = 'sidebar-style';
    style.textContent = css;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'sidebar-root';
    root.innerHTML = html.trim();
    document.body.insertBefore(root, document.body.firstChild);
    document.body.classList.add('has-sidebar');
  }

  // -------- Date helpers (match the goals page 6 AM rollover) --------
  function activeDateKey() {
    const now = new Date();
    const d = new Date(now);
    if (now.getHours() < 6) d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function calendarDateKey() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // -------- Progress readers --------
  function getGoalsProgress() {
    let goals = [];
    try { goals = JSON.parse(localStorage.getItem('goals:' + activeDateKey())) || []; } catch (e) {}
    const total = Array.isArray(goals) ? goals.length : 0;
    const done = total ? goals.filter(g => g && g.done).length : 0;
    return { done, total };
  }
  function getStackProgress() {
    let items = [];
    try { items = JSON.parse(localStorage.getItem('stack:items')) || []; } catch (e) {}
    let taken = {};
    try { taken = JSON.parse(localStorage.getItem('stack:taken:' + activeDateKey())) || {}; } catch (e) {}
    const total = Array.isArray(items) ? items.length : 0;
    const done = total ? items.filter(i => i && taken[i.id]).length : 0;
    return { done, total };
  }
  function getWaterProgress() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state) return { done: 0, total: 0 };
    const done = (state.logs || {})[calendarDateKey()] || 0;
    const p = state.profile || { weightKg: 75 };
    const wKg = state.weightUnit === 'lb' ? (p.weightKg || 0) / 2.20462 : (p.weightKg || 0);
    const base = wKg * 35;
    const exercise = (p.activityHrsPerWeek || 0) / 7 * 500;
    const caffeine = Math.max(0, (state.caffeineMgPerDay || 0) - 200) * 1.5;
    const subs = (state.substances || []).reduce((s, x) => {
      const dose = (x && x.dose != null ? x.dose : (x && x.defaultDose)) || 0;
      return s + Math.max(0, dose * ((x && x.mlPerUnit) || 0));
    }, 0);
    let adjust = 0;
    if (p.sex === 'm') adjust += 200;
    if ((p.age || 0) >= 50) adjust += 100;
    const totalMl = base + exercise + caffeine + subs + adjust;
    let unitVol;
    if (state.unit === 'glass') unitVol = state.glassMl || 250;
    else if (state.unit === 'oz') unitVol = 30;
    else if (state.unit === 'ml') unitVol = 1;
    else unitVol = state.bottleMl || 500;
    return { done, total: Math.max(1, Math.ceil(totalMl / unitVol)) };
  }

  function classifyStatus(done, total) {
    if (total === 0) return 'idle';
    if (done >= total) return 'good';
    if (new Date().getHours() >= 18 && done < total * 0.5) return 'miss';
    return 'warn';
  }
  function setItemStatus(el, status) {
    el.classList.remove('good', 'warn', 'miss');
    if (status === 'warn' || status === 'miss') el.classList.add(status);
  }

  function render() {
    const goalsEl = document.getElementById('sidebarGoals');
    const stackEl = document.getElementById('sidebarStack');
    const waterEl = document.getElementById('sidebarWater');
    if (!goalsEl) return;
    const g = getGoalsProgress();
    const s = getStackProgress();
    const w = getWaterProgress();
    document.getElementById('sidebarGoalsCount').textContent = g.total ? g.done + '/' + g.total : '0/0';
    document.getElementById('sidebarStackCount').textContent = s.total ? s.done + '/' + s.total : '0/0';
    document.getElementById('sidebarWaterCount').textContent = w.total ? w.done + '/' + w.total : '0/0';
    setItemStatus(goalsEl, classifyStatus(g.done, g.total));
    setItemStatus(stackEl, classifyStatus(s.done, s.total));
    setItemStatus(waterEl, classifyStatus(w.done, w.total));
  }

  // -------- Active page highlight --------
  function setActivePage() {
    const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const map = {
      'index.html': 'sidebarGoals',
      '':           'sidebarGoals',
      'health.html': 'sidebarStack',
      'po-water.html': 'sidebarWater',
      'gym.html':    'sidebarGym',
      'finance.html': 'sidebarFinance',
    };
    const id = map[page];
    if (id) { const el = document.getElementById(id); if (el) el.classList.add('active'); }
  }

  // -------- Water +1 (works from any page) --------
  function defaultWaterState() {
    return {
      unit: 'bottle', bottleMl: 500, glassMl: 250, weightUnit: 'kg',
      profile: { weightKg: 75, age: 25, sex: 'm', activityHrsPerWeek: 5 },
      caffeineMgPerDay: 200, substances: [], logs: {}
    };
  }
  async function pushWaterMergedToSupabase(localWater) {
    if (window.location.pathname.endsWith('health.html')) return;
    if (!window.supabase || !TOPBAR_SUPABASE_URL || !TOPBAR_SUPABASE_KEY) return;
    if (TOPBAR_SUPABASE_URL.indexOf('PASTE-') === 0) return;
    try {
      const supa = window.supabase.createClient(TOPBAR_SUPABASE_URL, TOPBAR_SUPABASE_KEY);
      const { data } = await supa.from('app_state').select('data').eq('key', 'health').maybeSingle();
      const merged = Object.assign({}, (data && data.data) || {}, { po_water_v1: localWater });
      await supa.from('app_state').upsert(
        { key: 'health', data: merged, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    } catch (e) {}
  }
  function addWater() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state || typeof state !== 'object') state = defaultWaterState();
    state.logs = state.logs || {};
    const k = calendarDateKey();
    state.logs[k] = (state.logs[k] || 0) + 1;
    try { localStorage.setItem('po_water_v1', JSON.stringify(state)); } catch (e) {}
    render();
    const btn = document.getElementById('sidebarWaterAdd');
    if (btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 220); }
    pushWaterMergedToSupabase(state);
  }

  // -------- Sidebar toggle --------
  function initToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggle  = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar || !toggle || !overlay) return;

    function open()  {
      sidebar.classList.add('is-open');
      overlay.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }
    function close() {
      sidebar.classList.remove('is-open');
      overlay.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', () => sidebar.classList.contains('is-open') ? close() : open());
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    sidebar.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => { if (window.innerWidth <= 768) close(); });
    });
  }

  // -------- Mobile lockdown helpers --------
  function blockGesture(e) { e.preventDefault(); }
  function lockGestures() {
    document.addEventListener('gesturestart',  blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend',    blockGesture, { passive: false });
    let lastTouch = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });
  }
  function startModalLock() {
    const SELECTORS = ['.modal-bg', '.po-modal-bg', '.wt-overlay', '.wt-viewer', '.wt-cam'];
    function anyOpen() {
      for (const sel of SELECTORS) {
        for (const el of document.querySelectorAll(sel)) {
          if (el.classList.contains('show') || el.classList.contains('is-open')) return true;
        }
      }
      return false;
    }
    function sync() { document.body.classList.toggle('topbar-modal-open', anyOpen()); }
    new MutationObserver(sync).observe(document.body, {
      attributes: true, attributeFilter: ['class'], subtree: true
    });
    sync();
  }

  // -------- Boot --------
  function boot() {
    injectStyleAndHTML();
    setActivePage();
    initToggle();

    const btn = document.getElementById('sidebarWaterAdd');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); addWater(); });

    render();
    lockGestures();
    startModalLock();

    window.addEventListener('storage', render);
    window.addEventListener('focus', render);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
    setInterval(render, 30 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
