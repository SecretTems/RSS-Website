const API_BASE = '/api';
let token = localStorage.getItem('token');
let currentUser = null;
let currentPage = 'announcements';

// App Initialization
window.addEventListener('load', () => {
  if (token) {
    initializeApp();
  }
});

async function initializeApp() {
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('app-container').style.display = 'flex';

  setupEventListeners();
  await loadAnnouncements();
  await loadRooms();
  setupCalendar();
  setupNavigation();
  setupAccountSections();
}

function setupEventListeners() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  if (!validateEmail(email) || !password) {
    showAlert('Please enter valid email and password');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const data = await response.json();
      token = data.token;
      localStorage.setItem('token', token);
      initializeApp();
    } else {
      const error = await response.json();
      showAlert(error.message || 'Invalid email or password');
    }
  } catch (error) {
    showAlert('Error logging in');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const username = document.getElementById('signup-username').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm').value;

  if (!username || !validateEmail(email) || !password) {
    showAlert('Please fill in all fields correctly');
    return;
  }

  if (password !== confirmPassword) {
    showAlert('Passwords do not match');
    return;
  }

  if (password.length < 6) {
    showAlert('Password must be at least 6 characters');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, confirmPassword })
    });

    if (response.ok) {
      const data = await response.json();
      token = data.token;
      localStorage.setItem('token', token);
      initializeApp();
    } else {
      const error = await response.json();
      showAlert(error.message || 'Error creating account');
    }
  } catch (error) {
    showAlert('Error signing up');
  }
}

async function loadAnnouncements() {
  try {
    const response = await fetch(`${API_BASE}/announcements`);
    const announcements = await response.json();

    const container = document.getElementById('announcements-list');
    container.innerHTML = '';

    announcements.forEach(announcement => {
      const card = document.createElement('div');
      card.className = 'announcement-card';
      card.innerHTML = `
        <div class="announcement-card__header">
          <h3 class="announcement-card__title">${escapeHtml(announcement.title)}</h3>
          <span class="announcement-card__date">${formatDate(announcement.created_at)}</span>
        </div>
        <p class="announcement-card__content">${escapeHtml(announcement.content)}</p>
        <div class="announcement-card__footer">
          <button class="announcement-card__action" onclick="likeAnnouncement(${announcement.id})">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.82-.44-1.06L9.83 2 4.5 7.35C4.2 7.64 4 8.04 4 8.5v12c0 1.1.9 2 2 2h12c.83 0 1.54-.5 1.84-1.22l5.15-12.26c.12-.31.2-.65.2-1.02z"/>
            </svg>
            <span>${announcement.likes}</span>
          </button>
          <button class="announcement-card__action">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            <span>${announcement.comments}</span>
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading announcements:', error);
  }
}

async function likeAnnouncement(announcementId) {
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE}/announcements/${announcementId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      await loadAnnouncements();
    }
  } catch (error) {
    console.error('Error liking announcement:', error);
  }
}

async function loadRooms() {
  try {
    const response = await fetch(`${API_BASE}/rooms`);
    const rooms = await response.json();

    const container = document.getElementById('rooms-list');
    container.innerHTML = '';

    rooms.forEach(room => {
      const card = document.createElement('div');
      card.className = 'room-card';
      const statusClass = `room-card__status--${room.status}`;
      const statusText = room.status.charAt(0).toUpperCase() + room.status.slice(1);
      const buttonDisabled = room.status !== 'available';

      card.innerHTML = `
        <div class="room-card__image">
          <span class="room-card__status ${statusClass}">${statusText}</span>
        </div>
        <div class="room-card__content">
          <h3 class="room-card__name">${escapeHtml(room.room_name)}</h3>
          <button class="room-card__button ${buttonDisabled ? 'room-card__button--unavailable' : 'room-card__button--available'}"
                  onclick="bookRoom(${room.id})" ${buttonDisabled ? 'disabled' : ''}>
            ${buttonDisabled ? "Can't Book" : 'Book Now'}
          </button>
        </div>
      `;
      container.appendChild(card);
    });

    setupRoomSearch();
  } catch (error) {
    console.error('Error loading rooms:', error);
  }
}

function setupRoomSearch() {
  const searchInput = document.getElementById('room-search');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.room-card');

    cards.forEach(card => {
      const name = card.querySelector('.room-card__name').textContent.toLowerCase();
      card.style.display = name.includes(query) ? 'flex' : 'none';
    });
  });
}

function bookRoom(roomId) {
  if (!token) return;

  const now = new Date();
  const startTime = now.toISOString();
  const endTime = new Date(now.getTime() + 60 * 60000).toISOString();

  fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ roomId, startTime, endTime })
  })
  .then(r => r.json())
  .then(data => {
    showAlert('Room booked successfully!');
    loadRooms();
  })
  .catch(err => showAlert('Error booking room'));
}

function setupCalendar() {
  const prevBtn = document.getElementById('prev-month');
  const nextBtn = document.getElementById('next-month');

  if (prevBtn) prevBtn.addEventListener('click', () => renderCalendar(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => renderCalendar(1));

  renderCalendar(0);
}

let currentMonth = new Date();

function renderCalendar(offset) {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);

  const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  document.getElementById('month-year').textContent = monthYear;

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = currentMonth.getDay();

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  days.forEach(day => {
    const label = document.createElement('div');
    label.className = 'calendar__day-label';
    label.textContent = day;
    grid.appendChild(label);
  });

  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement('div'));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar__day';
    dayEl.textContent = day;
    dayEl.addEventListener('click', () => {
      document.querySelectorAll('.calendar__day--selected').forEach(d => {
        d.classList.remove('calendar__day--selected');
      });
      dayEl.classList.add('calendar__day--selected');
    });
    grid.appendChild(dayEl);
  }
}

function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn:not(.nav-btn--account)');

  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const page = btn.dataset.page;
      switchPage(page);
    });
  });

  const accountBtn = document.querySelector('.nav-btn--account');
  if (accountBtn) {
    accountBtn.addEventListener('click', () => switchPage('account'));
  }
}

function switchPage(page) {
  currentPage = page;

  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('page--active');
  });

  const pageEl = document.getElementById(`${page}-page`);
  if (pageEl) {
    pageEl.classList.add('page--active');
  }

  if (page === 'account') {
    loadProfile();
    loadHistory();
  }
}

function setupAccountSections() {
  const sidebarBtns = document.querySelectorAll('.sidebar-btn');

  sidebarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      switchAccountSection(section);
    });
  });
}

function switchAccountSection(section) {
  document.querySelectorAll('.section').forEach(s => {
    s.classList.remove('section--active');
  });

  const sectionEl = document.getElementById(`${section}-section`);
  if (sectionEl) {
    sectionEl.classList.add('section--active');
  }
}

async function loadProfile() {
  try {
    const response = await fetch(`${API_BASE}/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const user = await response.json();
      currentUser = user;
      document.getElementById('profile-username').value = user.username;
    }
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

async function loadHistory() {
  try {
    const response = await fetch(`${API_BASE}/bookings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const bookings = await response.json();
      const container = document.getElementById('history-list');

      if (bookings.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/>
            </svg>
            <p>No History</p>
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      bookings.forEach(booking => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
          <div class="history-item__info">
            <h3>${escapeHtml(booking.room_name)}</h3>
            <p class="history-item__time">${formatDate(booking.start_time)} to ${formatDate(booking.end_time)}</p>
          </div>
          <span class="history-item__status">${booking.status}</span>
        `;
        container.appendChild(item);
      });
    }
  } catch (error) {
    console.error('Error loading history:', error);
  }
}

function openChat() {
  const modal = document.getElementById('chat-modal');
  modal.classList.add('modal--active');
}

function closeChat() {
  const modal = document.getElementById('chat-modal');
  modal.classList.remove('modal--active');
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();

  if (!message || !token) return;

  addChatMessage(message, false);
  input.value = '';

  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });

    if (response.ok) {
      const data = await response.json();
      addChatMessage(data.response, true);
    }
  } catch (error) {
    addChatMessage('Error processing your message', true);
  }
}

