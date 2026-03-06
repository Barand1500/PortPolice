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

// New feature state
let currentPage = 1;
let pageSize = 50;
let portNotifications = [];
let watchlist = [];
let thresholds = { cpu: 90, memory: 90 };
let sysStatsTimer = null;
let contextTarget = null;
let columnOrder = ['proto', 'port', 'address', 'pid', 'process', 'state', 'actions'];
let dragSrcCol = null;

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
  if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !e.shiftKey) {
    e.preventDefault();
    refreshPorts();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault();
    toggleExportMenu();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
    e.preventDefault();
    document.getElementById('quick-launch-modal').classList.remove('hidden');
    showListView();
    refreshRunningProjects();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    e.preventDefault();
    const qpi = document.getElementById('quick-port-input');
    qpi.focus();
    qpi.select();
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
    e.preventDefault();
    document.getElementById('port-range-modal').classList.remove('hidden');
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    document.getElementById('remote-scan-modal').classList.remove('hidden');
  }
  if (e.key === '?' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
    e.preventDefault();
    document.getElementById('shortcuts-modal').classList.remove('hidden');
  }
  if (e.key === 'Escape') {
    // Close modals in priority order
    const modals = ['shortcuts-modal', 'known-port-modal', 'port-range-modal', 'remote-scan-modal', 'port-forward-modal', 'quick-launch-modal', 'confirm-modal'];
    let closed = false;
    for (const id of modals) {
      const el = document.getElementById(id);
      if (el && !el.classList.contains('hidden')) {
        el.classList.add('hidden');
        closed = true;
        break;
      }
    }
    if (!closed) {
      const ctx = document.getElementById('context-menu');
      if (!ctx.classList.contains('hidden')) {
        ctx.classList.add('hidden');
      } else if (!document.getElementById('notification-panel').classList.contains('hidden')) {
        document.getElementById('notification-panel').classList.add('hidden');
      } else if (!detailPanel.classList.contains('hidden')) {
        closeDetailPanel();
      } else {
        searchInput.value = '';
        searchQuery = '';
        searchInput.blur();
        renderTable();
      }
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
  detailBody.innerHTML = `<div class="detail-loading"><div class="spinner"></div><p>${t('loadingDetails')}</p></div>`;

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
      <div class="detail-section-title">${t('generalInfo')}</div>
      <div class="detail-row">
        <span class="detail-row-label">${t('category')}</span>
        <span class="detail-row-value">${categoryBadge}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">${t('process')}</span>
        <span class="detail-row-value">${escapeHtml(portData.processName)}</span>
      </div>
      ${description !== 'N/A' ? `<div class="detail-row">
        <span class="detail-row-label">${t('description')}</span>
        <span class="detail-row-value">${escapeHtml(description)}</span>
      </div>` : ''}
      ${productName !== 'N/A' ? `<div class="detail-row">
        <span class="detail-row-label">${t('product')}</span>
        <span class="detail-row-value">${escapeHtml(productName)}</span>
      </div>` : ''}
      ${company !== 'N/A' ? `<div class="detail-row">
        <span class="detail-row-label">${t('company')}</span>
        <span class="detail-row-value">${escapeHtml(company)}</span>
      </div>` : ''}
      ${fileVersion !== 'N/A' ? `<div class="detail-row">
        <span class="detail-row-label">${t('version')}</span>
        <span class="detail-row-value mono">${escapeHtml(fileVersion)}</span>
      </div>` : ''}
      ${windowTitle ? `<div class="detail-row">
        <span class="detail-row-label">${t('window')}</span>
        <span class="detail-row-value">${escapeHtml(windowTitle)}</span>
      </div>` : ''}
    </div>

    <!-- Network Info -->
    <div class="detail-section">
      <div class="detail-section-title">${t('networkSection')}</div>
      <div class="detail-row">
        <span class="detail-row-label">${t('portLabel')}</span>
        <span class="detail-row-value mono">${portData.port}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">${t('protocolLabel')}</span>
        <span class="detail-row-value">${portData.proto}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">${t('addressLabel')}</span>
        <span class="detail-row-value mono">${escapeHtml(portData.localAddress)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">${t('foreign')}</span>
        <span class="detail-row-value mono">${escapeHtml(portData.foreignAddress)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">${t('statusLabel')}</span>
        <span class="detail-row-value">${portData.state}</span>
      </div>
    </div>

    <!-- Process Info -->
    <div class="detail-section">
      <div class="detail-section-title">${t('processSection')}</div>
      <div class="detail-row">
        <span class="detail-row-label">${t('pidLabel')}</span>
        <span class="detail-row-value mono">${portData.pid}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">${t('parent')}</span>
        <span class="detail-row-value">${escapeHtml(parentName)} (${parentPID})</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">${t('memory')}</span>
        <span class="detail-row-value">${memoryMB} MB</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">${t('cpuTime')}</span>
        <span class="detail-row-value">${cpu}s</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">${t('threads')}</span>
        <span class="detail-row-value">${threads}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">${t('started')}</span>
        <span class="detail-row-value">${escapeHtml(startTime)}</span>
      </div>
    </div>

    <!-- File Location -->
    <div class="detail-section">
      <div class="detail-section-title">${t('fileLocation')}</div>
      <div class="detail-row">
        <span class="detail-row-label">${t('path')}</span>
      </div>
      <div class="detail-cmd-box">${escapeHtml(processPath)}</div>
    </div>

    <!-- Command Line -->
    <div class="detail-section">
      <div class="detail-section-title">${t('commandLine')}</div>
      <div class="detail-cmd-box">${escapeHtml(commandLine)}</div>
    </div>

    <!-- Kill Button -->
    <button class="detail-kill-btn" id="detail-kill-btn">
      ⚡ ${t('killProcessPid', {pid: portData.pid})}
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

      // Port change notifications
      if (result.changes) {
        const { opened, closed } = result.changes;
        if (opened.length > 0 || closed.length > 0) {
          handlePortChanges(opened, closed);
        }
      }

      // Duplicate port warnings
      checkDuplicatePorts();

      // Suspicious port warnings
      checkSuspiciousPorts();

      // Watchlist status update
      updateWatchlistStatus();

      updateStats();
      currentPage = 1;
      renderTable();
    } else {
      showToast('error', t('scanFailed', {error: result.error}));
    }
  } catch (err) {
    showToast('error', t('errorMsg', {error: err.message}));
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
  const totalFiltered = filtered.length;
  
  $('#visible-count').textContent = totalFiltered;
  $('#total-count').textContent = allPorts.length;

  if (totalFiltered === 0 && allPorts.length > 0) {
    tableBody.innerHTML = '';
    emptyState.classList.add('visible');
    renderPagination(0, 0);
    return;
  }

  emptyState.classList.remove('visible');

  // Pagination
  const effectivePageSize = pageSize === 0 ? totalFiltered : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / effectivePageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  const startIdx = (currentPage - 1) * effectivePageSize;
  const endIdx = Math.min(startIdx + effectivePageSize, totalFiltered);
  const pageItems = filtered.slice(startIdx, endIdx);

  renderPagination(totalFiltered, totalPages);

  // Detect duplicate ports (multiple PIDs on same port)
  const portCounts = {};
  allPorts.forEach(p => {
    const key = `${p.proto}-${p.port}`;
    portCounts[key] = (portCounts[key] || 0) + 1;
  });

  // Check watchlist membership
  const watchSet = new Set(watchlist.map(w => `${w.proto}-${w.port}`));

  const rows = pageItems.map(p => {
    const rowId = `${p.proto}-${p.port}-${p.pid}`;
    const isSelected = selectedPort && selectedPort.pid === p.pid && selectedPort.port === p.port;
    const protoBadge = p.proto === 'TCP' 
      ? '<span class="badge badge-tcp">TCP</span>' 
      : '<span class="badge badge-udp">UDP</span>';

    const icon = p.appIcon || '📦';
    const isDuplicate = portCounts[`${p.proto}-${p.port}`] > 1;
    const isSuspicious = p.suspiciousInfo || isSuspiciousPort(p.port);
    const isWatched = watchSet.has(`${p.proto}-${p.port}`);
    
    let rowClasses = isSelected ? 'selected' : '';
    if (isDuplicate) rowClasses += ' row-duplicate';
    if (isSuspicious) rowClasses += ' row-suspicious';
    if (isWatched) rowClasses += ' row-watched';

    // Build cells in column order
    const cellMap = {
      proto: `<td>${protoBadge}</td>`,
      port: `<td><span class="port-number">${highlightText(String(p.port), searchQuery)}</span>${isDuplicate ? `<span class="dup-badge" title="${t('multipleProcesses')}">⚠️</span>` : ''}${isSuspicious ? `<span class="sus-badge" title="${t('suspiciousPort')}">🚨</span>` : ''}${isWatched ? `<span class="watch-badge" title="${t('watched')}">👁️</span>` : ''}</td>`,
      address: `<td title="${escapeHtml(p.localAddress)}">${highlightText(p.localAddress, searchQuery)}</td>`,
      pid: `<td><span class="pid-text">${highlightText(String(p.pid), searchQuery)}</span></td>`,
      process: `<td><span class="process-name"><span class="app-icon-small">${icon}</span>${highlightText(p.processName, searchQuery)}</span></td>`,
      state: `<td>${getStateBadge(p.state)}</td>`,
      actions: `<td><button class="kill-btn" data-kill-pid="${p.pid}" data-kill-name="${escapeHtml(p.processName)}" data-kill-port="${p.port}">${t('killBtn')}</button></td>`
    };

    const cells = columnOrder.map(col => cellMap[col] || '').join('');

    return `<tr data-pid="${p.pid}" data-row-id="${rowId}" class="${rowClasses}">${cells}</tr>`;
  });

  tableBody.innerHTML = rows.join('');

  // Attach row click handlers (for detail panel)
  tableBody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.kill-btn')) return;

      const pid = parseInt(row.dataset.pid);
      const rowId = row.dataset.rowId;
      const portData = filtered.find(p => `${p.proto}-${p.port}-${p.pid}` === rowId);
      if (portData) {
        showProcessDetail(portData);
      }
    });

    // Right-click context menu
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const rowId = row.dataset.rowId;
      contextTarget = filtered.find(p => `${p.proto}-${p.port}-${p.pid}` === rowId);
      if (contextTarget) {
        showContextMenu(e.clientX, e.clientY);
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

  showToast('info', t('killingProcesses', {port}));

  try {
    // Pass both PID and PORT so backend can find and kill ALL processes on that port
    const result = await window.portPolice.killProcess(pid, port);
    
    if (result.success) {
      const killedCount = result.killedPids ? result.killedPids.length : 1;
      const failedCount = result.failedPids ? result.failedPids.length : 0;
      
      if (result.portFreed) {
        showToast('success', t('portFreed', {port, count: killedCount}));
      } else if (killedCount > 0) {
        showToast('warning', t('portStillInUse', {count: killedCount, port}));
      }

      if (failedCount > 0) {
        showToast('warning', t('processesNotKilled', {count: failedCount}));
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
      showToast('error', t('errorMsg', {error: result.error}));
    }
  } catch (err) {
    rows.forEach(r => r.classList.remove('row-killing'));
    showToast('error', t('errorMsg', {error: err.message}));
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
  initLanguage();
  refreshPorts();
  initQuickLaunch();
  initPagination();
  initSystemMonitor();
  initQuickPortCheck();
  initWatchlist();
  initThresholds();
  initPortRange();
  initRemoteScan();
  initPortForwarding();
  initExport();
  initContextMenu();
  initDragDropColumns();
  initNotifications();
  initShortcutsModal();
  initNetworkInfo();
});

// ═══════════════════════════════════════════
// Language
// ═══════════════════════════════════════════

function initLanguage() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
    btn.addEventListener('click', () => {
      setLanguage(btn.dataset.lang);
      // Re-render dynamic content
      renderTable();
      renderWatchlist();
      updateWatchlistStatus();
      if (typeof renderProfilesList === 'function') renderProfilesList();
      if (typeof renderRunningProjects === 'function') renderRunningProjects();
    });
  });
  applyLanguage();
}

