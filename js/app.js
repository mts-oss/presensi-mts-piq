/* js/app.js */
import { store } from './store.js';
import { auth } from './auth.js';
import { DashboardPage } from './pages/dashboard.js';
import { PresensiPage }  from './pages/presensi.js';
import { DataPage }      from './pages/data.js';
import { LaporanPage }   from './pages/laporan.js';

// =========================================
// TOAST NOTIFICATIONS
// =========================================
export function toast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
window._toast = toast; // make globally accessible

// =========================================
// SVG ICONS (inline, no external dependency)
// =========================================
export const icons = {
  dashboard: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  presensi:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
  data:      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  laporan:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  logout:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  user:      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
};

// =========================================
// NAVIGATION CONFIG
// =========================================
const NAV = [
  { hash: 'dashboard', label: 'Dashboard', icon: 'dashboard', roles: ['admin','guru'] },
  { hash: 'presensi',  label: 'Presensi',  icon: 'presensi',  roles: ['guru','admin'] },
  { hash: 'data',      label: 'Data',      icon: 'data',       roles: ['admin'] },
  { hash: 'laporan',   label: 'Laporan',   icon: 'laporan',   roles: ['admin','guru'] },
];

const PAGES = {
  dashboard: DashboardPage,
  presensi:  PresensiPage,
  data:      DataPage,
  laporan:   LaporanPage,
};

// =========================================
// APP
// =========================================
const App = {
  init() {
    window.addEventListener('hashchange', () => this.route());
    window.addEventListener('cloud-sync-done', () => this.route());
    this.route();
  },

  route() {
    const user = auth.getCurrentUser();
    let hash = window.location.hash.replace('#','') || 'dashboard';

    if (!user) {
      this.showLogin();
      return;
    }
    if (hash === 'login') {
      window.location.hash = '#dashboard';
      return;
    }

    // Role guard
    const navItem = NAV.find(n => n.hash === hash);
    if (navItem && !navItem.roles.includes(user.role)) {
      hash = 'dashboard';
    }

    this.showShell(user);
    this.renderNav(hash, user);
    this.renderPage(hash);
  },

  showLogin() {
    document.getElementById('app-login').style.display = 'flex';
    document.getElementById('app-shell').style.display = 'none';
    this.renderLoginForm();
  },

  showShell(user) {
    document.getElementById('app-login').style.display = 'none';
    const shell = document.getElementById('app-shell');
    shell.style.display = 'flex';
    // Update user in header
    const initials = user.nama.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    document.getElementById('hdr-user-name').textContent = user.nama.split(' ')[0];
    document.getElementById('hdr-user-avatar').textContent = initials;
    document.getElementById('sidebar-user-name').textContent = user.nama;
    document.getElementById('sidebar-user-role').textContent = user.role === 'admin' ? 'Administrator' : 'Guru';
    document.getElementById('sidebar-avatar').textContent = initials;
  },

  renderNav(activeHash, user) {
    const sidebarNav = document.getElementById('sidebar-nav');
    const bottomNav  = document.getElementById('bottom-nav');

    const navHTML = NAV.filter(n => n.roles.includes(user.role)).map(n => `
      <a href="#${n.hash}" class="nav-item ${n.hash === activeHash ? 'active' : ''}" data-hash="${n.hash}">
        ${icons[n.icon]} ${n.label}
      </a>
    `).join('');

    const bottomHTML = NAV.filter(n => n.roles.includes(user.role)).map(n => `
      <a href="#${n.hash}" class="bottom-nav-item ${n.hash === activeHash ? 'active' : ''}" data-hash="${n.hash}">
        ${icons[n.icon]} <span>${n.label}</span>
      </a>
    `).join('');

    sidebarNav.innerHTML = navHTML;
    bottomNav.innerHTML  = bottomHTML;
  },

  renderPage(hash) {
    const container = document.getElementById('main-content');
    container.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    const Page = PAGES[hash];
    if (Page) {
      setTimeout(() => {
        container.innerHTML = '';
        Page.render(container);
      }, 60);
    } else {
      container.innerHTML = `
        <div class="card" style="text-align:center;padding:3rem">
          <p style="color:var(--alpa);font-weight:700">Halaman tidak ditemukan</p>
          <a href="#dashboard" class="btn btn-primary" style="margin-top:1rem">Kembali</a>
        </div>`;
    }
  },

  renderLoginForm() {
    const el = document.getElementById('app-login');
    el.innerHTML = `
      <div class="login-screen">
        <div class="login-box fade-in">
          <div class="login-logo">
            <div class="login-logo-mark">MTs</div>
            <h1>MTs PIQ Singosari</h1>
            <p>Sistem Presensi Siswa Online</p>
          </div>

          <form id="login-form">
            <div class="form-group">
              <label for="inp-kode">Kode Guru / Email Admin</label>
              <input type="text" id="inp-kode" class="form-control"
                placeholder="Contoh: G001 atau admin" autocomplete="username" required>
            </div>
            <div class="form-group" style="margin-bottom:1.25rem">
              <label for="inp-pass">Kata Sandi</label>
              <input type="password" id="inp-pass" class="form-control"
                placeholder="••••••••" autocomplete="current-password" required>
            </div>
            <div id="login-error" style="color:var(--alpa);font-size:0.8rem;margin-bottom:0.75rem;display:none"></div>
            <button type="submit" class="btn btn-primary" style="width:100%;height:44px">
              Masuk ke Sistem
            </button>
          </form>

          <div style="margin-top:1.25rem;padding:0.75rem;background:var(--primary-tint);border-radius:var(--radius-sm);font-size:0.72rem;color:var(--text-sub)">
            <strong style="color:var(--primary)">Akun Demo:</strong><br>
            Admin: <code>admin</code> / <code>admin123</code><br>
            Guru: <code>G001</code>–<code>G004</code> / <code>guru123</code>
          </div>

          <div class="login-footer">© 2026 MTs PIQ Singosari Malang</div>
        </div>
      </div>
    `;

    document.getElementById('login-form').addEventListener('submit', e => {
      e.preventDefault();
      const kode = document.getElementById('inp-kode').value;
      const pass = document.getElementById('inp-pass').value;
      const errEl = document.getElementById('login-error');
      const result = auth.login(kode, pass);
      if (result.success) {
        window.location.hash = '#dashboard';
      } else {
        errEl.textContent = result.message;
        errEl.style.display = 'block';
      }
    });
  }
};

// =========================================
// BOOT
// =========================================
document.addEventListener('DOMContentLoaded', () => {
  // Logout buttons
  document.getElementById('btn-logout-header')?.addEventListener('click', e => {
    e.preventDefault();
    if (confirm('Keluar dari sistem?')) auth.logout();
  });
  document.getElementById('btn-logout-sidebar')?.addEventListener('click', e => {
    e.preventDefault();
    if (confirm('Keluar dari sistem?')) auth.logout();
  });

  App.init();
});
