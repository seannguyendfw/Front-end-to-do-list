// ===== AUTH.JS - Authentication & User Management =====

const DB = {
  // Initialize default data
  init() {
    if (!localStorage.getItem('tf_users')) {
      const defaultUsers = [
        {
          id: 'user_admin',
          username: 'admin',
          password: 'admin123',
          fullname: 'Quản trị viên',
          role: 'admin',
          createdAt: new Date('2026-01-01').toISOString(),
          avatar: 'QT'
        },
        {
          id: 'user_demo',
          username: 'demo',
          password: 'demo123',
          fullname: 'Người dùng Demo',
          role: 'user',
          createdAt: new Date('2026-01-15').toISOString(),
          avatar: 'ND'
        }
      ];
      localStorage.setItem('tf_users', JSON.stringify(defaultUsers));
    }

    if (!localStorage.getItem('tf_tasks')) {
      const defaultTasks = [
        {
          id: 'task_1',
          userId: 'user_admin',
          title: 'Xây dựng giao diện dashboard',
          description: 'Thiết kế và phát triển giao diện người dùng cho trang quản lý',
          priority: 'high',
          status: 'done',
          category: 'Phát triển',
          dueDate: '2026-03-20',
          createdAt: new Date('2026-03-01').toISOString()
        },
        {
          id: 'task_2',
          userId: 'user_admin',
          title: 'Viết tài liệu API',
          description: 'Tạo tài liệu chi tiết cho các endpoint API của hệ thống',
          priority: 'medium',
          status: 'inprogress',
          category: 'Tài liệu',
          dueDate: '2026-03-25',
          createdAt: new Date('2026-03-05').toISOString()
        },
        {
          id: 'task_3',
          userId: 'user_admin',
          title: 'Kiểm tra bảo mật hệ thống',
          description: 'Thực hiện kiểm tra và vá các lỗ hổng bảo mật',
          priority: 'high',
          status: 'todo',
          category: 'Bảo mật',
          dueDate: '2026-03-30',
          createdAt: new Date('2026-03-08').toISOString()
        },
        {
          id: 'task_4',
          userId: 'user_demo',
          title: 'Học React hooks',
          description: 'Nghiên cứu và thực hành các React hooks nâng cao',
          priority: 'medium',
          status: 'inprogress',
          category: 'Học tập',
          dueDate: '2026-03-28',
          createdAt: new Date('2026-03-07').toISOString()
        },
        {
          id: 'task_5',
          userId: 'user_demo',
          title: 'Hoàn thiện dự án cuối kỳ',
          description: 'Nộp báo cáo và source code dự án',
          priority: 'high',
          status: 'todo',
          category: 'Dự án',
          dueDate: '2026-03-15',
          createdAt: new Date('2026-03-10').toISOString()
        }
      ];
      localStorage.setItem('tf_tasks', JSON.stringify(defaultTasks));
    }
  },

  // Users CRUD
  getUsers() {
    return JSON.parse(localStorage.getItem('tf_users') || '[]');
  },

  getUserById(id) {
    return this.getUsers().find(u => u.id === id);
  },

  getUserByUsername(username) {
    return this.getUsers().find(u => u.username === username.toLowerCase().trim());
  },

  saveUsers(users) {
    localStorage.setItem('tf_users', JSON.stringify(users));
  },

  createUser(data) {
    const users = this.getUsers();
    const newUser = {
      id: 'user_' + Date.now(),
      username: data.username.toLowerCase().trim(),
      password: data.password,
      fullname: data.fullname.trim(),
      role: 'user',
      createdAt: new Date().toISOString(),
      avatar: data.fullname.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    };
    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  },

  deleteUser(id) {
    const users = this.getUsers().filter(u => u.id !== id);
    this.saveUsers(users);
    // Also delete user's tasks
    const tasks = this.getTasks().filter(t => t.userId !== id);
    localStorage.setItem('tf_tasks', JSON.stringify(tasks));
  },

  // Tasks CRUD
  getTasks() {
    return JSON.parse(localStorage.getItem('tf_tasks') || '[]');
  },

  getTasksByUser(userId, role) {
    const tasks = this.getTasks();
    if (role === 'admin') return tasks;
    return tasks.filter(t => t.userId === userId);
  },

  saveTask(task) {
    const tasks = this.getTasks();
    const idx = tasks.findIndex(t => t.id === task.id);
    if (idx >= 0) {
      tasks[idx] = task;
    } else {
      tasks.push(task);
    }
    localStorage.setItem('tf_tasks', JSON.stringify(tasks));
  },

  deleteTask(id) {
    const tasks = this.getTasks().filter(t => t.id !== id);
    localStorage.setItem('tf_tasks', JSON.stringify(tasks));
  },

  createTask(data, userId) {
    const newTask = {
      id: 'task_' + Date.now(),
      userId,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      priority: data.priority || 'medium',
      status: data.status || 'todo',
      category: data.category?.trim() || 'Chung',
      dueDate: data.dueDate || '',
      createdAt: new Date().toISOString()
    };
    this.saveTask(newTask);
    return newTask;
  },

  updateTask(id, data) {
    const tasks = this.getTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx >= 0) {
      tasks[idx] = { ...tasks[idx], ...data, updatedAt: new Date().toISOString() };
      localStorage.setItem('tf_tasks', JSON.stringify(tasks));
      return tasks[idx];
    }
    return null;
  }
};