// ═══════════════════════════════════════════
// Pagination
// ═══════════════════════════════════════════

function initPagination() {
  document.getElementById('page-first').addEventListener('click', () => { currentPage = 1; renderTable(); });
  document.getElementById('page-prev').addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); } });
  document.getElementById('page-next').addEventListener('click', () => {
    const total = getTotalPages();
    if (currentPage < total) { currentPage++; renderTable(); }
  });
  document.getElementById('page-last').addEventListener('click', () => { currentPage = getTotalPages(); renderTable(); });
  document.getElementById('page-size').addEventListener('change', (e) => {
    pageSize = parseInt(e.target.value);
    currentPage = 1;
    renderTable();
  });
}

function getTotalPages() {
  const filtered = getFilteredPorts();
  if (pageSize === 0) return 1;
  return Math.max(1, Math.ceil(filtered.length / pageSize));
}

function renderPagination(totalItems, totalPages) {
  document.getElementById('page-current').textContent = currentPage;
  document.getElementById('page-total').textContent = totalPages || 1;
  document.getElementById('page-item-count').textContent = totalItems;

  document.getElementById('page-first').disabled = currentPage <= 1;
  document.getElementById('page-prev').disabled = currentPage <= 1;
  document.getElementById('page-next').disabled = currentPage >= totalPages;
  document.getElementById('page-last').disabled = currentPage >= totalPages;

  // Render page number buttons
  const container = document.getElementById('page-numbers');
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  container.innerHTML = pages.map(p =>
    `<button class="page-num-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`
  ).join('');

  container.querySelectorAll('.page-num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page);
      renderTable();
    });
  });
}

