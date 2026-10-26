/**
 * Talha Download Manager (TDM) - Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  const toggleCapture = document.getElementById('toggleCapture');
  const capturedCountEl = document.getElementById('capturedCount');
  const statusBadge = document.getElementById('statusBadge');
  const btnOpenTDM = document.getElementById('btnOpenTDM');

  // Load current settings
  chrome.storage.local.get(['autoCapture', 'capturedCount'], (result) => {
    if (result.autoCapture !== undefined) {
      toggleCapture.checked = result.autoCapture;
    }
    capturedCountEl.textContent = result.capturedCount || '0';
  });

  // Handle capture toggle
  toggleCapture.addEventListener('change', () => {
    chrome.storage.local.set({ autoCapture: toggleCapture.checked });
  });

  // Check desktop connectivity
  try {
    const res = await fetch('http://127.0.0.1:3000/api/system/info');
    if (res.ok) {
      statusBadge.innerHTML = '<div class="status-dot" style="background:#3fb950;box-shadow:0 0 6px #3fb950"></div><span>Connected</span>';
      statusBadge.style.color = '#3fb950';
      statusBadge.style.borderColor = 'rgba(46, 160, 67, 0.3)';
    } else {
      throw new Error('Not running');
    }
  } catch (e) {
    statusBadge.innerHTML = '<div class="status-dot" style="background:#f85149;box-shadow:0 0 6px #f85149"></div><span>App Offline</span>';
    statusBadge.style.color = '#f85149';
    statusBadge.style.borderColor = 'rgba(248, 81, 73, 0.3)';
  }

  // Open TDM Desktop button
  btnOpenTDM.addEventListener('click', () => {
    // Open the local dashboard or trigger launch
    chrome.tabs.create({ url: 'http://127.0.0.1:3000/' });
  });
});
