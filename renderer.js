/**
 * Talha Download Manager (TDM) - Renderer Module
 * Vanilla JavaScript implementation managing downloads, multi-stream rendering,
 * unified desktop/web bridge, modals, context menus, and telemetry.
 */

// Unified Bridge (Transparently supports Electron preload IPC and Web Express backend)
const Bridge = {
  isElectron: typeof window.tdmAPI !== 'undefined' && window.tdmAPI.isElectron === true,

  async probeUrl(url) {
    if (this.isElectron) return window.tdmAPI.probeUrl(url);
    const res = await fetch('/api/download/probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    return res.json();
  },

  async startDownload(options) {
    if (this.isElectron) return window.tdmAPI.startDownload(options);
    const res = await fetch('/api/download/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    return res.json();
  },

  async pauseDownload(id) {
    if (this.isElectron) return window.tdmAPI.pauseDownload(id);
    const res = await fetch('/api/download/pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    return res.json();
  },

  async resumeDownload(id) {
    if (this.isElectron) return window.tdmAPI.resumeDownload(id);
    const res = await fetch('/api/download/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    return res.json();
  },

  async pauseAll() {
    if (this.isElectron) return window.tdmAPI.pauseAll();
    const res = await fetch('/api/download/pause-all', { method: 'POST' });
    return res.json();
  },

  async resumeAll() {
    if (this.isElectron) return window.tdmAPI.resumeAll();
    const res = await fetch('/api/download/resume-all', { method: 'POST' });
    return res.json();
  },

  async deleteDownload(id, deleteFile = false) {
    if (this.isElectron) return window.tdmAPI.deleteDownload(id, deleteFile);
    const res = await fetch('/api/download/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, deleteFile })
    });
    return res.json();
  },

  async getDiskInfo() {
    if (this.isElectron) return window.tdmAPI.getDiskInfo();
    const res = await fetch('/api/system/info');
    return res.json();
  },

  async selectFolder() {
    if (this.isElectron) return window.tdmAPI.selectFolder();
    const newPath = prompt('Enter custom download folder path:', 'C:\\Downloads');
    return newPath;
  },

  async openFile(filePath) {
    if (this.isElectron) return window.tdmAPI.openFile(filePath);
    window.showToast('Opened in Downloads directory: ' + (filePath || 'File'), 'success');
  },

  async openFolder(folderPath) {
    if (this.isElectron) return window.tdmAPI.openFolder(folderPath);
    window.showToast('Download folder: ' + (folderPath || './downloads/'), 'info');
  },

  async probeVideo(url) {
    const res = await fetch('/api/video/probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    return res.json();
  },

  // Window Controls
  minimize() {
    if (this.isElectron) window.tdmAPI.minimize();
    else window.showToast('Window minimized', 'info');
  },
  maximize() {
    if (this.isElectron) window.tdmAPI.maximize();
    else window.showToast('Window maximized / restored', 'info');
  },
  close() {
    if (this.isElectron) window.tdmAPI.close();
    else window.showToast('Talha Download Manager running in background tray', 'info');
  }
};

// Application State
const state = {
  downloads: [],
  selectedIds: new Set(),
  currentCategory: 'all',
  searchQuery: '',
  sortField: 'date',
  sortDirection: 'desc',
  activeContextId: null,
  activeTargetDeleteId: null,
  systemInfo: null,
  videoProbeData: null,
  selectedVideoFormat: null,
  audioContext: null
};

// Initial Seed Data for immediate testing & realistic look
const SEED_DOWNLOADS = [
  {
    id: 'tdm_seed_1',
    filename: 'Windows_11_Enterprise_24H2_x64.iso',
    url: 'https://software.download.microsoft.com/win11/Windows_11_24H2.iso',
    savePath: 'C:\\Users\\Downloads',
    totalBytes: 5642534912,
    downloadedBytes: 5642534912,
    percent: 100,
    speed: 0,
    timeRemaining: 0,
    status: 'completed',
    supportsRange: true,
    category: 'compressed',
    date: new Date(Date.now() - 3600000 * 4).toISOString(),
    segments: [{ id: 1, progress: 100 }, { id: 2, progress: 100 }, { id: 3, progress: 100 }, { id: 4, progress: 100 }]
  },
  {
    id: 'tdm_seed_2',
    filename: 'Talha_Download_Manager_User_Manual.pdf',
    url: 'https://tdm.local/docs/TDM_Documentation_v1.0.pdf',
    savePath: 'C:\\Users\\Downloads',
    totalBytes: 14852920,
    downloadedBytes: 14852920,
    percent: 100,
    speed: 0,
    timeRemaining: 0,
    status: 'completed',
    supportsRange: true,
    category: 'documents',
    date: new Date(Date.now() - 3600000 * 2).toISOString(),
    segments: [{ id: 1, progress: 100 }]
  },
  {
    id: 'tdm_seed_3',
    filename: 'Cyberpunk_Synthwave_Lossless_Album.flac',
    url: 'https://audiostreams.example/flac/synthwave_2026.flac',
    savePath: 'C:\\Users\\Downloads',
    totalBytes: 68420100,
    downloadedBytes: 42100000,
    percent: 61.5,
    speed: 0,
    timeRemaining: 0,
    status: 'paused',
    supportsRange: true,
    category: 'music',
    date: new Date(Date.now() - 3600000 * 1).toISOString(),
    segments: [{ id: 1, progress: 70 }, { id: 2, progress: 62 }, { id: 3, progress: 55 }, { id: 4, progress: 59 }]
  }
];

// Initialize State
function initApp() {
  const saved = localStorage.getItem('tdm_downloads');
  if (saved) {
    try {
      state.downloads = JSON.parse(saved);
    } catch (e) {
      state.downloads = [...SEED_DOWNLOADS];
    }
  } else {
    state.downloads = [...SEED_DOWNLOADS];
  }

  // Setup Event Listeners
  setupWindowControls();
  setupMenuEvents();
  setupToolbarEvents();
  setupSearchAndFilter();
  setupTableEvents();
  setupContextMenu();
  setupModals();
  setupQuickTestBar();

  // Load Disk and System Info
  loadSystemInfo();

  // Connect SSE or Electron Events for Live Updates
  setupLiveUpdates();

  // Initial Render
  renderTable();
  updateCategoryBadges();
}

function saveState() {
  try {
    localStorage.setItem('tdm_downloads', JSON.stringify(state.downloads));
  } catch (e) {}
}

// Window Titlebar Controls
function setupWindowControls() {
  document.getElementById('btnWinMinimize')?.addEventListener('click', () => Bridge.minimize());
  document.getElementById('btnWinMaximize')?.addEventListener('click', () => Bridge.maximize());
  document.getElementById('btnWinClose')?.addEventListener('click', () => Bridge.close());
}

// Windows Menu Bar Dropdowns
function setupMenuEvents() {
  const menuItems = document.querySelectorAll('.tdm-menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = item.querySelector('.tdm-dropdown');
      const isShown = dropdown.classList.contains('show');
      closeAllDropdowns();
      if (!isShown) {
        dropdown.classList.add('show');
        item.classList.add('active');
      }
    });
  });

  document.addEventListener('click', () => closeAllDropdowns());

  function closeAllDropdowns() {
    document.querySelectorAll('.tdm-dropdown').forEach(d => d.classList.remove('show'));
    document.querySelectorAll('.tdm-menu-item').forEach(m => m.classList.remove('active'));
  }

  // Menu Actions
  document.getElementById('menuAddUrl')?.addEventListener('click', () => openModal('modalAddUrl'));
  document.getElementById('menuVideoGrabber')?.addEventListener('click', () => openModal('modalVideo'));
  document.getElementById('menuResumeAll')?.addEventListener('click', () => handleResumeAll());
  document.getElementById('menuStopAll')?.addEventListener('click', () => handleStopAll());
  document.getElementById('menuExit')?.addEventListener('click', () => Bridge.close());
  document.getElementById('menuOpenFolder')?.addEventListener('click', () => Bridge.openFolder());
  document.getElementById('menuChangeFolder')?.addEventListener('click', () => handleChangeFolder());
  document.getElementById('menuQueues')?.addEventListener('click', () => openModal('modalQueues'));
  document.getElementById('menuScheduler')?.addEventListener('click', () => openModal('modalScheduler'));
  document.getElementById('menuOptions')?.addEventListener('click', () => openModal('modalOptions'));
  document.getElementById('menuExtensionSetup')?.addEventListener('click', () => openModal('modalExtension'));
  document.getElementById('menuInstallerGuide')?.addEventListener('click', () => openModal('modalInstaller'));
  document.getElementById('menuAbout')?.addEventListener('click', () => openModal('modalAbout'));
  document.getElementById('menuToggleTheme')?.addEventListener('click', () => toggleTheme());
  document.getElementById('menuRefreshTable')?.addEventListener('click', () => {
    renderTable();
    showToast('Download list refreshed', 'info');
  });
}

// IDM-Style Action Toolbar
function setupToolbarEvents() {
  document.getElementById('btnToolAddUrl')?.addEventListener('click', () => openModal('modalAddUrl'));
  document.getElementById('btnToolResume')?.addEventListener('click', () => handleResumeSelected());
  document.getElementById('btnToolStop')?.addEventListener('click', () => handleStopSelected());
  document.getElementById('btnToolStopAll')?.addEventListener('click', () => handleStopAll());
  document.getElementById('btnToolDelete')?.addEventListener('click', () => handleDeleteSelected());
  document.getElementById('btnToolVideo')?.addEventListener('click', () => openModal('modalVideo'));
  document.getElementById('btnToolQueues')?.addEventListener('click', () => openModal('modalQueues'));
  document.getElementById('btnToolScheduler')?.addEventListener('click', () => openModal('modalScheduler'));
  document.getElementById('btnToolExtension')?.addEventListener('click', () => openModal('modalExtension'));
  document.getElementById('btnToolFolder')?.addEventListener('click', () => Bridge.openFolder());
  document.getElementById('btnToolOptions')?.addEventListener('click', () => openModal('modalOptions'));
  document.getElementById('btnToolInstaller')?.addEventListener('click', () => openModal('modalInstaller'));
  document.getElementById('btnEmptyAdd')?.addEventListener('click', () => openModal('modalAddUrl'));
  document.getElementById('btnChangeStorageFolder')?.addEventListener('click', () => handleChangeFolder());
}

// Quick Test Downloads Bar
function setupQuickTestBar() {
  const chips = document.querySelectorAll('.tdm-test-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', async () => {
      const type = chip.getAttribute('data-test');
      let targetUrl = '';
      let filename = '';
      let category = 'other';

      if (type === '5mb') {
        targetUrl = window.location.origin + '/api/sample-files/5mb';
        filename = 'TDM_Benchmark_Test_5MB.bin';
        category = 'compressed';
      } else if (type === '25mb') {
        targetUrl = window.location.origin + '/api/sample-files/25mb';
        filename = 'TDM_Benchmark_Test_25MB.bin';
        category = 'compressed';
      } else if (type === '50mb') {
        targetUrl = window.location.origin + '/api/sample-files/50mb';
        filename = 'TDM_HighSpeed_Packet_50MB.bin';
        category = 'compressed';
      } else if (type === 'video') {
        targetUrl = window.location.origin + '/api/sample-files/25mb';
        filename = 'Sample_4K_60FPS_Showcase.mp4';
        category = 'videos';
      } else if (type === 'audio') {
        targetUrl = window.location.origin + '/api/sample-files/5mb';
        filename = 'Sample_Cyberpunk_Master_320k.mp3';
        category = 'music';
      } else if (type === 'doc') {
        targetUrl = window.location.origin + '/api/sample-files/5mb';
        filename = 'Talha_Download_Manager_Reference.pdf';
        category = 'documents';
      }

      showToast(`Initiating download for ${filename}...`, 'info');
      await startNewDownload({
        url: targetUrl,
        filename,
        category,
        autoStart: true
      });
    });
  });
}

