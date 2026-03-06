// ═══════════════════════════════════════════
// PortPolice - Renderer (Frontend Logic)
// ═══════════════════════════════════════════

let allPorts = [];
let currentFilter = 'all';
let currentSort = { field: 'port', dir: 'asc' };
let searchQuery = '';
let autoRefreshTimer = null;
let pendingKill = null;
let selectedPort = null;
let currentBrowserFilter = 'all';

// ─── DOM Elements ───
const $ = (sel) => document.querySelector(sel);
const tableBody = $('#port-table-body');
const loadingState = $('#loading-state');
const emptyState = $('#empty-state');
const searchInput = $('#search-input');
const toastContainer = $('#toast-container');
const confirmModal = $('#confirm-modal');
const detailPanel = $('#detail-panel');
const detailBody = $('#detail-body');

// ─── Window Controls ───
$('#btn-minimize').addEventListener('click', () => window.portPolice.minimize());
$('#btn-maximize').addEventListener('click', () => window.portPolice.maximize());
$('#btn-close').addEventListener('click', () => window.portPolice.close());

// ─── Search ───
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.toLowerCase().trim();
  renderTable();
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
  if (e.key === 'Escape') {
    const qlModal = document.getElementById('quick-launch-modal');
    if (qlModal && !qlModal.classList.contains('hidden')) {
      qlModal.classList.add('hidden');
    } else if (!confirmModal.classList.contains('hidden')) {
      hideModal();
    } else if (!detailPanel.classList.contains('hidden')) {
      closeDetailPanel();
    } else {
      searchInput.value = '';
      searchQuery = '';
      searchInput.blur();
      renderTable();
    }
  }
});

// ─── Refresh Button ───
$('#btn-refresh').addEventListener('click', () => refreshPorts());

// ─── Filter Buttons ───
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTable();
  });
});

// ─── Browser Filter ───
document.querySelectorAll('.browser-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.browser-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentBrowserFilter = btn.dataset.browser;
    renderTable();
  });
});

// ─── Sort Headers ───
document.querySelectorAll('.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const field = th.dataset.sort;
    if (currentSort.field === field) {
      currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      currentSort.field = field;
      currentSort.dir = 'asc';
    }
    document.querySelectorAll('.sortable').forEach(t => t.classList.remove('active'));
    th.classList.add('active');
    th.querySelector('.sort-arrow').textContent = currentSort.dir === 'asc' ? '↑' : '↓';
    renderTable();
  });
});

// ─── Auto Refresh ───
$('#auto-refresh-toggle').addEventListener('change', (e) => {
  if (e.target.checked) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
});

$('#refresh-interval').addEventListener('change', () => {
  if ($('#auto-refresh-toggle').checked) {
    stopAutoRefresh();
    startAutoRefresh();
  }
});

