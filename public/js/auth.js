// Global auth utilities
let currentUser = null;
let token = null;

function initAuth() {
  token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  if (userStr) currentUser = JSON.parse(userStr);
  
  // Check auth on protected pages
  if (!token || !currentUser) {
    window.location.href = 'login.html';
  }
  
  // Add logout to header if exists
  const logoutBtn = document.querySelector('.logout-btn') || document.createElement('button');
  logoutBtn.textContent = 'Logout';
  logoutBtn.className = 'logout-btn';
  logoutBtn.onclick = logout;
  logoutBtn.style.cssText = 'padding: 10px 20px; background: linear-gradient(135deg, #ff4757, #ff3838); border: none; border-radius: 25px; color: white; font-weight: 600; cursor: pointer; position: fixed; top: 20px; right: 20px; z-index: 1000;';
  document.body.appendChild(logoutBtn);
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

function apiCall(endpoint, options = {}) {
  return fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    ...options
  }).then(res => res.json());
}

// Export for use
window.initAuth = initAuth;
window.apiCall = apiCall;
window.logout = logout;