// ═══════════════════════════════════════════
// System Monitor (CPU/RAM/Uptime)
// ═══════════════════════════════════════════

function initSystemMonitor() {
  updateSystemStats();
  sysStatsTimer = setInterval(updateSystemStats, 3000);
}

async function updateSystemStats() {
  try {
    const result = await window.portPolice.getSystemStats();
    if (!result.success) return;
    const d = result.data;

    document.getElementById('sys-cpu').textContent = d.cpu + '%';
    document.getElementById('sys-ram').textContent = d.memUsage + '%';
    document.getElementById('sys-cpu-bar').style.width = d.cpu + '%';
    document.getElementById('sys-ram-bar').style.width = d.memUsage + '%';
    document.getElementById('sys-ram-used').textContent = `${d.memUsed} / ${d.memTotal} MB`;

    // Color code bars
    const cpuBar = document.getElementById('sys-cpu-bar');
    const ramBar = document.getElementById('sys-ram-bar');
    cpuBar.className = 'sys-bar-fill cpu-bar' + (d.cpu > 80 ? ' bar-danger' : d.cpu > 50 ? ' bar-warning' : '');
    ramBar.className = 'sys-bar-fill ram-bar' + (d.memUsage > 80 ? ' bar-danger' : d.memUsage > 50 ? ' bar-warning' : '');

    // Uptime
    document.getElementById('uptime-display').textContent = formatUptime(d.uptime);

    // Threshold alerts
    if (d.cpu >= thresholds.cpu) {
      showToast('warning', t('cpuExceedsThreshold', {cpu: d.cpu, threshold: thresholds.cpu}));
    }
    if (d.memUsage >= thresholds.memory) {
      showToast('warning', t('ramExceedsThreshold', {ram: d.memUsage, threshold: thresholds.memory}));
    }
  } catch {}
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  let parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

// ═══════════════════════════════════════════
// Network Info
// ═══════════════════════════════════════════

async function initNetworkInfo() {
  try {
    const result = await window.portPolice.getNetworkTraffic();
    if (!result.success) return;
    const list = document.getElementById('net-info-list');
    if (result.data.length === 0) {
      list.innerHTML = `<div class="net-info-item">${t('noExternalInterfaces')}</div>`;
      return;
    }
    list.innerHTML = result.data.slice(0, 4).map(iface => `
      <div class="net-info-item">
        <div class="net-info-name">${escapeHtml(iface.name)}</div>
        <div class="net-info-addr">${escapeHtml(iface.address)}</div>
      </div>
    `).join('');
  } catch {}
}

// ═══════════════════════════════════════════
// Quick Port Check
// ═══════════════════════════════════════════

function initQuickPortCheck() {
  const input = document.getElementById('quick-port-input');
  const btn = document.getElementById('quick-check-btn');

  btn.addEventListener('click', () => doQuickCheck());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doQuickCheck();
  });
}

async function doQuickCheck() {
  const port = parseInt(document.getElementById('quick-port-input').value);
  if (isNaN(port) || port < 1 || port > 65535) {
    showToast('warning', t('enterValidPort'));
    return;
  }

  const resultDiv = document.getElementById('quick-check-result');
  resultDiv.classList.remove('hidden');
  resultDiv.innerHTML = '<div class="spinner" style="width:20px;height:20px;margin:8px auto"></div>';

  try {
    const result = await window.portPolice.checkSinglePort(port);
    if (!result.success) {
      resultDiv.innerHTML = `<div class="qc-error">${t('errorMsg', {error: escapeHtml(result.error)})}</div>`;
      return;
    }
    const d = result.data;
    let html = '';
    if (d.inUse) {
      html = `<div class="qc-status in-use">${t('portInUse', {port: d.port})}</div>`;
      html += d.matches.map(m => `
        <div class="qc-match">
          <span>${m.appIcon || '📦'} ${escapeHtml(m.processName)}</span>
          <span class="qc-pid">PID:${m.pid}</span>
        </div>
      `).join('');
    } else {
      html = `<div class="qc-status free">${t('portFree', {port: d.port})}</div>`;
    }
    if (d.knownInfo) {
      html += `<div class="qc-known">📖 ${escapeHtml(d.knownInfo.name)} — ${escapeHtml(d.knownInfo.description)}</div>`;
    }
    if (d.suspiciousInfo) {
      html += `<div class="qc-suspicious">🚨 ${escapeHtml(d.suspiciousInfo.name)} — ${escapeHtml(d.suspiciousInfo.description)}</div>`;
    }
    resultDiv.innerHTML = html;
  } catch (err) {
    resultDiv.innerHTML = `<div class="qc-error">${t('errorMsg', {error: escapeHtml(err.message)})}</div>`;
  }
}

// ═══════════════════════════════════════════
// Watchlist
// ═══════════════════════════════════════════

async function initWatchlist() {
  try {
    watchlist = await window.portPolice.getWatchlist();
    renderWatchlist();
  } catch {}
}