// ===== SESSION MANAGEMENT =====
const Session = {
  KEY: 'tf_session',

  set(user) {
    sessionStorage.setItem(this.KEY, JSON.stringify({
      id: user.id,
      username: user.username,
      fullname: user.fullname,
      role: user.role,
      avatar: user.avatar
    }));
  },

  get() {
    try {
      return JSON.parse(sessionStorage.getItem(this.KEY));
    } catch { return null; }
  },

  clear() {
    sessionStorage.removeItem(this.KEY);
  },

  isLoggedIn() {
    return !!this.get();
  }
};

// ===== AUTH FORM FUNCTIONS =====
function switchTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const indicator = document.getElementById('tabIndicator');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    indicator.classList.remove('right');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    loginTab.classList.remove('active');
    registerTab.classList.add('active');
    indicator.classList.add('right');
  }
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.querySelector('svg').innerHTML = '<path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  } else {
    input.type = 'password';
    btn.querySelector('svg').innerHTML = '<path d="M10 4C5.58 4 2 10 2 10s3.58 6 8 6 8-6 8-6-3.58-6-8-6zm0 10a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z" fill="currentColor"/>';
  }
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = '⚠️ ' + msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');

  btn.disabled = true;
  btn.querySelector('span').textContent = 'Đang kiểm tra...';

  setTimeout(() => {
    const user = DB.getUserByUsername(username);
    if (!user || user.password !== password) {
      showError('loginError', 'Tên đăng nhập hoặc mật khẩu không đúng');
      btn.disabled = false;
      btn.querySelector('span').textContent = 'Đăng nhập';
      return;
    }

    Session.set(user);
    btn.querySelector('span').textContent = 'Chuyển hướng...';
    window.location.href = 'dashboard.html';
  }, 800);
}

function handleRegister(e) {
  e.preventDefault();
  const fullname = document.getElementById('regFullname').value;
  const username = document.getElementById('regUsername').value;
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;
  const btn = document.getElementById('registerBtn');
  const errEl = document.getElementById('registerError');
  const successEl = document.getElementById('registerSuccess');

  errEl.classList.add('hidden');
  successEl.classList.add('hidden');

  // Validation
  if (username.length < 3) {
    showError('registerError', 'Tên đăng nhập phải có ít nhất 3 ký tự');
    return;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    showError('registerError', 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu _');
    return;
  }
  if (password.length < 6) {
    showError('registerError', 'Mật khẩu phải có ít nhất 6 ký tự');
    return;
  }
  if (password !== confirm) {
    showError('registerError', 'Mật khẩu xác nhận không khớp');
    return;
  }
  if (DB.getUserByUsername(username)) {
    showError('registerError', 'Tên đăng nhập này đã được sử dụng');
    return;
  }

  btn.disabled = true;
  btn.querySelector('span').textContent = 'Đang tạo tài khoản...';

  setTimeout(() => {
    DB.createUser({ fullname, username, password });
    successEl.textContent = '✅ Tạo tài khoản thành công! Chuyển sang đăng nhập...';
    successEl.classList.remove('hidden');
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Tạo tài khoản';

    setTimeout(() => {
      switchTab('login');
      document.getElementById('loginUsername').value = username;
    }, 1500);
  }, 800);
}

// Initialize DB on page load
DB.init();