function addChatMessage(text, isAI) {
  const container = document.getElementById('chat-messages');
  const msg = document.createElement('div');
  msg.className = isAI ? 'ai-message' : 'ai-message ai-message--user';
  msg.innerHTML = `<div class="ai-message__content">${escapeHtml(text)}</div>`;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

async function sendAIMessage() {
  const input = document.getElementById('ai-input');
  const message = input.value.trim();

  if (!message || !token) return;

  const container = document.getElementById('ai-messages');
  const userMsg = document.createElement('div');
  userMsg.className = 'ai-message ai-message--user';
  userMsg.innerHTML = `<div class="ai-message__content">${escapeHtml(message)}</div>`;
  container.appendChild(userMsg);

  input.value = '';

  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });

    if (response.ok) {
      const data = await response.json();
      const aiMsg = document.createElement('div');
      aiMsg.className = 'ai-message';
      aiMsg.innerHTML = `<div class="ai-message__content">${escapeHtml(data.response)}</div>`;
      container.appendChild(aiMsg);
      container.scrollTop = container.scrollHeight;
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

function logout() {
  localStorage.removeItem('token');
  token = null;
  location.reload();
}

async function deleteAccount() {
  if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/profile`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      logout();
    } else {
      showAlert('Error deleting account');
    }
  } catch (error) {
    showAlert('Error deleting account');
  }
}

function switchToLogin(e) {
  e.preventDefault();
  document.getElementById('login-page').classList.add('page--active');
  document.getElementById('signup-page').classList.remove('page--active');
}

function switchToSignup(e) {
  e.preventDefault();
  document.getElementById('signup-page').classList.add('page--active');
  document.getElementById('login-page').classList.remove('page--active');
}

function showAlert(message) {
  const modal = document.getElementById('alert-modal');
  document.getElementById('alert-message').textContent = message;
  modal.classList.add('alert-modal--active');
}

function closeAlert() {
  document.getElementById('alert-modal').classList.remove('alert-modal--active');
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('click', (e) => {
  const modal = document.getElementById('chat-modal');
  if (e.target === modal.querySelector('.modal__backdrop')) {
    closeChat();
  }

  const alertModal = document.getElementById('alert-modal');
  if (e.target === alertModal.querySelector('.alert-modal__backdrop')) {
    closeAlert();
  }
});

const profileForm = document.getElementById('profile-form');
if (profileForm) {
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('profile-username').value;

    try {
      const response = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      });

      if (response.ok) {
        showAlert('Profile updated successfully');
      } else {
        showAlert('Error updating profile');
      }
    } catch (error) {
      showAlert('Error updating profile');
    }
  });
}