// Search & Filtering
function setupSearchAndFilter() {
  const searchInput = document.getElementById('searchInput');
  searchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderTable();
  });

  // Shortcut Ctrl+F
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      searchInput?.focus();
    }
  });

  // Category items
  const catItems = document.querySelectorAll('.tdm-category-item');
  catItems.forEach(item => {
    item.addEventListener('click', () => {
      catItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      state.currentCategory = item.getAttribute('data-cat');
      renderTable();
    });
  });
}

// Table Events (Selection & Sorting)
function setupTableEvents() {
  const selectAll = document.getElementById('selectAllCheckbox');
  selectAll?.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    state.selectedIds.clear();
    if (isChecked) {
      getFilteredDownloads().forEach(d => state.selectedIds.add(d.id));
    }
    renderTable();
  });

  // Sorting
  const headers = document.querySelectorAll('.tdm-table th[data-sort]');
  headers.forEach(th => {
    th.addEventListener('click', () => {
      const field = th.getAttribute('data-sort');
      if (state.sortField === field) {
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortField = field;
        state.sortDirection = 'asc';
      }

      headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
      th.classList.add(state.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');

      renderTable();
    });
  });
}

// Filtered Downloads
function getFilteredDownloads() {
  return state.downloads.filter(item => {
    // Category match
    if (state.currentCategory === 'unfinished') {
      if (item.status === 'completed') return false;
    } else if (state.currentCategory === 'finished') {
      if (item.status !== 'completed') return false;
    } else if (state.currentCategory !== 'all') {
      if (item.category !== state.currentCategory) return false;
    }

    // Search query match
    if (state.searchQuery) {
      const q = state.searchQuery;
      const matchName = item.filename.toLowerCase().includes(q);
      const matchUrl = item.url.toLowerCase().includes(q);
      const matchCat = (item.category || '').toLowerCase().includes(q);
      if (!matchName && !matchUrl && !matchCat) return false;
    }

    return true;
  }).sort((a, b) => {
    let factor = state.sortDirection === 'asc' ? 1 : -1;
    if (state.sortField === 'name') return factor * a.filename.localeCompare(b.filename);
    if (state.sortField === 'size') return factor * ((a.totalBytes || 0) - (b.totalBytes || 0));
    if (state.sortField === 'status') return factor * a.status.localeCompare(b.status);
    if (state.sortField === 'progress') return factor * ((a.percent || 0) - (b.percent || 0));
    if (state.sortField === 'speed') return factor * ((a.speed || 0) - (b.speed || 0));
    if (state.sortField === 'timeRemaining') return factor * ((a.timeRemaining || 0) - (b.timeRemaining || 0));
    return factor * (new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
  });
}

// Render Table
function renderTable() {
  const tbody = document.getElementById('downloadTableBody');
  const emptyState = document.getElementById('emptyState');
  const filtered = getFilteredDownloads();

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';

  let html = '';
  filtered.forEach(item => {
    const isSelected = state.selectedIds.has(item.id);
    const catIcon = getCategorySvg(item.category);
    const formattedSize = formatBytes(item.totalBytes);
    const formattedSpeed = item.speed > 0 ? formatSpeed(item.speed) : '--';
    const formattedEta = item.status === 'downloading' && item.timeRemaining > 0 ? formatEta(item.timeRemaining) : '--';
    const formattedDate = formatDate(item.date);

    // Multi-segment progress visualizer (IDM style)
    let segmentsHtml = '';
    const segments = item.segments || [{ id: 1, progress: item.percent || 0 }];
    segments.forEach(seg => {
      segmentsHtml += `
        <div class="tdm-segment-unit" title="Connection Stream: ${Math.round(seg.progress || 0)}%">
          <div class="tdm-segment-fill" style="width: ${Math.min(100, seg.progress || 0)}%;"></div>
        </div>
      `;
    });

    html += `
      <tr class="${isSelected ? 'selected' : ''}" data-id="${item.id}">
        <td style="text-align: center;">
          <input type="checkbox" class="row-checkbox" ${isSelected ? 'checked' : ''} />
        </td>
        <td>
          <div class="tdm-file-cell">
            <div class="tdm-file-icon">
              ${catIcon}
            </div>
            <div class="tdm-file-details">
              <div class="tdm-file-name" title="${escapeHtml(item.filename)}">${escapeHtml(item.filename)}</div>
              <div class="tdm-file-subtext">${formatBytes(item.downloadedBytes)} / ${formattedSize} • ${item.supportsRange ? 'Resume Ready' : 'Direct'}</div>
            </div>
          </div>
        </td>
        <td>${formattedSize}</td>
        <td>
          <span class="tdm-status-badge ${item.status}">
            <span class="tdm-status-dot"></span>
            <span>${capitalize(item.status)}</span>
          </span>
        </td>
        <td>
          <div class="tdm-progress-cell">
            <div class="tdm-progress-bar">
              <div class="tdm-progress-fill" style="width: ${item.percent || 0}%;"></div>
            </div>
            <div class="tdm-progress-meta">
              <span>${item.percent ? item.percent.toFixed(1) : '0.0'}%</span>
              <span>${item.status === 'downloading' ? (segments.length + ' conn') : ''}</span>
            </div>
            <div class="tdm-segments-bar">
              ${segmentsHtml}
            </div>
          </div>
        </td>
        <td style="font-family: monospace; color: ${item.speed > 0 ? '#00f5ff' : 'var(--text-secondary)'}; font-weight: 600;">
          ${formattedSpeed}
        </td>
        <td style="font-family: monospace;">${formattedEta}</td>
        <td>${formattedDate}</td>
        <td>
          <div class="tdm-row-actions">
            ${item.status === 'downloading'
              ? `<button class="tdm-action-icon-btn btn-pause" title="Pause"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12"/></svg></button>`
              : item.status !== 'completed'
              ? `<button class="tdm-action-icon-btn btn-resume" title="Resume"><svg viewBox="0 0 24 24" fill="none" stroke="#3fb950" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>`
              : `<button class="tdm-action-icon-btn btn-open-file" title="Open File"><svg viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button>`
            }
            <button class="tdm-action-icon-btn btn-props" title="Properties & Telemetry">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </button>
            <button class="tdm-action-icon-btn btn-del" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f85149" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // Bind Row Click Events
  tbody.querySelectorAll('tr').forEach(tr => {
    const id = tr.getAttribute('data-id');

    tr.addEventListener('click', (e) => {
      if (e.target.closest('.tdm-action-icon-btn') || e.target.classList.contains('row-checkbox')) return;
      if (e.ctrlKey || e.metaKey) {
        if (state.selectedIds.has(id)) state.selectedIds.delete(id);
        else state.selectedIds.add(id);
      } else {
        state.selectedIds.clear();
        state.selectedIds.add(id);
      }
      renderTable();
    });

    tr.querySelector('.row-checkbox')?.addEventListener('change', (e) => {
      if (e.target.checked) state.selectedIds.add(id);
      else state.selectedIds.delete(id);
      renderTable();
    });

    tr.querySelector('.btn-pause')?.addEventListener('click', () => handlePause(id));
    tr.querySelector('.btn-resume')?.addEventListener('click', () => handleResume(id));
    tr.querySelector('.btn-open-file')?.addEventListener('click', () => {
      const item = state.downloads.find(d => d.id === id);
      if (item) Bridge.openFile(item.targetFile || item.filename);
    });
    tr.querySelector('.btn-props')?.addEventListener('click', () => openPropertiesModal(id));
    tr.querySelector('.btn-del')?.addEventListener('click', () => promptDelete(id));

    // Right-click context menu
    tr.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      state.activeContextId = id;
      state.selectedIds.clear();
      state.selectedIds.add(id);
      renderTable();
      showContextMenu(e.clientX, e.clientY, id);
    });
  });

  updateStatusBar();
}