function renderWatchlist() {
  const container = document.getElementById('watchlist-container');
  if (watchlist.length === 0) {
    container.innerHTML = `<div class="watchlist-empty">${t('noPortsWatched')}</div>`;
    return;
  }
  container.innerHTML = watchlist.map(w => {
    const active = allPorts.some(p => p.port === w.port && p.proto === w.proto);
    return `
      <div class="watchlist-item ${active ? 'wl-active' : 'wl-inactive'}">
        <span class="wl-dot ${active ? 'dot-green' : 'dot-gray'}"></span>
        <span class="wl-port">${w.proto} :${w.port}</span>
        <span class="wl-status">${active ? t('active') : t('inactive')}</span>
        <button class="wl-remove" data-port="${w.port}" data-proto="${w.proto}">✕</button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.wl-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const port = parseInt(btn.dataset.port);
      const proto = btn.dataset.proto;
      watchlist = await window.portPolice.removeFromWatchlist(port, proto);
      renderWatchlist();
      renderTable();
      showToast('info', t('portRemovedWatchlist', {port}));
    });
  });
}

async function addToWatchlist(portData) {
  watchlist = await window.portPolice.addToWatchlist({
    port: portData.port, proto: portData.proto,
    processName: portData.processName || ''
  });
  renderWatchlist();
  renderTable();
  showToast('success', t('portAddedWatchlist', {port: portData.port}));
}

function updateWatchlistStatus() {
  renderWatchlist();
}

// ═══════════════════════════════════════════
// Threshold Alerts
// ═══════════════════════════════════════════

async function initThresholds() {
  try {
    thresholds = await window.portPolice.getThresholds();
    document.getElementById('threshold-cpu').value = thresholds.cpu || 90;
    document.getElementById('threshold-ram').value = thresholds.memory || 90;
  } catch {}

  document.getElementById('threshold-save-btn').addEventListener('click', async () => {
    const cpu = parseInt(document.getElementById('threshold-cpu').value) || 90;
    const memory = parseInt(document.getElementById('threshold-ram').value) || 90;
    thresholds = { cpu, memory };
    await window.portPolice.setThresholds(thresholds);
    showToast('success', t('thresholdsSet', {cpu, memory}));
  });
}

// ═══════════════════════════════════════════
// Suspicious Port Detection
// ═══════════════════════════════════════════

const SUSPICIOUS_PORT_SET = new Set([
  1, 31, 1234, 1337, 2745, 3127, 3410, 4444, 4899, 5555,
  6660, 6661, 6666, 6667, 6668, 6669, 6697,
  7777, 8787, 9999, 12345, 12346, 20034, 27374,
  31337, 31338, 54321, 65535
]);

function isSuspiciousPort(port) {
  return SUSPICIOUS_PORT_SET.has(port);
}

function checkSuspiciousPorts() {
  const suspicious = allPorts.filter(p => isSuspiciousPort(p.port));
  if (suspicious.length > 0) {
    const ports = [...new Set(suspicious.map(p => p.port))];
    if (ports.length <= 3) {
      showToast('warning', t('suspiciousDetected', {ports: ports.join(', ')}));
    } else {
      showToast('warning', t('suspiciousCountDetected', {count: ports.length}));
    }
  }
}

// ═══════════════════════════════════════════
// Duplicate Port Detection
// ═══════════════════════════════════════════

function checkDuplicatePorts() {
  const portMap = {};
  allPorts.forEach(p => {
    if (p.state !== 'LISTENING') return;
    const key = `${p.proto}-${p.port}`;
    if (!portMap[key]) portMap[key] = [];
    portMap[key].push(p);
  });

  const duplicates = Object.entries(portMap).filter(([, v]) => v.length > 1);
  if (duplicates.length > 0) {
    const portList = duplicates.map(([k]) => k.split('-')[1]).slice(0, 3).join(', ');
    showToast('info', t('duplicateListening', {ports: portList}));
  }
}

// ═══════════════════════════════════════════
// Port Change Notifications
// ═══════════════════════════════════════════

function initNotifications() {
  document.getElementById('notif-bell').addEventListener('click', () => {
    const panel = document.getElementById('notification-panel');
    panel.classList.toggle('hidden');
  });
  document.getElementById('notif-close').addEventListener('click', () => {
    document.getElementById('notification-panel').classList.add('hidden');
  });
}

function handlePortChanges(opened, closed) {
  const now = new Date().toLocaleTimeString();

  opened.forEach(p => {
    portNotifications.unshift({
      type: 'opened',
      port: p.port,
      proto: p.proto,
      processName: p.processName || 'Unknown',
      time: now
    });
  });
  closed.forEach(p => {
    portNotifications.unshift({
      type: 'closed',
      port: p.port,
      proto: p.proto,
      processName: p.processName || 'Unknown',
      time: now
    });
  });

  // Keep last 50
  if (portNotifications.length > 50) portNotifications = portNotifications.slice(0, 50);

  // Update badge
  const badge = document.getElementById('notif-badge');
  badge.textContent = portNotifications.length;
  badge.classList.toggle('hidden', portNotifications.length === 0);

  // Render notification list
  const list = document.getElementById('notif-list');
  list.innerHTML = portNotifications.map(n => `
    <div class="notif-item ${n.type}">
      <span class="notif-icon">${n.type === 'opened' ? '🟢' : '🔴'}</span>
      <span class="notif-text">${n.proto} :${n.port} ${n.type === 'opened' ? t('opened') : t('closed')} (${escapeHtml(n.processName)})</span>
      <span class="notif-time">${escapeHtml(n.time)}</span>
    </div>
  `).join('');

  if (opened.length > 0) {
    showToast('info', t('portsOpened', {count: opened.length}));
  }
  if (closed.length > 0) {
    showToast('info', t('portsClosed', {count: closed.length}));
  }
}

// ═══════════════════════════════════════════
// Port Range Scan
// ═══════════════════════════════════════════

function initPortRange() {
  document.getElementById('btn-port-range').addEventListener('click', () => {
    document.getElementById('port-range-modal').classList.remove('hidden');
  });
  document.getElementById('range-cancel').addEventListener('click', () => {
    document.getElementById('port-range-modal').classList.add('hidden');
  });
  document.getElementById('port-range-modal').addEventListener('click', (e) => {
    if (e.target.id === 'port-range-modal') e.target.classList.add('hidden');
  });
  document.getElementById('range-scan').addEventListener('click', doRangeScan);
}

async function doRangeScan() {
  const start = parseInt(document.getElementById('range-start').value);
  const end = parseInt(document.getElementById('range-end').value);
  if (isNaN(start) || isNaN(end) || start < 1 || end > 65535 || start > end) {
    showToast('warning', t('enterValidRange'));
    return;
  }

  const btn = document.getElementById('range-scan');
  btn.disabled = true;
  btn.textContent = t('scanning');
  const resultDiv = document.getElementById('range-result');
  resultDiv.classList.remove('hidden');
  document.getElementById('range-result-list').innerHTML = '<div class="spinner" style="width:24px;height:24px;margin:16px auto"></div>';

  try {
    const result = await window.portPolice.scanPortRange(start, end);
    if (result.success) {
      document.getElementById('range-result-count').textContent = result.data.length;
      const list = document.getElementById('range-result-list');
      if (result.data.length === 0) {
        list.innerHTML = `<div class="ql-empty-text">${t('noActivePortsRange')}</div>`;
      } else {
        list.innerHTML = result.data.map(p => `
          <div class="range-item">
            <span class="range-item-port">${p.proto} :${p.port}</span>
            <span class="range-item-process">${p.appIcon || '📦'} ${escapeHtml(p.processName)}</span>
            <span class="range-item-state">${p.state}</span>
          </div>
        `).join('');
      }
    } else {
      showToast('error', result.error);
    }
  } catch (err) {
    showToast('error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 ' + t('scan');
  }
}

// ═══════════════════════════════════════════
// Remote Host Scan
// ═══════════════════════════════════════════

function initRemoteScan() {
  document.getElementById('btn-remote-scan').addEventListener('click', () => {
    document.getElementById('remote-scan-modal').classList.remove('hidden');
  });
  document.getElementById('remote-cancel').addEventListener('click', () => {
    document.getElementById('remote-scan-modal').classList.add('hidden');
  });
  document.getElementById('remote-scan-modal').addEventListener('click', (e) => {
    if (e.target.id === 'remote-scan-modal') e.target.classList.add('hidden');
  });
  document.getElementById('remote-scan-btn').addEventListener('click', doRemoteScan);
}

async function doRemoteScan() {
  const host = document.getElementById('remote-host').value.trim();
  const start = parseInt(document.getElementById('remote-start').value);
  const end = parseInt(document.getElementById('remote-end').value);

  if (!host) { showToast('warning', t('enterHostAddress')); return; }
  if (isNaN(start) || isNaN(end) || start < 1 || end > 65535 || start > end) {
    showToast('warning', t('enterValidRange'));
    return;
  }

  const btn = document.getElementById('remote-scan-btn');
  btn.disabled = true;
  btn.textContent = t('scanning');
  const resultDiv = document.getElementById('remote-result');
  resultDiv.classList.remove('hidden');
  document.getElementById('remote-result-list').innerHTML = '<div class="spinner" style="width:24px;height:24px;margin:16px auto"></div>';

  try {
    const result = await window.portPolice.scanRemoteHost(host, start, end);
    if (result.success) {
      const openPorts = result.data.filter(p => p.status === 'open');
      document.getElementById('remote-result-count').textContent = openPorts.length;
      document.getElementById('remote-result-host').textContent = host;
      const list = document.getElementById('remote-result-list');
      if (openPorts.length === 0) {
        list.innerHTML = `<div class="ql-empty-text">${t('noOpenPortsFound')}</div>`;
      } else {
        list.innerHTML = openPorts.map(p => `
          <div class="range-item">
            <span class="range-item-port">:${p.port}</span>
            <span class="range-item-process">${p.knownInfo ? escapeHtml(p.knownInfo.name) : 'Unknown'}</span>
            <span class="range-item-state open">${p.status}</span>
          </div>
        `).join('');
      }
    } else {
      showToast('error', result.error);
    }
  } catch (err) {
    showToast('error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '🌐 ' + t('scan');
  }
}

// ═══════════════════════════════════════════
// Port Forwarding
// ═══════════════════════════════════════════

function initPortForwarding() {
  document.getElementById('btn-port-forward').addEventListener('click', () => {
    document.getElementById('port-forward-modal').classList.remove('hidden');
    refreshPortForwardingRules();
  });
  document.getElementById('pf-close').addEventListener('click', () => {
    document.getElementById('port-forward-modal').classList.add('hidden');
  });
  document.getElementById('port-forward-modal').addEventListener('click', (e) => {
    if (e.target.id === 'port-forward-modal') e.target.classList.add('hidden');
  });
  document.getElementById('pf-add-btn').addEventListener('click', addForwardingRule);
}

async function addForwardingRule() {
  const lp = parseInt(document.getElementById('pf-listen-port').value);
  const addr = document.getElementById('pf-connect-addr').value.trim();
  const cp = parseInt(document.getElementById('pf-connect-port').value);

  if (isNaN(lp) || !addr || isNaN(cp)) {
    showToast('warning', t('fillAllFields'));
    return;
  }

  try {
    const result = await window.portPolice.addPortForwarding(lp, addr, cp);
    if (result.success) {
      showToast('success', t('portForwardingAdded', {lp, addr, cp}));
      refreshPortForwardingRules();
    } else {
      showToast('error', result.error);
    }
  } catch (err) {
    showToast('error', err.message);
  }
}

async function refreshPortForwardingRules() {
  try {
    const result = await window.portPolice.listPortForwarding();
    const list = document.getElementById('pf-rules-list');
    if (!result.success || result.data.length === 0) {
      list.innerHTML = `<div class="ql-empty-text">${t('noForwardingRules')}</div>`;
      return;
    }
    list.innerHTML = result.data.map(r => `
      <div class="pf-rule-item">
        <span class="pf-rule-text">${r.listenAddress}:${r.listenPort} → ${r.connectAddress}:${r.connectPort}</span>
        <button class="pf-rule-remove" data-lp="${r.listenPort}">✕</button>
      </div>
    `).join('');

    list.querySelectorAll('.pf-rule-remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const res = await window.portPolice.removePortForwarding(parseInt(btn.dataset.lp));
          if (res.success) {
            showToast('success', t('ruleRemoved'));
            refreshPortForwardingRules();
          } else {
            showToast('error', res.error);
          }
        } catch (err) {
          showToast('error', err.message);
        }
      });
    });
  } catch {}
}

// ═══════════════════════════════════════════
// Export (CSV / JSON)
// ═══════════════════════════════════════════

function initExport() {
  document.getElementById('btn-export').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleExportMenu();
  });

  document.querySelectorAll('.export-option').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const format = btn.dataset.format;
      document.getElementById('export-menu').classList.add('hidden');
      const data = getFilteredPorts();
      try {
        const result = await window.portPolice.exportData(data, format);
        if (result.success) {
          showToast('success', t('exported', {count: data.length, format: format.toUpperCase()}));
        } else if (result.error !== 'Cancelled') {
          showToast('error', result.error);
        }
      } catch (err) {
        showToast('error', err.message);
      }
    });
  });

  // Close export menu on outside click
  document.addEventListener('click', () => {
    document.getElementById('export-menu').classList.add('hidden');
  });
}

function toggleExportMenu() {
  const menu = document.getElementById('export-menu');
  menu.classList.toggle('hidden');
}

// ═══════════════════════════════════════════
// Right-Click Context Menu
// ═══════════════════════════════════════════

function initContextMenu() {
  // Close on any click
  document.addEventListener('click', () => {
    document.getElementById('context-menu').classList.add('hidden');
  });

  // Handle context menu actions
  document.querySelectorAll('.ctx-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      document.getElementById('context-menu').classList.add('hidden');
      if (!contextTarget) return;

      switch (action) {
        case 'detail':
          showProcessDetail(contextTarget);
          break;
        case 'info':
          showKnownPortInfo(contextTarget.port);
          break;
        case 'watchlist':
          addToWatchlist(contextTarget);
          break;
        case 'copy-port':
          navigator.clipboard.writeText(String(contextTarget.port));
          showToast('info', t('portCopied', {port: contextTarget.port}));
          break;
        case 'copy-pid':
          navigator.clipboard.writeText(String(contextTarget.pid));
          showToast('info', t('pidCopied', {pid: contextTarget.pid}));
          break;
        case 'copy-row':
          const text = `${contextTarget.proto} :${contextTarget.port} PID:${contextTarget.pid} ${contextTarget.processName} ${contextTarget.state}`;
          navigator.clipboard.writeText(text);
          showToast('info', t('rowCopied'));
          break;
        case 'kill':
          showKillModal(contextTarget);
          break;
      }
    });
  });
}

function showContextMenu(x, y) {
  const menu = document.getElementById('context-menu');
  menu.classList.remove('hidden');

  // Position menu
  const mw = menu.offsetWidth;
  const mh = menu.offsetHeight;
  const ww = window.innerWidth;
  const wh = window.innerHeight;

  menu.style.left = (x + mw > ww ? x - mw : x) + 'px';
  menu.style.top = (y + mh > wh ? y - mh : y) + 'px';
}

// ═══════════════════════════════════════════
// Known Port Info Modal
// ═══════════════════════════════════════════

async function showKnownPortInfo(port) {
  const modal = document.getElementById('known-port-modal');
  modal.classList.remove('hidden');
  const body = document.getElementById('known-port-body');
  body.innerHTML = '<div class="spinner" style="width:24px;height:24px;margin:16px auto"></div>';

  try {
    const result = await window.portPolice.getKnownPortInfo(port);
    if (!result.success) {
      body.innerHTML = `<p>${t('errorLoadingPortInfo')}</p>`;
      return;
    }
    const { known, suspicious } = result.data;
    let html = `<div class="kp-port-number">Port ${port}</div>`;

    if (known) {
      html += `
        <div class="kp-card">
          <div class="kp-name">${escapeHtml(known.name)}</div>
          <div class="kp-desc">${escapeHtml(known.description)}</div>
          <div class="kp-meta">
            <span class="kp-category">${escapeHtml(known.category)}</span>
            <span class="kp-risk kp-risk-${known.risk}">${known.risk} ${t('risk')}</span>
          </div>
        </div>`;
    } else {
      html += `<div class="kp-unknown">${t('noKnownService')}</div>`;
    }

    if (suspicious) {
      html += `
        <div class="kp-card kp-suspicious">
          <div class="kp-warn">${t('suspiciousPort')}</div>
          <div class="kp-name">${escapeHtml(suspicious.name)}</div>
          <div class="kp-desc">${escapeHtml(suspicious.description)}</div>
          <span class="kp-risk kp-risk-${suspicious.risk}">${suspicious.risk} ${t('risk')}</span>
        </div>`;
    }

    body.innerHTML = html;
  } catch {
    body.innerHTML = `<p>${t('errorLoadingPortInfo')}</p>`;
  }
}

function initShortcutsModal() {
  document.getElementById('known-port-close').addEventListener('click', () => {
    document.getElementById('known-port-modal').classList.add('hidden');
  });
  document.getElementById('known-port-modal').addEventListener('click', (e) => {
    if (e.target.id === 'known-port-modal') e.target.classList.add('hidden');
  });
  document.getElementById('shortcuts-close').addEventListener('click', () => {
    document.getElementById('shortcuts-modal').classList.add('hidden');
  });
  document.getElementById('shortcuts-modal').addEventListener('click', (e) => {
    if (e.target.id === 'shortcuts-modal') e.target.classList.add('hidden');
  });
}

// ═══════════════════════════════════════════
// Drag & Drop Column Reordering
// ═══════════════════════════════════════════

function initDragDropColumns() {
  const headerRow = document.getElementById('table-header-row');
  if (!headerRow) return;

  headerRow.addEventListener('dragstart', (e) => {
    const th = e.target.closest('[data-col]');
    if (!th || !th.draggable) return;
    dragSrcCol = th.dataset.col;
    th.classList.add('col-dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  headerRow.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const th = e.target.closest('[data-col]');
    if (th && th.dataset.col !== dragSrcCol) {
      th.classList.add('col-drag-over');
    }
  });

  headerRow.addEventListener('dragleave', (e) => {
    const th = e.target.closest('[data-col]');
    if (th) th.classList.remove('col-drag-over');
  });

  headerRow.addEventListener('drop', (e) => {
    e.preventDefault();
    const th = e.target.closest('[data-col]');
    if (!th || th.dataset.col === dragSrcCol) return;

    const target = th.dataset.col;
    const srcIdx = columnOrder.indexOf(dragSrcCol);
    const targetIdx = columnOrder.indexOf(target);
    if (srcIdx === -1 || targetIdx === -1) return;

    columnOrder.splice(srcIdx, 1);
    columnOrder.splice(targetIdx, 0, dragSrcCol);

    // Reorder header
    reorderTableHeader();
    renderTable();
    th.classList.remove('col-drag-over');
  });

  headerRow.addEventListener('dragend', () => {
    headerRow.querySelectorAll('th').forEach(th => {
      th.classList.remove('col-dragging', 'col-drag-over');
    });
    dragSrcCol = null;
  });
}

function reorderTableHeader() {
  const headerRow = document.getElementById('table-header-row');
  const ths = {};
  headerRow.querySelectorAll('[data-col]').forEach(th => {
    ths[th.dataset.col] = th;
  });

  // Remove all
  while (headerRow.firstChild) headerRow.removeChild(headerRow.firstChild);

  // Re-add in new order
  columnOrder.forEach(col => {
    if (ths[col]) headerRow.appendChild(ths[col]);
  });

  // Re-attach sort handlers
  headerRow.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (currentSort.field === field) {
        currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.field = field;
        currentSort.dir = 'asc';
      }
      headerRow.querySelectorAll('.sortable').forEach(t => t.classList.remove('active'));
      th.classList.add('active');
      th.querySelector('.sort-arrow').textContent = currentSort.dir === 'asc' ? '↑' : '↓';
      renderTable();
    });
  });
}

// ═══════════════════════════════════════════
// Workspace Profiles Module (Quick Launch)
// ═══════════════════════════════════════════

const PROFILES_KEY = 'portpolice_profiles';
let qlRunningProjects = [];
let editingProfileId = null;
let editorServices = [];
let selectedIcon = '🚀';

function getProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]'); }
  catch { return []; }
}

function saveProfilesData(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function initQuickLaunch() {
  const modal = $('#quick-launch-modal');

  // Open modal
  $('#btn-quick-launch').addEventListener('click', () => {
    modal.classList.remove('hidden');
    showListView();
    refreshRunningProjects();
  });

  // Close modal
  $('#ql-close').addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  // New profile button
  $('#ql-new-profile').addEventListener('click', () => openEditor(null));

  // Back button
  $('#ql-back').addEventListener('click', () => showListView());

  // Icon picker
  document.getElementById('ql-icon-picker').addEventListener('click', (e) => {
    const btn = e.target.closest('.ql-icon-opt');
    if (!btn) return;
    selectedIcon = btn.dataset.icon;
    document.querySelectorAll('.ql-icon-opt').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });

  // Add service
  $('#ql-add-service').addEventListener('click', () => {
    editorServices.push({
      id: `svc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: '', folder: '', port: '', command: 'npm run dev', customCommand: ''
    });
    renderEditorServices();
  });

  // Save profile
  $('#ql-save-profile').addEventListener('click', () => saveCurrentProfile());

  // Listen for project events
  window.portPolice.onProjectStopped((id, code, errMsg) => {
    if (code !== 0 && errMsg) {
      showToast('error', t('serviceExited', {code, msg: errMsg}));
    } else if (code !== 0) {
      showToast('warning', t('serviceExitedCode', {code}));
    } else {
      showToast('info', t('serviceStopped'));
    }
    refreshRunningProjects();
    renderProfilesList();
    setTimeout(() => refreshPorts(), 1000);
  });

  window.portPolice.onProjectError((id, msg) => {
    showToast('error', t('serviceError', {msg}));
    refreshRunningProjects();
    renderProfilesList();
  });
}

