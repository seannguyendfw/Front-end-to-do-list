// ===== APP.JS - Entry point for auth page =====
// Redirect to dashboard if already logged in
document.addEventListener('DOMContentLoaded', () => {
  if (Session.isLoggedIn()) {
    window.location.href = 'dashboard.html';
  }
});