// Context Menu Setup
function setupContextMenu() {
  const menu = document.getElementById('contextMenu');

  document.addEventListener('click', () => {
    menu.classList.remove('show');
  });

  document.getElementById('ctxResume')?.addEventListener('click', () => {
    if (state.activeContextId) handleResume(state.activeContextId);
  });
  document.getElementById('ctxPause')?.addEventListener('click', () => {
    if (state.activeContextId) handlePause(state.activeContextId);
  });
  document.getElementById('ctxOpenFile')?.addEventListener('click', () => {
    const item = state.downloads.find(d => d.id === state.activeContextId);
    if (item) Bridge.openFile(item.targetFile || item.filename);
  });
  document.getElementById('ctxOpenFolder')?.addEventListener('click', () => {
    Bridge.openFolder();
  });
  document.getElementById('ctxCopyUrl')?.addEventListener('click', () => {
    const item = state.downloads.find(d => d.id === state.activeContextId);
    if (item && item.url) {
      navigator.clipboard.writeText(item.url);
      showToast('Download URL copied to clipboard', 'success');
    }
  });
  document.getElementById('ctxProperties')?.addEventListener('click', () => {
    if (state.activeContextId) openPropertiesModal(state.activeContextId);
  });
  document.getElementById('ctxDelete')?.addEventListener('click', () => {
    if (state.activeContextId) promptDelete(state.activeContextId);
  });
}