// ─── View Navigation ───

function showListView() {
  $('#ql-view-list').classList.remove('hidden');
  $('#ql-view-editor').classList.add('hidden');
  $('#ql-back').classList.add('hidden');
  $('#ql-new-profile').classList.remove('hidden');
  $('#ql-title').textContent = t('quickLaunchTitle');
  renderProfilesList();
  refreshRunningProjects();
}

function showEditorView(title) {
  $('#ql-view-list').classList.add('hidden');
  $('#ql-view-editor').classList.remove('hidden');
  $('#ql-back').classList.remove('hidden');
  $('#ql-new-profile').classList.add('hidden');
  $('#ql-title').textContent = title;
}

// ─── Profile Editor ───

function openEditor(profileId) {
  editingProfileId = profileId;

  if (profileId) {
    const profiles = getProfiles();
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    $('#ql-profile-name').value = profile.name;
    selectedIcon = profile.icon || '🚀';
    editorServices = profile.services.map(s => ({ ...s }));
    showEditorView(t('editProfile'));
  } else {
    $('#ql-profile-name').value = '';
    selectedIcon = '🚀';
    editorServices = [{
      id: `svc-${Date.now()}`, name: '', folder: '', port: '', command: 'npm run dev', customCommand: ''
    }];
    showEditorView(t('newProfileTitle'));
  }

  // Update icon picker
  document.querySelectorAll('.ql-icon-opt').forEach(b => {
    b.classList.toggle('selected', b.dataset.icon === selectedIcon);
  });

  renderEditorServices();
}

