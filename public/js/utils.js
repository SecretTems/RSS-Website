/*
  RRS — Shared Utilities (Fixed JSON parse error)
*/
const API_BASE = '/api';

/* HTTP Helper - FIXED: Check status BEFORE json() to handle HTML error pages */
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('rrs_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { 
    ...options, 
    headers, 
    credentials: 'include' 
  });

  let data;
  let errorMsg = 'An unknown error occurred';

  if (!res.ok) {
    try {
      data = await res.json();
      errorMsg = data.errors ? 
        data.errors.map(e => e.msg).join(', ') : 
        data.message || 'Server responded with error';
    } catch (parseErr) {
      // Non-JSON response (HTML error page), use text preview
      const text = await res.text();
      errorMsg = text.includes('server error') || text.includes('error') ? 
        'Server error (check console)' : 
        text.slice(0, 100) + '...';
    }
    throw new Error(errorMsg);
  }

  // Success path
  data = await res.json();
  return data;
}

/* Auth */
function getUser() {
  try { return JSON.parse(localStorage.getItem('rrs_user')); } catch { return null; }
}

function setUser(user, token) {
  localStorage.setItem('rrs_user', JSON.stringify(user));
  if (token) localStorage.setItem('rrs_token', token);
}

function clearUser() {
  localStorage.removeItem('rrs_user');
  localStorage.removeItem('rrs_token');
}

function getIsAdmin() {
  const user = getUser();
  return user?.role === 'admin';
}

function requireAuth() {
  const user = getUser();
  if (!user) {
    showLoginPrompt();
    return null; 
  }
  return user;
}

function showLoginPrompt() {
  const overlay = document.getElementById('login-prompt-overlay');
  if (overlay) overlay.classList.add('modal-overlay--visible');
}

/* Toast */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { 
    toast.style.opacity = '0'; 
    toast.style.transition = 'opacity 0.3s'; 
    setTimeout(() => toast.remove(), 300); 
  }, 3500);
}

function createToastContainer() {
  const div = document.createElement('div');
  div.id = 'toast-container';
  div.className = 'toast-container';
  document.body.appendChild(div);
  return div;
}

/* Navbar */
function initNavbar(activePage) {
  const user = getUser();
  const avatar = document.getElementById('navbar-avatar');
  const hamburger = document.getElementById('navbar-hamburger');
  const nav = document.getElementById('navbar-nav');

  document.querySelectorAll('.navbar__link').forEach(link => {
    link.classList.remove('navbar__link--active');
    if (link.dataset.page === activePage) link.classList.add('navbar__link--active');
  });

  if (avatar && user && user.profilePhoto) {
    avatar.innerHTML = `<img src="${user.profilePhoto}" alt="avatar">`;
  }

  if (hamburger && nav) {
    hamburger.addEventListener('click', () => nav.classList.toggle('navbar__nav--open'));
  }

  if (!user && activePage !== 'login' && activePage !== 'signup') {
    showLoginPrompt();
  }
}

/* Format Date */
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* Loading state on button */
function setLoading(btn, loading) {
  if (loading) {
    btn.disabled = true;
    btn._originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Loading...';
  } else {
    btn.disabled = false;
    btn.innerHTML = btn._originalText || btn.innerHTML;
    btn._originalText = null;
  }
}

/**
 * Render pagination UI: < 1 [2] 3 > [INPUT]
 * @param {string} containerId - ID of container to append paginator
 * @param {number} currentPage 
 * @param {number} totalPages 
 * @param {string} baseUrl - Base API URL e.g. '/announcements'
 * @param {function} reloadFn - Callback to reload data with new page
 */
function renderPaginator(containerId, currentPage, totalPages, baseUrl, reloadFn) {
  if (totalPages <= 1) return;

  const container = document.getElementById(containerId);
  if (!container) return;

  let pagesHtml = '';
  const maxVisible = 5;
  const startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);

  // Previous button
  pagesHtml += `<button class="paginator__btn" ${currentPage === 1 ? 'disabled' : ''} onclick="${currentPage > 1 ? `loadPage(${currentPage-1})` : ''}">‹ Prev</button>`;

  // Page numbers
  if (startPage > 1) pagesHtml += `<span class="paginator__page" onclick="loadPage(1)">1</span>`;
  if (startPage > 2) pagesHtml += '<span>...</span>';

  for (let i = startPage; i <= endPage; i++) {
    pagesHtml += `<span class="paginator__page ${i === currentPage ? 'paginator__page--active' : ''}" onclick="loadPage(${i})">${i}</span>`;
  }

  if (endPage < totalPages - 1) pagesHtml += '<span>...</span>';
  if (endPage < totalPages) pagesHtml += `<span class="paginator__page" onclick="loadPage(${totalPages})">${totalPages}</span>`;

  // Next button
  pagesHtml += `<button class="paginator__btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="${currentPage < totalPages ? `loadPage(${currentPage+1})` : ''}">Next ›</button>`;

  // Jump input
  pagesHtml += `
    <span style="font-size:0.85rem;opacity:0.8;">Go to</span>
    <input class="paginator__input" type="number" min="1" max="${totalPages}" value="${currentPage}" onchange="loadPage(this.value)" style="width:55px;">
    <span style="font-size:0.85rem;opacity:0.8;">of ${totalPages}</span>
  `;

  container.innerHTML = `<div class="paginator">${pagesHtml}</div>`;
}

// Global loadPage helper (will be set per page)
window.loadPage = (page) => {
  // Override in page-specific code
  console.log('Page change to:', page);
};