function showContextMenu(x, y, id) {
  const menu = document.getElementById('contextMenu');
  const item = state.downloads.find(d => d.id === id);
  if (!item) return;

  const ctxResume = document.getElementById('ctxResume');
  const ctxPause = document.getElementById('ctxPause');
  const ctxOpenFile = document.getElementById('ctxOpenFile');

  if (item.status === 'downloading') {
    ctxResume.style.display = 'none';
    ctxPause.style.display = 'flex';
  } else if (item.status === 'completed') {
    ctxResume.style.display = 'none';
    ctxPause.style.display = 'none';
  } else {
    ctxResume.style.display = 'flex';
    ctxPause.style.display = 'none';
  }

  ctxOpenFile.style.display = item.status === 'completed' ? 'flex' : 'none';

  // Position within viewport
  const winWidth = window.innerWidth;
  const winHeight = window.innerHeight;
  menu.style.left = Math.min(x, winWidth - 220) + 'px';
  menu.style.top = Math.min(y, winHeight - 260) + 'px';
  menu.classList.add('show');
}

// Download Actions
async function handleResume(id) {
  const item = state.downloads.find(d => d.id === id);
  if (!item) return;
  item.status = 'downloading';
  renderTable();
  updateCategoryBadges();
  showToast(`Resuming ${item.filename}...`, 'info');
  await Bridge.resumeDownload(id);
}