function renderEditorServices() {
  const list = document.getElementById('ql-services-list');
  const presets = ['npm start', 'npm run dev', 'yarn start', 'yarn dev', 'pnpm start', 'pnpm dev', 'npx vite', 'npx next dev', 'node server.js', 'python manage.py runserver'];

  list.innerHTML = editorServices.map((svc, idx) => {
    const isCustom = svc.command && !presets.includes(svc.command);
    const currentCmd = isCustom ? 'custom' : svc.command;

    return `
      <div class="ql-svc-card" data-svc-idx="${idx}">
        <div class="ql-svc-top">
          <span class="ql-svc-num">${t('service')} ${idx + 1}</span>
          ${editorServices.length > 1 ? `<button type="button" class="ql-svc-remove" data-remove-idx="${idx}" title="${t('removeService')}">✕</button>` : ''}
        </div>
        <div class="ql-svc-body">
          <div class="ql-svc-row">
            <input type="text" class="ql-input ql-svc-name" value="${escapeHtml(svc.name)}" placeholder="Service name (e.g. Frontend)" data-idx="${idx}" maxlength="30">
          </div>
          <div class="ql-svc-row">
            <div class="ql-folder-row">
              <input type="text" class="ql-input ql-svc-folder" value="${escapeHtml(svc.folder)}" placeholder="Select project folder..." readonly data-idx="${idx}">
              <button type="button" class="ql-browse-btn ql-svc-browse" data-idx="${idx}">Browse</button>
            </div>
          </div>
          <div class="ql-svc-row-pair">
            <div class="ql-svc-col-sm">
              <input type="number" class="ql-input ql-svc-port" value="${svc.port}" placeholder="Port" min="1" max="65535" data-idx="${idx}">
            </div>
            <div class="ql-svc-col-lg">
              <select class="ql-select ql-svc-cmd" data-idx="${idx}">
                ${presets.map(p => `<option value="${escapeHtml(p)}" ${currentCmd === p ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('')}
                <option value="custom" ${isCustom ? 'selected' : ''}>Custom...</option>
              </select>
            </div>
          </div>
          ${isCustom ? `<div class="ql-svc-row">
            <input type="text" class="ql-input ql-svc-custom" value="${escapeHtml(svc.customCommand || svc.command)}" placeholder="Enter custom command..." data-idx="${idx}">
          </div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Browse buttons
  list.querySelectorAll('.ql-svc-browse').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx);
      const folder = await window.portPolice.selectFolder();
      if (folder) {
        editorServices[idx].folder = folder;
        if (!editorServices[idx].name) {
          editorServices[idx].name = folder.split('\\').pop().split('/').pop();
        }
        renderEditorServices();
      }
    });
  });

  // Folder input click
  list.querySelectorAll('.ql-svc-folder').forEach(inp => {
    inp.addEventListener('click', async () => {
      const idx = parseInt(inp.dataset.idx);
      const folder = await window.portPolice.selectFolder();
      if (folder) {
        editorServices[idx].folder = folder;
        if (!editorServices[idx].name) {
          editorServices[idx].name = folder.split('\\').pop().split('/').pop();
        }
        renderEditorServices();
      }
    });
  });

  // Name inputs
  list.querySelectorAll('.ql-svc-name').forEach(inp => {
    inp.addEventListener('input', () => {
      editorServices[parseInt(inp.dataset.idx)].name = inp.value;
    });
  });

  // Port inputs
  list.querySelectorAll('.ql-svc-port').forEach(inp => {
    inp.addEventListener('input', () => {
      editorServices[parseInt(inp.dataset.idx)].port = inp.value;
    });
  });

  // Command selects
  list.querySelectorAll('.ql-svc-cmd').forEach(sel => {
    sel.addEventListener('change', () => {
      const idx = parseInt(sel.dataset.idx);
      if (sel.value === 'custom') {
        editorServices[idx].command = editorServices[idx].customCommand || '';
      } else {
        editorServices[idx].command = sel.value;
      }
      renderEditorServices();
    });
  });

  // Custom command inputs
  list.querySelectorAll('.ql-svc-custom').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = parseInt(inp.dataset.idx);
      editorServices[idx].command = inp.value;
      editorServices[idx].customCommand = inp.value;
    });
  });

  // Remove buttons
  list.querySelectorAll('.ql-svc-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      editorServices.splice(parseInt(btn.dataset.removeIdx), 1);
      renderEditorServices();
    });
  });
}

function saveCurrentProfile() {
  const name = document.getElementById('ql-profile-name').value.trim();
  if (!name) {
    showToast('warning', t('enterProfileName'));
    return;
  }

  const validServices = editorServices.filter(s => s.folder && s.command);
  if (validServices.length === 0) {
    showToast('warning', t('addAtLeastOneService'));
    return;
  }

  const profiles = getProfiles();
  const profileData = {
    id: editingProfileId || `profile-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    icon: selectedIcon,
    services: validServices.map(s => ({
      id: s.id || `svc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: s.name || s.folder.split('\\').pop().split('/').pop(),
      folder: s.folder,
      port: s.port,
      command: s.command,
      customCommand: s.customCommand || ''
    })),
    createdAt: editingProfileId
      ? (profiles.find(p => p.id === editingProfileId)?.createdAt || Date.now())
      : Date.now()
  };

  if (editingProfileId) {
    const idx = profiles.findIndex(p => p.id === editingProfileId);
    if (idx >= 0) profiles[idx] = profileData;
  } else {
    profiles.unshift(profileData);
  }

  saveProfilesData(profiles);
  showToast('success', editingProfileId ? t('profileUpdated') : t('profileCreated'));
  showListView();
}

// ─── Profile List View ───

function renderProfilesList() {
  const profiles = getProfiles();
  const grid = document.getElementById('ql-profiles-grid');
  const empty = document.getElementById('ql-empty-state');

  if (profiles.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  grid.innerHTML = profiles.map(profile => {
    const runningCount = getProfileRunningCount(profile);
    const totalServices = profile.services.length;
    const isRunning = runningCount > 0;

    return `
      <div class="ql-profile-card ${isRunning ? 'is-running' : ''}" data-profile-id="${escapeHtml(profile.id)}">
        <div class="ql-pc-header">
          <div class="ql-pc-title">
            <span class="ql-pc-icon">${profile.icon || '🚀'}</span>
            <span class="ql-pc-name">${escapeHtml(profile.name)}</span>
          </div>
          ${isRunning
            ? `<span class="ql-pc-status"><span class="ql-pc-status-dot"></span>${t('runningCount', { running: runningCount, total: totalServices })}</span>`
            : `<span class="ql-pc-count">${t('serviceCount', { count: totalServices })}</span>`}
        </div>
        <div class="ql-pc-services">
          ${profile.services.map(svc => {
            const svcRunning = isServiceRunning(svc);
            return `
              <div class="ql-pc-svc ${svcRunning ? 'svc-running' : ''}">
                <div class="ql-pc-svc-info">
                  <span class="ql-pc-svc-name">${escapeHtml(svc.name)}</span>
                  <span class="ql-pc-svc-meta">${escapeHtml(svc.command)}${svc.port ? ' · :' + escapeHtml(String(svc.port)) : ''}</span>
                </div>
                ${svcRunning ? '<span class="ql-pc-svc-dot"></span>' : ''}
              </div>`;
          }).join('')}
        </div>
        <div class="ql-pc-actions">
          ${isRunning
            ? `<button type="button" class="ql-pc-btn stop" data-action="stop" data-profile-id="${escapeHtml(profile.id)}">${t('stopAll')}</button>`
            : `<button type="button" class="ql-pc-btn start" data-action="start" data-profile-id="${escapeHtml(profile.id)}">${t('startAll')}</button>`}
          <div class="ql-pc-actions-right">
            <button type="button" class="ql-pc-btn edit" data-action="edit" data-profile-id="${escapeHtml(profile.id)}" title="${t('editProfile')}">✏️</button>
            <button type="button" class="ql-pc-btn delete" data-action="delete" data-profile-id="${escapeHtml(profile.id)}" title="${t('deleteBtn')}">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach handlers
  grid.querySelectorAll('[data-action="start"]').forEach(btn => {
    btn.addEventListener('click', () => startAllServices(btn.dataset.profileId));
  });
  grid.querySelectorAll('[data-action="stop"]').forEach(btn => {
    btn.addEventListener('click', () => stopAllServices(btn.dataset.profileId));
  });
  grid.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => openEditor(btn.dataset.profileId));
  });
  grid.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteProfile(btn.dataset.profileId));
  });
}

