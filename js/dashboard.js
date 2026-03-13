// ===== DASHBOARD.JS - Full Task & User Management Logic =====

// State
let currentUser = null;
let currentFilter = 'all';
let currentCategory = 'all';
let currentSort = 'newest';
let searchQuery = '';
let currentView = 'tasks';

// Category color mapping
const CATEGORY_COLORS = [
  '#6366f1','#8b5cf6','#06b6d4','#10b981',
  '#f59e0b','#ef4444','#ec4899','#14b8a6'
];

const categoryColorMap = {};
let colorIndex = 0;

function getCategoryColor(cat) {
  if (!categoryColorMap[cat]) {
    categoryColorMap[cat] = CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length];
    colorIndex++;
  }
  return categoryColorMap[cat];
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Auth guard
  currentUser = Session.get();
  if (!currentUser) {
    window.location.href = 'index.html';
    return;
  }

  // Setup UI
  setupGreeting();
  setupSidebar();
  renderAll();
  setDate();
});

function setDate() {
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('headerDate').textContent = now.toLocaleDateString('vi-VN', opts);
}

function setupGreeting() {
  const hour = new Date().getHours();
  let greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  document.getElementById('headerGreeting').textContent = `${greeting}, ${currentUser.fullname} 👋`;
  document.getElementById('sidebarAvatar').textContent = currentUser.avatar || currentUser.fullname[0].toUpperCase();
  document.getElementById('sidebarName').textContent = currentUser.fullname;
  document.getElementById('sidebarRole').textContent = currentUser.role === 'admin' ? '⭐ Quản trị viên' : '👤 Người dùng';
}

function setupSidebar() {
  // Show users tab for admin
  if (currentUser.role === 'admin') {
    document.getElementById('navUsers').style.display = 'flex';
    document.getElementById('navUsers').removeAttribute('style');
    document.getElementById('navUsers').style.cssText = '';
  }
}

// ===== RENDER ALL =====
function renderAll() {
  renderStats();
  renderTaskList();
  renderCategoryFilters();
  updateBadges();
}

// ===== STATS =====
function renderStats() {
  const tasks = DB.getTasksByUser(currentUser.id, currentUser.role);
  const total = tasks.length;
  const pending = tasks.filter(t => t.status === 'todo').length;
  const progress = tasks.filter(t => t.status === 'inprogress').length;
  const done = tasks.filter(t => t.status === 'done').length;

  animateCounter('statTotal', total);
  animateCounter('statPending', pending);
  animateCounter('statProgress', progress);
  animateCounter('statDone', done);

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  document.getElementById('progressPct').textContent = pct + '%';
  document.getElementById('progressFill').style.width = pct + '%';
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  const start = parseInt(el.textContent) || 0;
  const diff = target - start;
  const duration = 500;
  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + diff * ease);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ===== CATEGORY FILTERS =====
function renderCategoryFilters() {
  const tasks = DB.getTasksByUser(currentUser.id, currentUser.role);
  const cats = [...new Set(tasks.map(t => t.category).filter(Boolean))];
  const container = document.getElementById('categoryFilters');

  container.innerHTML = `
    <button class="category-btn ${currentCategory === 'all' ? 'active' : ''}" onclick="filterCategory('all')">
      <div class="category-dot" style="background:#6366f1"></div>
      Tất cả
    </button>
  `;

  cats.forEach(cat => {
    const color = getCategoryColor(cat);
    const btn = document.createElement('button');
    btn.className = `category-btn ${currentCategory === cat ? 'active' : ''}`;
    btn.onclick = () => filterCategory(cat);
    btn.innerHTML = `<div class="category-dot" style="background:${color}"></div>${cat}`;
    container.appendChild(btn);
  });
}

function filterCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
  event.currentTarget.classList.add('active');
  renderTaskList();
}

// ===== TASK LIST =====
function getFilteredTasks() {
  let tasks = DB.getTasksByUser(currentUser.id, currentUser.role);

  // Category filter
  if (currentCategory !== 'all') {
    tasks = tasks.filter(t => t.category === currentCategory);
  }

  // Status filter
  if (currentFilter !== 'all') {
    tasks = tasks.filter(t => t.status === currentFilter);
  }

  // Search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    tasks = tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q)
    );
  }

  // Sort
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  tasks.sort((a, b) => {
    switch (currentSort) {
      case 'newest': return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
      case 'priority': return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
      case 'duedate':
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      default: return 0;
    }
  });

  return tasks;
}

