/**
 * Admin module — user management, backup/restore.
 */
const Users = {
  async load() {
    try {
      const data = await API.get('/api/users');
      this.render(data.data.users);
    } catch (err) {
      Toast.show('Failed to load users: ' + err.message, 'error');
    }
  },

  render(users) {
    const el = document.getElementById('users-table-body');
    if (!el) return;
    const roleColors = { Admin: '#7c3aed', Manager: '#06b6d4', Cashier: '#84cc16' };
    const roleIcons = {
      Admin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      Manager: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v3"/></svg>',
      Cashier: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>'
    };
    el.innerHTML = users.map(u => {
      const color = roleColors[u.role] || '#6b7280';
      const initials = u.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:0.7rem">
            <div style="width:36px;height:36px;border-radius:10px;background:${color}15;color:${color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;flex-shrink:0">${initials}</div>
            <div>
              <div style="font-weight:600;color:var(--text)">${u.username}</div>
              <div style="font-size:0.78rem;color:var(--text-3)">${u.fullName}</div>
            </div>
          </div>
        </td>
        <td>
          <span style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.25rem 0.65rem;border-radius:20px;font-size:0.75rem;font-weight:700;background:${color}12;color:${color};border:1px solid ${color}25">
            ${roleIcons[u.role] || ''} ${u.role}
          </span>
        </td>
        <td>
          ${u.isActive
            ? '<span style="display:inline-flex;align-items:center;gap:0.3rem;font-size:0.78rem;font-weight:600;color:#10b981"><span style="width:7px;height:7px;border-radius:50%;background:#10b981;display:inline-block;box-shadow:0 0 6px rgba(16,185,129,0.4)"></span> Active</span>'
            : '<span style="display:inline-flex;align-items:center;gap:0.3rem;font-size:0.78rem;font-weight:600;color:#ef4444"><span style="width:7px;height:7px;border-radius:50%;background:#ef4444;display:inline-block"></span> Inactive</span>'
          }
        </td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="Users.showEdit('${u._id}', '${u.username}', '${u.fullName}', '${u.role}')" style="border-radius:8px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
        </td>
      </tr>`;
    }).join('');
  },

  showCreate() {
    document.getElementById('user-modal-title').textContent = 'Create User';
    document.getElementById('user-form').reset();
    document.getElementById('user-id').value = '';
    document.getElementById('user-password-group').style.display = 'block';
    document.getElementById('user-modal').style.display = 'flex';
  },

  showEdit(id, username, fullName, role) {
    document.getElementById('user-modal-title').textContent = 'Edit User';
    document.getElementById('user-id').value = id;
    document.getElementById('user-username').value = username;
    document.getElementById('user-fullname').value = fullName;
    document.getElementById('user-role').value = role;
    document.getElementById('user-password').value = '';
    document.getElementById('user-password-group').style.display = 'block';
    document.getElementById('user-modal').style.display = 'flex';
  },

  closeModal() {
    document.getElementById('user-modal').style.display = 'none';
  },

  async save() {
    const id = document.getElementById('user-id').value;
    const body = {
      username: document.getElementById('user-username').value.trim(),
      fullName: document.getElementById('user-fullname').value.trim(),
      role: document.getElementById('user-role').value,
    };
    const pw = document.getElementById('user-password').value;
    if (pw) body.password = pw;

    try {
      if (id) {
        await API.put(`/api/users/${id}`, body);
        Toast.show('User updated');
      } else {
        if (!pw) { Toast.show('Password is required', 'warning'); return; }
        await API.post('/api/users', body);
        Toast.show('User created');
      }
      this.closeModal();
      this.load();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }
};

const Backup = {
  async load() {
    // Nothing to preload — just show the page
  },

  async createBackup() {
    try {
      const data = await API.post('/api/backup');
      Toast.show('Backup created: ' + data.data.filePath);
    } catch (err) {
      Toast.show('Backup failed: ' + err.message, 'error');
    }
  },

  async exportTable() {
    const table = document.getElementById('export-table').value;
    if (!table) return;
    window.open(`/api/export/${table}`, '_blank');
  }
};