function isServiceRunning(service) {
  return qlRunningProjects.some(p => p.status === 'running' && p.folder === service.folder);
}

function getProfileRunningCount(profile) {
  return profile.services.filter(s => isServiceRunning(s)).length;
}

// ─── Profile Actions ───

async function startAllServices(profileId) {
  const profiles = getProfiles();
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) return;

  const btn = document.querySelector(`[data-action="start"][data-profile-id="${profileId}"]`);
  if (btn) { btn.disabled = true; btn.textContent = t('starting'); }

  let successCount = 0;

  for (const svc of profile.services) {
    if (isServiceRunning(svc)) { successCount++; continue; }
    try {
      const result = await window.portPolice.launchProject({
        folder: svc.folder, port: svc.port, command: svc.command
      });
      if (result.success) {
        successCount++;
        if (result.data.hasPackageJson === false) {
          showToast('warning', t('noPackageJson', { name: svc.name }));
        }
      } else {
        showToast('error', t('svcError', { name: svc.name, error: result.error }));
      }
    } catch (err) {
      showToast('error', t('svcError', { name: svc.name, error: err.message }));
    }
  }

  if (successCount > 0) {
    showToast('success', t('startedServices', { count: successCount, name: profile.name }));
  }
  await refreshRunningProjects();
  renderProfilesList();
  setTimeout(() => refreshPorts(), 2000);
}