function renderTaskList() {
  const tasks = getFilteredTasks();
  const listEl = document.getElementById('taskList');
  document.getElementById('tasksListTitle').textContent =
    `Công việc ${currentFilter !== 'all' ? '— ' + getStatusLabel(currentFilter) : ''} (${tasks.length})`;

  if (tasks.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>Không có công việc nào</h3>
        <p>${searchQuery ? 'Không tìm thấy công việc phù hợp với "' + searchQuery + '"' : 'Bắt đầu bằng cách thêm công việc mới!'}</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = tasks.map(task => renderTaskCard(task)).join('');

  // Add entrance animation
  listEl.querySelectorAll('.task-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(10px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, i * 50);
  });
}

function renderTaskCard(task) {
  const isCompleted = task.status === 'done';
  const catColor = getCategoryColor(task.category || 'Chung');
  const priorityLabel = { high: '🔴 Cao', medium: '🟡 Trung bình', low: '🟢 Thấp' }[task.priority] || task.priority;
  const statusLabel = getStatusLabel(task.status);
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'done';

  // Task owner info (for admin view)
  let ownerHtml = '';
  if (currentUser.role === 'admin' && task.userId !== currentUser.id) {
    const owner = DB.getUserById(task.userId);
    if (owner) {
      ownerHtml = `<span class="task-category" title="Được giao cho">
        <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 2c-4 0-6 1.8-6 2.7V14h12v-1.3C14 9.8 12 8 8 8z"/></svg>
        ${owner.fullname}
      </span>`;
    }
  }

  return `
    <div class="task-card priority-${task.priority} ${isCompleted ? 'completed' : ''}" id="taskCard_${task.id}">
      <div class="task-checkbox ${isCompleted ? 'checked' : ''}" onclick="toggleTaskDone('${task.id}', ${isCompleted})">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <div class="task-content">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta">
          <span class="task-badge priority-${task.priority}">${priorityLabel}</span>
          <span class="task-badge status-${task.status}">
            ${task.status === 'todo' ? '⏳' : task.status === 'inprogress' ? '⚡' : '✅'} ${statusLabel}
          </span>
          ${task.category ? `
            <span class="task-category">
              <div class="task-category-dot" style="background:${catColor}"></div>
              ${escapeHtml(task.category)}
            </span>
          ` : ''}
          ${task.dueDate ? `
            <span class="task-date ${isOverdue ? 'overdue' : ''}">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              ${isOverdue ? '⚠️ ' : ''}${formatDate(task.dueDate)}
            </span>
          ` : ''}
          ${ownerHtml}
        </div>
      </div>

      <div class="task-actions">
        <button class="action-btn edit" onclick="openTaskModal('${task.id}')" title="Sửa">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="action-btn delete" onclick="confirmDeleteTask('${task.id}')" title="Xoá">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function getStatusLabel(status) {
  return { todo: 'Chờ thực hiện', inprogress: 'Đang làm', done: 'Hoàn thành' }[status] || status;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== TASK ACTIONS =====
function toggleTaskDone(taskId, isCurrentlyDone) {
  const newStatus = isCurrentlyDone ? 'todo' : 'done';
  DB.updateTask(taskId, { status: newStatus });
  renderAll();
  showToast(newStatus === 'done' ? 'Đã hoàn thành công việc! 🎉' : 'Đã đánh dấu chưa xong', 'success');
}

// ===== TASK MODAL =====
let editingTaskId = null;

function openTaskModal(taskId = null) {
  editingTaskId = taskId;
  const modal = document.getElementById('taskModal');
  const form = document.getElementById('taskForm');
  form.reset();

  if (taskId) {
    const task = DB.getTasks().find(t => t.id === taskId);
    if (!task) return;
    document.getElementById('modalTitle').textContent = '✏️ Chỉnh sửa công việc';
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDesc').value = task.description || '';
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('taskCategory').value = task.category || '';
    document.getElementById('taskDueDate').value = task.dueDate || '';
  } else {
    document.getElementById('modalTitle').textContent = '➕ Thêm công việc mới';
    // Set default due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('taskDueDate').value = tomorrow.toISOString().slice(0, 10);
  }

  // Admin: show assign dropdown
  const assignGroup = document.getElementById('assignToGroup');
  if (currentUser.role === 'admin' && !taskId) {
    assignGroup.classList.remove('hidden');
    const users = DB.getUsers();
    const sel = document.getElementById('taskAssignTo');
    sel.innerHTML = users.map(u => `<option value="${u.id}">${u.fullname} (${u.username})</option>`).join('');
    sel.value = currentUser.id;
  } else {
    assignGroup.classList.add('hidden');
  }

  modal.classList.remove('hidden');
}

function closeTaskModal() {
  document.getElementById('taskModal').classList.add('hidden');
  editingTaskId = null;
}

function handleSaveTask(e) {
  e.preventDefault();
  const data = {
    title: document.getElementById('taskTitle').value,
    description: document.getElementById('taskDesc').value,
    priority: document.getElementById('taskPriority').value,
    status: document.getElementById('taskStatus').value,
    category: document.getElementById('taskCategory').value || 'Chung',
    dueDate: document.getElementById('taskDueDate').value
  };

  if (editingTaskId) {
    DB.updateTask(editingTaskId, data);
    showToast('Đã cập nhật công việc! ✅', 'success');
  } else {
    const assignTo = currentUser.role === 'admin'
      ? document.getElementById('taskAssignTo').value
      : currentUser.id;
    DB.createTask(data, assignTo);
    showToast('Đã thêm công việc mới! 🎉', 'success');
  }

  closeTaskModal();
  renderAll();
}

// ===== DELETE CONFIRM =====
let pendingDelete = null;

function confirmDeleteTask(taskId) {
  const task = DB.getTasks().find(t => t.id === taskId);
  if (!task) return;
  pendingDelete = { type: 'task', id: taskId };
  document.getElementById('confirmTitle').textContent = 'Xoá công việc?';
  document.getElementById('confirmMsg').textContent = `Bạn có chắc muốn xoá "${task.title}"? Hành động này không thể hoàn tác.`;
  document.getElementById('confirmOkBtn').onclick = () => {
    DB.deleteTask(taskId);
    closeConfirm();
    renderAll();
    showToast('Đã xoá công việc', 'info');
  };
  document.getElementById('confirmModal').classList.remove('hidden');
}

function confirmDeleteUser(userId) {
  const user = DB.getUserById(userId);
  if (!user) return;
  if (user.id === currentUser.id) {
    showToast('Không thể xoá tài khoản đang đăng nhập!', 'error');
    return;
  }
  pendingDelete = { type: 'user', id: userId };
  document.getElementById('confirmTitle').textContent = 'Xoá người dùng?';
  document.getElementById('confirmMsg').textContent = `Xoá "${user.fullname}" sẽ xoá tất cả công việc của họ!`;
  document.getElementById('confirmOkBtn').onclick = () => {
    DB.deleteUser(userId);
    closeConfirm();
    renderUsersView();
    renderStats();
    showToast('Đã xoá người dùng', 'info');
  };
  document.getElementById('confirmModal').classList.remove('hidden');
}

function closeConfirm() {
  document.getElementById('confirmModal').classList.add('hidden');
  pendingDelete = null;
}

// ===== USERS VIEW =====
function renderUsersView() {
  const users = DB.getUsers();
  const tasks = DB.getTasks();
  const grid = document.getElementById('usersGrid');
  document.getElementById('usersBadge').textContent = users.length;

  grid.innerHTML = users.map(user => {
    const userTasks = tasks.filter(t => t.userId === user.id);
    const done = userTasks.filter(t => t.status === 'done').length;
    const inprogress = userTasks.filter(t => t.status === 'inprogress').length;
    const pending = userTasks.filter(t => t.status === 'todo').length;
    const pct = userTasks.length > 0 ? Math.round((done / userTasks.length) * 100) : 0;

    return `
      <div class="user-card">
        <div class="user-card-header">
          <div class="user-card-avatar">${user.avatar || user.fullname[0]}</div>
          <div>
            <div class="user-card-name">${escapeHtml(user.fullname)}</div>
            <div class="user-card-username">@${user.username}</div>
          </div>
          <span class="user-role-badge ${user.role}" style="margin-left:auto">
            ${user.role === 'admin' ? '⭐ Admin' : '👤 User'}
          </span>
        </div>

        <div class="user-card-stats">
          <div class="mini-stat">
            <span class="mini-stat-val">${pending}</span>
            <span class="mini-stat-label">Chờ</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat-val">${inprogress}</span>
            <span class="mini-stat-label">Làm</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat-val">${done}</span>
            <span class="mini-stat-label">Xong</span>
          </div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-label">
            <span>Hoàn thành</span><span>${pct}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
        </div>

        ${user.id !== currentUser.id ? `
          <div class="user-card-actions">
            <button class="btn-danger" style="flex:1" onclick="confirmDeleteUser('${user.id}')">
              🗑️ Xoá tài khoản
            </button>
          </div>
        ` : `<div style="margin-top:12px; font-size:12px; color:var(--text-muted); text-align:center">👑 Tài khoản của bạn</div>`}
      </div>
    `;
  }).join('');
}

// ===== ADD USER MODAL =====
function openAddUserModal() {
  document.getElementById('addUserModal').classList.remove('hidden');
  document.getElementById('addUserError').classList.add('hidden');
}

function closeAddUserModal() {
  document.getElementById('addUserModal').classList.add('hidden');
}

function handleAddUser(e) {
  e.preventDefault();
  const fullname = document.getElementById('newUserFullname').value;
  const username = document.getElementById('newUserUsername').value;
  const password = document.getElementById('newUserPassword').value;
  const role = document.getElementById('newUserRole').value;
  const errEl = document.getElementById('addUserError');

  if (DB.getUserByUsername(username)) {
    errEl.textContent = '⚠️ Tên đăng nhập đã tồn tại';
    errEl.classList.remove('hidden');
    return;
  }

  if (password.length < 6) {
    errEl.textContent = '⚠️ Mật khẩu phải có ít nhất 6 ký tự';
    errEl.classList.remove('hidden');
    return;
  }

  const users = DB.getUsers();
  const newUser = {
    id: 'user_' + Date.now(),
    username: username.toLowerCase().trim(),
    password,
    fullname: fullname.trim(),
    role,
    createdAt: new Date().toISOString(),
    avatar: fullname.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  };
  users.push(newUser);
  DB.saveUsers(users);

  closeAddUserModal();
  renderUsersView();
  showToast('Đã tạo người dùng mới! 🎉', 'success');
}

// ===== NAVIGATION =====
function showView(view) {
  currentView = view;
  document.getElementById('tasksView').classList.toggle('hidden', view !== 'tasks');
  document.getElementById('usersView').classList.toggle('hidden', view !== 'users');
  document.getElementById('addTaskBtn').style.display = view === 'tasks' ? '' : 'none';
  document.getElementById('searchInput').parentElement.style.display = view === 'tasks' ? '' : 'none';

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  if (view === 'tasks') {
    document.getElementById('navTasks').classList.add('active');
    renderTaskList();
  } else {
    document.getElementById('navUsers').classList.add('active');
    renderUsersView();
  }
}

// ===== SEARCH & FILTER =====
function handleSearch(q) {
  searchQuery = q;
  renderTaskList();
}

function setFilter(status, btn) {
  currentFilter = status;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderTaskList();
}

function setSortBy(val) {
  currentSort = val;
  renderTaskList();
}

function updateBadges() {
  const tasks = DB.getTasksByUser(currentUser.id, currentUser.role);
  const pending = tasks.filter(t => t.status !== 'done').length;
  document.getElementById('tasksBadge').textContent = pending;

  if (currentUser.role === 'admin') {
    document.getElementById('usersBadge').textContent = DB.getUsers().length;
  }
}

// ===== LOGOUT =====
function logout() {
  Session.clear();
  window.location.href = 'index.html';
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = {
    success: '<path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="currentColor" stroke-width="1.5"/>',
    error: '<path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    info: '<path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    warning: '<path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="1.5"/>'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<svg viewBox="0 0 24 24" fill="none">${icons[type]}</svg>${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Close modals on overlay click
document.addEventListener('click', (e) => {
  if (e.target.id === 'taskModal') closeTaskModal();
  if (e.target.id === 'confirmModal') closeConfirm();
  if (e.target.id === 'addUserModal') closeAddUserModal();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeTaskModal();
    closeConfirm();
    closeAddUserModal();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('searchInput').focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    if (currentView === 'tasks') openTaskModal();
  }
});