async function handlePause(id) {
  const item = state.downloads.find(d => d.id === id);
  if (!item) return;
  item.status = 'paused';
  item.speed = 0;
  item.timeRemaining = 0;
  renderTable();
  updateCategoryBadges();
  showToast(`Paused ${item.filename}`, 'warning');
  await Bridge.pauseDownload(id);
}

async function handleResumeSelected() {
  if (state.selectedIds.size === 0) {
    showToast('Select a download to resume', 'warning');
    return;
  }
  for (const id of state.selectedIds) {
    handleResume(id);
  }
}

async function handleStopSelected() {
  if (state.selectedIds.size === 0) {
    showToast('Select a download to pause', 'warning');
    return;
  }
  for (const id of state.selectedIds) {
    handlePause(id);
  }
}

async function handleResumeAll() {
  showToast('Resuming all paused downloads...', 'info');
  await Bridge.resumeAll();
  state.downloads.forEach(d => {
    if (d.status === 'paused' || d.status === 'error') d.status = 'downloading';
  });
  renderTable();
  updateCategoryBadges();
}

async function handleStopAll() {
  showToast('Stopping all active downloads...', 'warning');
  await Bridge.pauseAll();
  state.downloads.forEach(d => {
    if (d.status === 'downloading') {
      d.status = 'paused';
      d.speed = 0;
    }
  });
  renderTable();
  updateCategoryBadges();
}

function promptDelete(id) {
  state.activeTargetDeleteId = id;
  const item = state.downloads.find(d => d.id === id);
  if (item) {
    document.getElementById('deleteTargetName').textContent = item.filename;
  }
  openModal('modalDelete');
}

function handleDeleteSelected() {
  if (state.selectedIds.size === 0) {
    showToast('Select a download to delete', 'warning');
    return;
  }
  const firstId = Array.from(state.selectedIds)[0];
  promptDelete(firstId);
}

// Start New Download
async function startNewDownload(options) {
  try {
    const res = await Bridge.startDownload(options);
    if (res.success && res.task) {
      // Add or update task
      const existingIdx = state.downloads.findIndex(d => d.id === res.task.id);
      if (existingIdx >= 0) {
        state.downloads[existingIdx] = { ...state.downloads[existingIdx], ...res.task, date: new Date().toISOString() };
      } else {
        state.downloads.unshift({
          ...res.task,
          date: new Date().toISOString()
        });
      }
      saveState();
      renderTable();
      updateCategoryBadges();
      showToast(`Added: ${res.task.filename}`, 'success');
    } else {
      showToast('Download error: ' + (res.error || 'Failed to start'), 'error');
    }
  } catch (err) {
    showToast('Download error: ' + err.message, 'error');
  }
}