function startAutoRefresh() {
  const interval = parseInt($('#refresh-interval').value);
  autoRefreshTimer = setInterval(refreshPorts, interval);
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

// ─── Detail Panel ───
$('#detail-close').addEventListener('click', closeDetailPanel);

function closeDetailPanel() {
  detailPanel.classList.add('hidden');
  selectedPort = null;
  document.querySelectorAll('.port-table tbody tr.selected').forEach(r => r.classList.remove('selected'));
}

async function showProcessDetail(portData) {
  selectedPort = portData;
  detailPanel.classList.remove('hidden');
  
  // Update header
  $('#detail-icon').textContent = portData.appIcon || '📦';
  $('#detail-title').textContent = portData.appDisplayName || portData.processName;

  // Show loading
  detailBody.innerHTML = `<div class="detail-loading"><div class="spinner"></div><p>Loading details...</p></div>`;

  // Highlight selected row
  document.querySelectorAll('.port-table tbody tr').forEach(r => r.classList.remove('selected'));
  const row = tableBody.querySelector(`tr[data-row-id="${portData.proto}-${portData.port}-${portData.pid}"]`);
  if (row) row.classList.add('selected');

  // Fetch details from backend
  try {
    const result = await window.portPolice.getProcessDetail(portData.pid);
    
    if (result.success && result.data && result.data.PID) {
      renderDetailPanel(portData, result.data);
    } else {
      renderDetailPanel(portData, null);
    }
  } catch {
    renderDetailPanel(portData, null);
  }
}

function renderDetailPanel(portData, detail) {
  const processPath = detail?.Path || 'N/A';
  const commandLine = detail?.CommandLine || 'N/A';
  const memoryMB = detail?.MemoryMB || '?';
  const cpu = detail?.CPU || '0';
  const startTime = detail?.StartTime || 'N/A';
  const threads = detail?.Threads || '?';
  const company = detail?.Company || 'N/A';
  const description = detail?.Description || 'N/A';
  const fileVersion = detail?.FileVersion || 'N/A';
  const productName = detail?.ProductName || 'N/A';
  const parentPID = detail?.ParentPID || 'N/A';
  const parentName = detail?.ParentName || 'N/A';
  const windowTitle = detail?.MainWindowTitle || '';

  const categoryBadge = `<span class="detail-category-badge">${escapeHtml(portData.appIcon || '📦')} ${escapeHtml(portData.appCategory || 'Application')}</span>`;

  detailBody.innerHTML = `
    <!-- Category & Basic Info -->
    <div class="detail-section">
      <div class="detail-section-title">General Info</div>
      <div class="detail-row">
        <span class="detail-row-label">Category</span>
        <span class="detail-row-value">${categoryBadge}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Process</span>
        <span class="detail-row-value">${escapeHtml(portData.processName)}</span>
      </div>
      ${description !== 'N/A' ? `<div class="detail-row">
        <span class="detail-row-label">Description</span>
        <span class="detail-row-value">${escapeHtml(description)}</span>
      </div>` : ''}
      ${productName !== 'N/A' ? `<div class="detail-row">
        <span class="detail-row-label">Product</span>
        <span class="detail-row-value">${escapeHtml(productName)}</span>
      </div>` : ''}
      ${company !== 'N/A' ? `<div class="detail-row">
        <span class="detail-row-label">Company</span>
        <span class="detail-row-value">${escapeHtml(company)}</span>
      </div>` : ''}
      ${fileVersion !== 'N/A' ? `<div class="detail-row">
        <span class="detail-row-label">Version</span>
        <span class="detail-row-value mono">${escapeHtml(fileVersion)}</span>
      </div>` : ''}
      ${windowTitle ? `<div class="detail-row">
        <span class="detail-row-label">Window</span>
        <span class="detail-row-value">${escapeHtml(windowTitle)}</span>
      </div>` : ''}
    </div>

    <!-- Network Info -->
    <div class="detail-section">
      <div class="detail-section-title">Network</div>
      <div class="detail-row">
        <span class="detail-row-label">Port</span>
        <span class="detail-row-value mono">${portData.port}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Protocol</span>
        <span class="detail-row-value">${portData.proto}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Address</span>
        <span class="detail-row-value mono">${escapeHtml(portData.localAddress)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Foreign</span>
        <span class="detail-row-value mono">${escapeHtml(portData.foreignAddress)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Status</span>
        <span class="detail-row-value">${portData.state}</span>
      </div>
    </div>

    <!-- Process Info -->
    <div class="detail-section">
      <div class="detail-section-title">Process</div>
      <div class="detail-row">
        <span class="detail-row-label">PID</span>
        <span class="detail-row-value mono">${portData.pid}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Parent</span>
        <span class="detail-row-value">${escapeHtml(parentName)} (${parentPID})</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Memory</span>
        <span class="detail-row-value">${memoryMB} MB</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">CPU Time</span>
        <span class="detail-row-value">${cpu}s</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Threads</span>
        <span class="detail-row-value">${threads}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Started</span>
        <span class="detail-row-value">${escapeHtml(startTime)}</span>
      </div>
    </div>

    <!-- File Location -->
    <div class="detail-section">
      <div class="detail-section-title">File Location</div>
      <div class="detail-row">
        <span class="detail-row-label">Path</span>
      </div>
      <div class="detail-cmd-box">${escapeHtml(processPath)}</div>
    </div>

    <!-- Command Line -->
    <div class="detail-section">
      <div class="detail-section-title">Command Line</div>
      <div class="detail-cmd-box">${escapeHtml(commandLine)}</div>
    </div>

    <!-- Kill Button -->
    <button class="detail-kill-btn" id="detail-kill-btn">
      ⚡ Kill Process (PID: ${portData.pid})
    </button>
  `;

  // Attach kill event
  const killBtn = document.getElementById('detail-kill-btn');
  if (killBtn) {
    killBtn.addEventListener('click', () => {
      showKillModal(portData);
    });
  }
}

// ─── Modal ───
$('#modal-cancel').addEventListener('click', hideModal);
$('#modal-confirm').addEventListener('click', async () => {
  if (!pendingKill) return;
  const killData = { ...pendingKill };
  hideModal();
  await killPortProcess(killData.pid, killData.processName, killData.port);
});

confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) hideModal();
});