async function stopAllServices(profileId) {
  const profiles = getProfiles();
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) return;

  const btn = document.querySelector(`[data-action="stop"][data-profile-id="${profileId}"]`);
  if (btn) { btn.disabled = true; btn.textContent = t('stopping'); }

  const toStop = qlRunningProjects.filter(rp =>
    rp.status === 'running' && profile.services.some(s => s.folder === rp.folder)
  );

  for (const proj of toStop) {
    try { await window.portPolice.stopProject(proj.id); } catch {}
  }

  showToast('success', t('stoppedServices', { name: profile.name }));
  await refreshRunningProjects();
  renderProfilesList();
  setTimeout(() => refreshPorts(), 1000);
}

function deleteProfile(profileId) {
  const profiles = getProfiles();
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) return;
  if (!confirm(t('deleteConfirm', { name: profile.name }))) return;

  saveProfilesData(profiles.filter(p => p.id !== profileId));
  showToast('info', t('profileDeleted', { name: profile.name }));
  renderProfilesList();
}

// ─── Running Services ───

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
    list.innerHTML = `<div class="ql-empty-text">${t('noRunningServices')}</div>`;
    return;
  }

  list.innerHTML = running.map(p => `
    <div class="ql-run-item">
      <div class="ql-run-info">
        <div class="ql-run-name">📂 ${escapeHtml(p.folderName)}</div>
        <div class="ql-run-meta">${escapeHtml(p.command)} ${p.port ? '· :' + p.port : ''} · ${escapeHtml(p.startTime)}</div>
      </div>
      <span class="ql-run-badge"><span class="ql-run-dot"></span>${t('runningBadge')}</span>
      <button type="button" class="ql-run-stop" data-stop-id="${escapeHtml(p.id)}">${t('stopBtn')}</button>
    </div>
  `).join('');

  list.querySelectorAll('.ql-run-stop').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      btn.textContent = '⏳...';
      btn.disabled = true;
      try {
        const result = await window.portPolice.stopProject(btn.dataset.stopId);
        if (result.success) {
          showToast('success', t('serviceStopped'));
        } else {
          showToast('error', t('stopFailed', { error: result.error }));
        }
      } catch (err) {
        showToast('error', err.message);
      }
    });
  });
}