// Modals Management
function setupModals() {
  // Modal close buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      closeModal(modalId);
    });
  });

  // Modal 1: Add URL Logic
  const btnProbeUrl = document.getElementById('btnProbeUrl');
  const inputAddUrl = document.getElementById('inputAddUrl');
  const inputAddFilename = document.getElementById('inputAddFilename');
  const selectAddCategory = document.getElementById('selectAddCategory');
  const inputAddSavePath = document.getElementById('inputAddSavePath');
  const probeResultBox = document.getElementById('probeResultBox');

  btnProbeUrl?.addEventListener('click', async () => {
    const url = inputAddUrl.value.trim();
    if (!url) return;
    btnProbeUrl.textContent = 'Probing...';
    try {
      const probe = await Bridge.probeUrl(url);
      if (probe.success && probe.data) {
        const d = probe.data;
        probeResultBox.style.display = 'block';
        document.getElementById('probeSize').textContent = formatBytes(d.totalBytes);
        document.getElementById('probeRange').textContent = d.supportsRange ? 'Supported (Multi-Segment Resumable)' : 'Single stream only';
        document.getElementById('probeRange').style.color = d.supportsRange ? '#3fb950' : '#d29922';
        document.getElementById('probeType').textContent = d.contentType;
        inputAddFilename.value = d.filename;
        if (d.category) selectAddCategory.value = d.category;
        showToast('Remote URL verified and ready', 'success');
      } else {
        showToast('Probe failed: ' + (probe.error || 'Could not verify URL'), 'warning');
      }
    } catch (e) {
      showToast('Could not reach remote server', 'error');
    } finally {
      btnProbeUrl.textContent = 'Inspect';
    }
  });

  document.getElementById('btnStartDownloadNow')?.addEventListener('click', async () => {
    const url = inputAddUrl.value.trim();
    if (!url) {
      showToast('Please enter a valid URL', 'warning');
      return;
    }
    const filename = inputAddFilename.value.trim();
    const category = selectAddCategory.value === 'auto' ? undefined : selectAddCategory.value;

    closeModal('modalAddUrl');
    await startNewDownload({ url, filename, category, autoStart: true });
    inputAddUrl.value = '';
    inputAddFilename.value = '';
    probeResultBox.style.display = 'none';
  });

  document.getElementById('btnDownloadLater')?.addEventListener('click', async () => {
    const url = inputAddUrl.value.trim();
    if (!url) return;
    const filename = inputAddFilename.value.trim();
    const category = selectAddCategory.value === 'auto' ? undefined : selectAddCategory.value;

    closeModal('modalAddUrl');
    await startNewDownload({ url, filename, category, autoStart: false });
    showToast('Saved to queue (Download Later)', 'info');
  });

  // Modal 2: Video Downloader Logic
  const btnProbeVideo = document.getElementById('btnProbeVideo');
  const inputVideoUrl = document.getElementById('inputVideoUrl');
  const videoResultsArea = document.getElementById('videoResultsArea');
  const videoFormatsList = document.getElementById('videoFormatsList');
  const btnDownloadSelectedVideo = document.getElementById('btnDownloadSelectedVideo');

  btnProbeVideo?.addEventListener('click', async () => {
    const url = inputVideoUrl.value.trim();
    if (!url) {
      showToast('Enter a video URL', 'warning');
      return;
    }
    btnProbeVideo.textContent = 'Analyzing...';
    try {
      const res = await Bridge.probeVideo(url);
      if (res.success && res.data) {
        state.videoProbeData = res.data;
        videoResultsArea.style.display = 'block';
        document.getElementById('videoTitle').textContent = res.data.title;
        document.getElementById('videoDuration').textContent = 'Duration: ' + res.data.duration;
        document.getElementById('videoAuthor').textContent = 'Author: ' + res.data.author;
        document.getElementById('videoThumb').src = res.data.thumbnail;

        // Render format cards
        let fHtml = '';
        res.data.formats.forEach((fmt, i) => {
          fHtml += `
            <div class="video-format-item ${fmt.recommended ? 'selected' : ''}" data-fmt-id="${fmt.id}" style="
              display: flex; justify-content: space-between; align-items: center;
              padding: 8px 12px; background: var(--bg-primary); border: 1px solid ${fmt.recommended ? '#00a3ff' : 'var(--border-color)'};
              border-radius: 6px; cursor: pointer; transition: all 0.15s ease;">
              <div>
                <div style="font-weight: 600; font-size: 12px; color: ${fmt.recommended ? '#00f5ff' : 'var(--text-main)'};">
                  ${fmt.label} ${fmt.recommended ? '<span style="font-size: 10px; background: #00a3ff; color: #000; padding: 1px 5px; border-radius: 4px; margin-left: 6px;">Best</span>' : ''}
                </div>
                <div style="font-size: 10px; color: var(--text-muted);">${fmt.codec} • ${fmt.note}</div>
              </div>
              <div style="text-align: right;">
                <span style="font-weight: 700; font-size: 12px; color: #fff;">~${fmt.estimatedSizeMb} MB</span>
              </div>
            </div>
          `;
        });
        videoFormatsList.innerHTML = fHtml;
        state.selectedVideoFormat = res.data.formats.find(f => f.recommended) || res.data.formats[0];
        btnDownloadSelectedVideo.disabled = false;

        // Bind format click
        videoFormatsList.querySelectorAll('.video-format-item').forEach(el => {
          el.addEventListener('click', () => {
            videoFormatsList.querySelectorAll('.video-format-item').forEach(f => {
              f.style.borderColor = 'var(--border-color)';
              f.classList.remove('selected');
            });
            el.style.borderColor = '#00a3ff';
            el.classList.add('selected');
            const fmtId = el.getAttribute('data-fmt-id');
            state.selectedVideoFormat = state.videoProbeData.formats.find(f => f.id === fmtId);
          });
        });
      } else {
        showToast(res.error || 'Could not analyze video', 'error');
      }
    } catch (e) {
      showToast('Failed to probe video URL: ' + e.message, 'error');
    } finally {
      btnProbeVideo.textContent = 'Fetch Formats';
    }
  });

  btnDownloadSelectedVideo?.addEventListener('click', async () => {
    if (!state.videoProbeData || !state.selectedVideoFormat) return;
    const fmt = state.selectedVideoFormat;
    const cleanTitle = state.videoProbeData.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = fmt.format.toLowerCase() === 'mp3' ? 'mp3' : 'mp4';
    const filename = `${cleanTitle}_[${fmt.id}].${ext}`;

    closeModal('modalVideo');
    await startNewDownload({
      url: state.videoProbeData.url,
      filename,
      category: ext === 'mp3' ? 'music' : 'videos',
      autoStart: true
    });
    showToast(`Downloading video: ${filename}`, 'success');
  });

  // Modal 3: Queue Settings
  document.getElementById('btnSaveQueueSettings')?.addEventListener('click', () => {
    const val = document.getElementById('selectMaxConcurrent').value;
    document.getElementById('statusQueueCap').textContent = `Concurrency: ${val} Max`;
    closeModal('modalQueues');
    showToast(`Concurrency limit updated to ${val}`, 'success');
  });

  // Modal 4: Scheduler
  document.getElementById('btnSaveScheduler')?.addEventListener('click', () => {
    closeModal('modalScheduler');
    showToast('Download schedule successfully configured', 'success');
  });

  // Modal 5: Settings / Options
  document.getElementById('btnSaveOptions')?.addEventListener('click', () => {
    closeModal('modalOptions');
    showToast('Settings saved successfully', 'success');
  });

  // Modal 6: Browser Extension Test Ping
  document.getElementById('btnTestExtBridge')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/system/info');
      if (res.ok) {
        showToast('TDM Native Bridge is active on port 3000! Ready to capture.', 'success');
      }
    } catch (e) {
      showToast('Bridge error: TDM server is offline', 'error');
    }
  });

  // Modal 9: Confirm Delete
  document.getElementById('btnConfirmDelete')?.addEventListener('click', async () => {
    const id = state.activeTargetDeleteId;
    const alsoDeleteFile = document.getElementById('checkDeleteFileFromDisk').checked;
    if (id) {
      state.downloads = state.downloads.filter(d => d.id !== id);
      state.selectedIds.delete(id);
      saveState();
      renderTable();
      updateCategoryBadges();
      closeModal('modalDelete');
      showToast(alsoDeleteFile ? 'Download and file removed' : 'Removed from download list', 'info');
      await Bridge.deleteDownload(id, alsoDeleteFile);
    }
  });
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('show');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('show');
}