function showKillModal(portData) {
  pendingKill = portData;
  $('#modal-process-name').textContent = portData.processName;
  $('#modal-pid').textContent = portData.pid;
  $('#modal-port').textContent = portData.port;
  confirmModal.classList.remove('hidden');
}

function hideModal() {
  confirmModal.classList.add('hidden');
  pendingKill = null;
}

// ─── Core Functions ───

async function refreshPorts() {
  const btn = $('#btn-refresh');
  btn.classList.add('refreshing');
  
  try {
    const result = await window.portPolice.scanPorts();
    
    if (result.success) {
      allPorts = result.data;
      updateStats();
      renderTable();
    } else {
      showToast('error', `Scan failed: ${result.error}`);
    }
  } catch (err) {
    showToast('error', `Error: ${err.message}`);
  } finally {
    btn.classList.remove('refreshing');
    loadingState.classList.add('hidden');
  }
}

function updateStats() {
  $('#total-ports').textContent = allPorts.length;
  $('#total-tcp').textContent = allPorts.filter(p => p.proto === 'TCP').length;
  $('#total-udp').textContent = allPorts.filter(p => p.proto === 'UDP').length;
  $('#total-listening').textContent = allPorts.filter(p => p.state === 'LISTENING').length;
  updateBrowserCounts();
}

function updateBrowserCounts() {
  const browserPorts = allPorts.filter(p => p.appCategory === 'Browser');
  const el = (id) => document.getElementById(id);
  el('count-all-browsers').textContent = browserPorts.length;
  el('count-chrome').textContent = allPorts.filter(p => p.processName.toLowerCase() === 'chrome.exe').length;
  el('count-edge').textContent = allPorts.filter(p => p.processName.toLowerCase() === 'msedge.exe').length;
  el('count-firefox').textContent = allPorts.filter(p => p.processName.toLowerCase() === 'firefox.exe').length;
  el('count-opera').textContent = allPorts.filter(p => p.processName.toLowerCase() === 'opera.exe').length;
  el('count-brave').textContent = allPorts.filter(p => p.processName.toLowerCase() === 'brave.exe').length;
  el('count-vivaldi').textContent = allPorts.filter(p => p.processName.toLowerCase() === 'vivaldi.exe').length;
  el('count-zen').textContent = allPorts.filter(p => p.processName.toLowerCase() === 'zen.exe').length;
}

function getFilteredPorts() {
  let filtered = [...allPorts];

  switch (currentFilter) {
    case 'tcp': filtered = filtered.filter(p => p.proto === 'TCP'); break;
    case 'udp': filtered = filtered.filter(p => p.proto === 'UDP'); break;
    case 'listening': filtered = filtered.filter(p => p.state === 'LISTENING'); break;
    case 'established': filtered = filtered.filter(p => p.state === 'ESTABLISHED'); break;
  }

  // Browser filter
  if (currentBrowserFilter !== 'all') {
    filtered = filtered.filter(p => p.processName.toLowerCase() === currentBrowserFilter);
  }

  if (searchQuery) {
    filtered = filtered.filter(p =>
      String(p.port).includes(searchQuery) ||
      String(p.pid).includes(searchQuery) ||
      p.processName.toLowerCase().includes(searchQuery) ||
      p.proto.toLowerCase().includes(searchQuery) ||
      p.state.toLowerCase().includes(searchQuery) ||
      p.localAddress.toLowerCase().includes(searchQuery) ||
      (p.appCategory && p.appCategory.toLowerCase().includes(searchQuery)) ||
      (p.appDisplayName && p.appDisplayName.toLowerCase().includes(searchQuery))
    );
  }

  filtered.sort((a, b) => {
    let aVal = a[currentSort.field];
    let bVal = b[currentSort.field];
    
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return currentSort.dir === 'asc' ? -1 : 1;
    if (aVal > bVal) return currentSort.dir === 'asc' ? 1 : -1;
    return 0;
  });

  return filtered;
}