// Download Properties Modal with Multi-Segment visualizer
function openPropertiesModal(id) {
  const item = state.downloads.find(d => d.id === id);
  if (!item) return;

  document.getElementById('propFileName').textContent = item.filename;
  document.getElementById('propUrl').textContent = item.url;
  document.getElementById('propStatus').textContent = capitalize(item.status);
  document.getElementById('propStatus').style.color = getStatusColor(item.status);
  document.getElementById('propTransferred').textContent = `${formatBytes(item.downloadedBytes)} of ${formatBytes(item.totalBytes)} (${item.percent?.toFixed(1) || 0}%)`;
  document.getElementById('propSpeed').textContent = item.speed > 0 ? formatSpeed(item.speed) : 'Idle';
  document.getElementById('propRange').textContent = item.supportsRange ? 'Yes (Byte-Range Supported)' : 'No (Single stream)';
  document.getElementById('propRange').style.color = item.supportsRange ? '#3fb950' : '#d29922';
  document.getElementById('propPath').textContent = item.targetFile || (item.savePath + '\\' + item.filename);

  const segContainer = document.getElementById('propSegmentsContainer');
  let segHtml = '';
  const segs = item.segments && item.segments.length > 0
    ? item.segments
    : [{ id: 1, progress: item.percent || 0 }, { id: 2, progress: item.percent || 0 }, { id: 3, progress: item.percent || 0 }, { id: 4, progress: item.percent || 0 }];

  segs.forEach((s, idx) => {
    segHtml += `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
          <span>Stream #${idx + 1} (Worker Thread)</span>
          <span style="color: #00f5ff; font-weight: 600;">${Math.round(s.progress || 0)}%</span>
        </div>
        <div style="height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;">
          <div style="height: 100%; width: ${Math.min(100, s.progress || 0)}%; background: linear-gradient(90deg, #00f5ff, #00a3ff); border-radius: 3px;"></div>
        </div>
      </div>
    `;
  });
  segContainer.innerHTML = segHtml;

  openModal('modalProperties');
}

// System & Disk Information
async function loadSystemInfo() {
  try {
    const info = await Bridge.getDiskInfo();
    state.systemInfo = info;
    if (info) {
      const freeGb = (info.freeBytes / (1024 ** 3)).toFixed(1);
      const totalGb = (info.totalBytes / (1024 ** 3)).toFixed(1);
      const usedPercent = Math.min(100, Math.round(((info.totalBytes - info.freeBytes) / info.totalBytes) * 100));

      document.getElementById('diskFreeText').textContent = `${freeGb} GB free`;
      document.getElementById('diskTotalText').textContent = `${totalGb} GB`;
      document.getElementById('diskBarFill').style.width = `${usedPercent}%`;
      document.getElementById('diskCurrentPath').textContent = info.downloadDir || 'C:\\Users\\Downloads';
      document.getElementById('inputAddSavePath').value = info.downloadDir || 'C:\\Users\\Downloads';
      document.getElementById('settingDownloadDir').value = info.downloadDir || 'C:\\Users\\Downloads';
    }
  } catch (e) {}
}

async function handleChangeFolder() {
  const chosen = await Bridge.selectFolder();
  if (chosen) {
    document.getElementById('diskCurrentPath').textContent = chosen;
    document.getElementById('inputAddSavePath').value = chosen;
    document.getElementById('settingDownloadDir').value = chosen;
    showToast(`Default download folder updated to: ${chosen}`, 'success');
  }
}

// Live Updates via SSE & Electron IPC
function setupLiveUpdates() {
  if (Bridge.isElectron) {
    window.tdmAPI.onProgress((data) => handleTaskProgressUpdate(data));
    window.tdmAPI.onStatus((payload) => handleTaskStatusUpdate(payload));
    window.tdmAPI.onCompleted((data) => handleTaskCompleted(data));
    window.tdmAPI.onError((data) => handleTaskError(data));
  } else {
    // SSE connection for Web preview
    const evtSource = new EventSource('/api/download/events');

    evtSource.addEventListener('progress', (e) => {
      try {
        const data = JSON.parse(e.data);
        handleTaskProgressUpdate(data);
      } catch (err) {}
    });

    evtSource.addEventListener('status', (e) => {
      try {
        const payload = JSON.parse(e.data);
        handleTaskStatusUpdate(payload);
      } catch (err) {}
    });

    evtSource.addEventListener('completed', (e) => {
      try {
        const data = JSON.parse(e.data);
        handleTaskCompleted(data);
      } catch (err) {}
    });

    evtSource.addEventListener('browser-capture', (e) => {
      try {
        const payload = JSON.parse(e.data);
        showToast(`Browser captured: ${payload.task.filename}`, 'success');
        playCompletionSound(660);
      } catch (err) {}
    });
  }
}

function handleTaskProgressUpdate(data) {
  const item = state.downloads.find(d => d.id === data.id);
  if (item) {
    Object.assign(item, data);
    updateRowInPlace(item);
  }
  updateStatusBar();
}

function handleTaskStatusUpdate({ id, status, data }) {
  const item = state.downloads.find(d => d.id === id);
  if (item) {
    item.status = status;
    if (data) Object.assign(item, data);
    renderTable();
    updateCategoryBadges();
  }
  updateStatusBar();
}