function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  const str = String(text);
  const idx = str.toLowerCase().indexOf(query);
  if (idx === -1) return escapeHtml(str);
  const before = str.slice(0, idx);
  const match = str.slice(idx, idx + query.length);
  const after = str.slice(idx + query.length);
  return `${escapeHtml(before)}<span class="highlight">${escapeHtml(match)}</span>${escapeHtml(after)}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getStateBadge(state) {
  const stateMap = {
    'LISTENING': 'listening',
    'ESTABLISHED': 'established',
    'TIME_WAIT': 'time-wait',
    'CLOSE_WAIT': 'close-wait',
    'FIN_WAIT_2': 'time-wait',
    'SYN_SENT': 'other',
    '-': 'other'
  };
  const cls = stateMap[state] || 'other';
  return `<span class="badge badge-${cls}">${escapeHtml(state)}</span>`;
}

function renderTable() {
  const filtered = getFilteredPorts();
  
  $('#visible-count').textContent = filtered.length;

  if (filtered.length === 0 && allPorts.length > 0) {
    tableBody.innerHTML = '';
    emptyState.classList.add('visible');
    return;
  }

  emptyState.classList.remove('visible');

  const rows = filtered.map(p => {
    const rowId = `${p.proto}-${p.port}-${p.pid}`;
    const isSelected = selectedPort && selectedPort.pid === p.pid && selectedPort.port === p.port;
    const protoBadge = p.proto === 'TCP' 
      ? '<span class="badge badge-tcp">TCP</span>' 
      : '<span class="badge badge-udp">UDP</span>';

    const icon = p.appIcon || '📦';

    return `<tr data-pid="${p.pid}" data-row-id="${rowId}" class="${isSelected ? 'selected' : ''}">
      <td>${protoBadge}</td>
      <td><span class="port-number">${highlightText(String(p.port), searchQuery)}</span></td>
      <td title="${escapeHtml(p.localAddress)}">${highlightText(p.localAddress, searchQuery)}</td>
      <td><span class="pid-text">${highlightText(String(p.pid), searchQuery)}</span></td>
      <td>
        <span class="process-name">
          <span class="app-icon-small">${icon}</span>
          ${highlightText(p.processName, searchQuery)}
        </span>
      </td>
      <td>${getStateBadge(p.state)}</td>
      <td>
        <button class="kill-btn" data-kill-pid="${p.pid}" data-kill-name="${escapeHtml(p.processName)}" data-kill-port="${p.port}">
          ✕ Kill
        </button>
      </td>
    </tr>`;
  });

  tableBody.innerHTML = rows.join('');

  // Attach row click handlers (for detail panel)
  tableBody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', (e) => {
      // Don't open detail if clicking the kill button
      if (e.target.closest('.kill-btn')) return;

      const pid = parseInt(row.dataset.pid);
      const rowId = row.dataset.rowId;
      const portData = filtered.find(p => `${p.proto}-${p.port}-${p.pid}` === rowId);
      if (portData) {
        showProcessDetail(portData);
      }
    });
  });

  // Attach kill button handlers
  tableBody.querySelectorAll('.kill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pid = parseInt(btn.dataset.killPid);
      const processName = btn.dataset.killName;
      const port = parseInt(btn.dataset.killPort);
      showKillModal({ pid, processName, port });
    });
  });
}

// ─── Kill Process ───

async function killPortProcess(pid, processName, port) {
  // Mark ALL rows with the same PID as killing
  const rows = tableBody.querySelectorAll(`tr[data-pid="${pid}"]`);
  rows.forEach(r => r.classList.add('row-killing'));

  showToast('info', `Killing all processes on port ${port}...`);

  try {
    // Pass both PID and PORT so backend can find and kill ALL processes on that port
    const result = await window.portPolice.killProcess(pid, port);
    
    if (result.success) {
      const killedCount = result.killedPids ? result.killedPids.length : 1;
      const failedCount = result.failedPids ? result.failedPids.length : 0;
      
      if (result.portFreed) {
        showToast('success', `Port ${port} freed! Killed ${killedCount} process(es).`);
      } else if (killedCount > 0) {
        showToast('warning', `Killed ${killedCount} process(es) but port ${port} may still be in use. Try running as Administrator.`);
      }

      if (failedCount > 0) {
        showToast('warning', `${failedCount} process(es) could not be killed (access denied).`);
      }

      // Close detail panel if it was showing this process
      if (selectedPort && selectedPort.pid === pid) {
        closeDetailPanel();
      }

      rows.forEach(r => {
        r.classList.remove('row-killing');
        r.classList.add('row-killed');
      });
      
      // Refresh after kill
      setTimeout(async () => {
        await refreshPorts();
      }, 1000);
    } else {
      rows.forEach(r => r.classList.remove('row-killing'));
      showToast('error', `Failed: ${result.error}`);
    }
  } catch (err) {
    rows.forEach(r => r.classList.remove('row-killing'));
    showToast('error', `Error: ${err.message}`);
  }
}

// ─── Toast Notifications ───

function showToast(type, message) {
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span>${escapeHtml(message)}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── Initialize ───
document.addEventListener('DOMContentLoaded', () => {
  refreshPorts();
  initQuickLaunch();
});

// ═══════════════════════════════════════════
// Quick Launch Module
// ═══════════════════════════════════════════

const RECENT_PROJECTS_KEY = 'portpolice_recent_projects';
const MAX_RECENT = 5;

let qlRunningProjects = [];

function initQuickLaunch() {
  const qlModal = $('#quick-launch-modal');
  const qlFolder = $('#ql-folder');
  const qlPort = $('#ql-port');
  const qlPreset = $('#ql-command-preset');
  const qlCustom = $('#ql-command-custom');

  // Open modal
  $('#btn-quick-launch').addEventListener('click', () => {
    qlModal.classList.remove('hidden');
    refreshRunningProjects();
    renderRecentProjects();
  });

  // Close modal
  $('#ql-close').addEventListener('click', () => qlModal.classList.add('hidden'));
  qlModal.addEventListener('click', (e) => {
    if (e.target === qlModal) qlModal.classList.add('hidden');
  });

  // Browse folder
  $('#ql-browse').addEventListener('click', async () => {
    const folder = await window.portPolice.selectFolder();
    if (folder) qlFolder.value = folder;
  });

  // Click on folder input also opens browse
  qlFolder.addEventListener('click', async () => {
    const folder = await window.portPolice.selectFolder();
    if (folder) qlFolder.value = folder;
  });

  // Show/hide custom command input
  qlPreset.addEventListener('change', () => {
    if (qlPreset.value === 'custom') {
      qlCustom.classList.remove('hidden');
      qlCustom.focus();
    } else {
      qlCustom.classList.add('hidden');
    }
  });

  // Start project
  $('#ql-start').addEventListener('click', async () => {
    const folder = qlFolder.value.trim();
    const port = qlPort.value.trim();
    const command = qlPreset.value === 'custom' ? qlCustom.value.trim() : qlPreset.value;

    if (!folder) {
      showToast('warning', 'Please select a project folder');
      return;
    }
    if (!command) {
      showToast('warning', 'Please enter a start command');
      return;
    }

    const startBtn = $('#ql-start');
    startBtn.disabled = true;
    startBtn.textContent = '⏳ Starting...';

    try {
      const result = await window.portPolice.launchProject({ folder, port, command });
      
      if (result.success) {
        const portLabel = port ? 'port ' + port : 'default port';
        showToast('success', `Started "${result.data.folderName}" on ${portLabel}`);
        if (result.data.hasPackageJson === false) {
          showToast('warning', 'No package.json found — the command may fail if dependencies are missing.');
        }
        saveRecentProject({ folder, port, command, folderName: result.data.folderName });
        refreshRunningProjects();
        renderRecentProjects();
        
        // Refresh port list after a delay to pick up the new process
        setTimeout(() => refreshPorts(), 2000);
      } else {
        showToast('error', `Launch failed: ${result.error}`);
      }
    } catch (err) {
      showToast('error', `Error: ${err.message}`);
    } finally {
      startBtn.disabled = false;
      startBtn.textContent = '▶ Start Project';
    }
  });

  // Listen for project stopped events from main process
  window.portPolice.onProjectStopped((id, code, errMsg) => {
    if (code !== 0 && errMsg) {
      showToast('error', `Project exited (code ${code}): ${errMsg}`);
    } else if (code !== 0) {
      showToast('warning', `Project exited with code ${code}`);
    } else {
      showToast('info', 'Project stopped');
    }
    refreshRunningProjects();
    setTimeout(() => refreshPorts(), 1000);
  });

  window.portPolice.onProjectError((id, msg) => {
    showToast('error', `Project error: ${msg}`);
    refreshRunningProjects();
  });
}

async function refreshRunningProjects() {
  try {
    qlRunningProjects = await window.portPolice.getRunningProjects();
    renderRunningProjects();
  } catch {}
}

function renderRunningProjects() {
  const list = document.getElementById('ql-running-list');
  const running = qlRunningProjects.filter(p => p.status === 'running');

  if (running.length === 0) {
    list.innerHTML = '<div class="ql-empty">No running projects</div>';
    return;
  }

  list.innerHTML = running.map(p => `
    <div class="ql-project-card" data-project-id="${escapeHtml(p.id)}">
      <div class="ql-project-info">
        <div class="ql-project-name">📂 ${escapeHtml(p.folderName)}</div>
        <div class="ql-project-meta">${escapeHtml(p.command)} ${p.port ? '· Port ' + p.port : ''} · ${escapeHtml(p.startTime)}</div>
      </div>
      <span class="ql-status-badge running"><span class="ql-status-dot"></span> Running</span>
      <button class="ql-stop-btn" data-stop-id="${escapeHtml(p.id)}">■ Stop</button>
    </div>
  `).join('');

  // Attach stop handlers
  list.querySelectorAll('.ql-stop-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.stopId;
      btn.textContent = '⏳...';
      btn.disabled = true;
      try {
        const result = await window.portPolice.stopProject(id);
        if (result.success) {
          showToast('success', 'Project stopped');
          refreshRunningProjects();
          setTimeout(() => refreshPorts(), 1000);
        } else {
          showToast('error', `Stop failed: ${result.error}`);
        }
      } catch (err) {
        showToast('error', `Error: ${err.message}`);
      }
    });
  });
}

// ─── Recent Projects (localStorage) ───

function getRecentProjects() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) || '[]');
  } catch { return []; }
}

function saveRecentProject(project) {
  let recents = getRecentProjects();
  // Remove duplicate
  recents = recents.filter(r => r.folder !== project.folder || r.command !== project.command);
  recents.unshift(project);
  if (recents.length > MAX_RECENT) recents = recents.slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(recents));
}

function renderRecentProjects() {
  const list = document.getElementById('ql-recent-list');
  const recents = getRecentProjects();

  if (recents.length === 0) {
    list.innerHTML = '<div class="ql-empty">No recent projects</div>';
    return;
  }

  list.innerHTML = recents.map((r, i) => `
    <div class="ql-recent-item">
      <button class="ql-recent-btn" data-recent-idx="${i}">
        <span class="ql-recent-icon">📁</span>
        <div class="ql-recent-info">
          <div class="ql-recent-name">${escapeHtml(r.folderName || r.folder.split('\\').pop())}</div>
          <div class="ql-recent-path" title="${escapeHtml(r.folder)}">${escapeHtml(r.folder)}</div>
        </div>
        <span class="ql-recent-cmd">${escapeHtml(r.command)}</span>
      </button>
      <button class="ql-recent-delete" data-delete-idx="${i}" title="Remove">✕</button>
    </div>
  `).join('');

  // Click to fill form
  list.querySelectorAll('.ql-recent-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.recentIdx);
      const recent = recents[idx];
      if (recent) {
        document.getElementById('ql-folder').value = recent.folder;
        document.getElementById('ql-port').value = recent.port || '';

        const preset = document.getElementById('ql-command-preset');
        const customInput = document.getElementById('ql-command-custom');
        const matchOption = [...preset.options].find(o => o.value === recent.command);
        if (matchOption) {
          preset.value = recent.command;
          customInput.classList.add('hidden');
        } else {
          preset.value = 'custom';
          customInput.classList.remove('hidden');
          customInput.value = recent.command;
        }
      }
    });
  });

  // Delete recent project
  list.querySelectorAll('.ql-recent-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.deleteIdx);
      let recs = getRecentProjects();
      recs.splice(idx, 1);
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(recs));
      renderRecentProjects();
      showToast('info', 'Removed from recent list');
    });
  });
}