function handleTaskCompleted(data) {
  const item = state.downloads.find(d => d.id === data.id);
  if (item) {
    item.status = 'completed';
    item.percent = 100;
    item.speed = 0;
    item.timeRemaining = 0;
    renderTable();
    updateCategoryBadges();
    saveState();
    showToast(`Download finished: ${item.filename}`, 'success');
    playCompletionSound();
  }
}

function handleTaskError(data) {
  const item = state.downloads.find(d => d.id === data.id);
  if (item) {
    item.status = 'error';
    item.error = data.error;
    item.speed = 0;
    renderTable();
    updateCategoryBadges();
    showToast(`Failed: ${item.filename}`, 'error');
  }
}

// In-place Row Update for Maximum Performance (Zero-Flicker)
function updateRowInPlace(item) {
  const tr = document.querySelector(`tr[data-id="${item.id}"]`);
  if (!tr) return;

  const fill = tr.querySelector('.tdm-progress-fill');
  if (fill) fill.style.width = `${item.percent || 0}%`;

  const meta = tr.querySelector('.tdm-progress-meta span:first-child');
  if (meta) meta.textContent = `${item.percent ? item.percent.toFixed(1) : '0.0'}%`;

  const speedCell = tr.cells[5];
  if (speedCell) {
    speedCell.textContent = item.speed > 0 ? formatSpeed(item.speed) : '--';
    speedCell.style.color = item.speed > 0 ? '#00f5ff' : 'var(--text-secondary)';
  }

  const etaCell = tr.cells[6];
  if (etaCell) {
    etaCell.textContent = item.status === 'downloading' && item.timeRemaining > 0 ? formatEta(item.timeRemaining) : '--';
  }

  // Update segment bars
  if (item.segments && item.segments.length > 0) {
    const segUnits = tr.querySelectorAll('.tdm-segment-fill');
    item.segments.forEach((seg, i) => {
      if (segUnits[i]) {
        segUnits[i].style.width = `${Math.min(100, seg.progress || 0)}%`;
      }
    });
  }
}

// Status Bar & Counts
function updateStatusBar() {
  let activeCount = 0;
  let totalSpeed = 0;

  state.downloads.forEach(d => {
    if (d.status === 'downloading') {
      activeCount++;
      totalSpeed += (d.speed || 0);
    }
  });

  const activeCountEl = document.getElementById('statusActiveCount');
  if (activeCountEl) {
    activeCountEl.textContent = `${activeCount} Active Download${activeCount === 1 ? '' : 's'}`;
  }

  const totalSpeedEl = document.getElementById('statusTotalSpeed');
  if (totalSpeedEl) {
    totalSpeedEl.textContent = `Speed: ${formatSpeed(totalSpeed)}`;
  }
}

function updateCategoryBadges() {
  const counts = {
    all: state.downloads.length,
    unfinished: 0,
    finished: 0,
    videos: 0,
    music: 0,
    compressed: 0,
    programs: 0,
    documents: 0,
    apks: 0,
    images: 0
  };

  state.downloads.forEach(d => {
    if (d.status === 'completed') counts.finished++;
    else counts.unfinished++;

    if (counts[d.category] !== undefined) {
      counts[d.category]++;
    }
  });

  document.getElementById('badgeAll').textContent = counts.all;
  document.getElementById('badgeUnfinished').textContent = counts.unfinished;
  document.getElementById('badgeFinished').textContent = counts.finished;
  document.getElementById('badgeVideos').textContent = counts.videos;
  document.getElementById('badgeMusic').textContent = counts.music;
  document.getElementById('badgeCompressed').textContent = counts.compressed;
  document.getElementById('badgePrograms').textContent = counts.programs;
  document.getElementById('badgeDocuments').textContent = counts.documents;
  document.getElementById('badgeApks').textContent = counts.apks;
  document.getElementById('badgeImages').textContent = counts.images;
}

// Sound Synthesis (Web Audio API)
function playCompletionSound(freq = 880) {
  try {
    if (!state.audioContext) {
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = state.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {}
}

// Toast System
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `tdm-toast ${type}`;

  let iconColor = '#00f5ff';
  if (type === 'success') iconColor = '#3fb950';
  if (type === 'error') iconColor = '#f85149';
  if (type === 'warning') iconColor = '#d29922';

  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <span style="font-size: 12px; font-weight: 500; color: #fff;">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

// Utilities
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return '0.0 KB/s';
  if (bytesPerSec < 1024 * 1024) {
    return (bytesPerSec / 1024).toFixed(1) + ' KB/s';
  }
  return (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
}

function formatEta(seconds) {
  if (!seconds || seconds <= 0) return '--';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
         d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getStatusColor(status) {
  switch (status) {
    case 'downloading': return '#00f5ff';
    case 'completed': return '#3fb950';
    case 'paused': return '#d29922';
    case 'error': return '#f85149';
    default: return '#a371f7';
  }
}

function getCategorySvg(category) {
  switch (category) {
    case 'videos':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="#ff0080" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`;
    case 'music':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="#00a3ff" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
    case 'compressed':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="#d29922" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`;
    case 'programs':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="#7928ca" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;
    case 'documents':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
    case 'apks':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="#3fb950" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`;
    case 'images':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="#f0883e" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" fill="none" stroke="#8b949e" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>`;
  }
}

function toggleTheme() {
  document.body.classList.toggle('light-theme');
  showToast('Theme switched', 'info');
}

// Start Application on Load
document.addEventListener('DOMContentLoaded', initApp);
