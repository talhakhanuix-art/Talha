/**
 * Talha Download Manager (TDM) - Browser Extension Service Worker (Manifest V3)
 * Seamlessly captures file downloads and context menu items, dispatching them to TDM desktop.
 */

const NATIVE_HOST_NAME = 'com.talha.tdm';
const LOCAL_BRIDGE_URL = 'http://127.0.0.1:3000/api/extension/capture';

const DEFAULT_EXTENSIONS = [
  'zip', 'rar', '7z', 'tar', 'gz', 'iso', 'dmg',
  'exe', 'msi', 'bin', 'apk', 'xapk',
  'mp4', 'mkv', 'webm', 'avi', 'mov', 'flv',
  'mp3', 'wav', 'flac', 'aac', 'm4a',
  'pdf', 'docx', 'xlsx', 'pptx'
];

// Initialize storage defaults
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['autoCapture', 'fileExtensions', 'capturedCount'], (result) => {
    if (result.autoCapture === undefined) {
      chrome.storage.local.set({
        autoCapture: true,
        fileExtensions: DEFAULT_EXTENSIONS,
        capturedCount: 0
      });
    }
  });

  // Create Context Menu item
  chrome.contextMenus.create({
    id: 'tdm_download_link',
    title: 'Download with Talha Download Manager (TDM)',
    contexts: ['link', 'image', 'video', 'audio']
  });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const targetUrl = info.linkUrl || info.srcUrl;
  if (targetUrl) {
    sendDownloadToTDM(targetUrl, tab ? tab.url : '');
  }
});

// Intercept browser downloads
chrome.downloads.onCreated.addListener(async (downloadItem) => {
  const settings = await chrome.storage.local.get(['autoCapture', 'fileExtensions']);
  if (!settings.autoCapture) {
    return; // User disabled automatic interception
  }

  const url = downloadItem.finalUrl || downloadItem.url;
  if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('chrome://')) {
    return; // Don't intercept internal browser data or blob streams
  }

  // Check if file extension matches captured list
  let filename = downloadItem.filename || '';
  if (!filename && url) {
    try {
      const parsed = new URL(url);
      filename = parsed.pathname.split('/').pop() || '';
    } catch (e) {}
  }

  const ext = filename.split('.').pop().toLowerCase();
  const allowedExts = settings.fileExtensions || DEFAULT_EXTENSIONS;

  if (allowedExts.includes(ext) || downloadItem.totalBytes > 20 * 1024 * 1024) {
    // Attempt to route to TDM
    const success = await sendDownloadToTDM(url, downloadItem.referrer || '', filename);
    if (success) {
      // Cancel the browser's built-in download since TDM will handle it
      chrome.downloads.cancel(downloadItem.id, () => {
        // Erase the cancelled entry from browser download list to avoid clutter
        chrome.downloads.erase({ id: downloadItem.id });
      });

      // Update badge and stats
      chrome.storage.local.get(['capturedCount'], (res) => {
        const count = (res.capturedCount || 0) + 1;
        chrome.storage.local.set({ capturedCount: count });
        chrome.action.setBadgeText({ text: String(count) });
        chrome.action.setBadgeBackgroundColor({ color: '#00a3ff' });
      });
    }
  }
});

/**
 * Send download request to TDM desktop via Native Messaging or Local Bridge
 */
async function sendDownloadToTDM(url, referrer = '', filename = '') {
  // Method 1: Try Native Messaging Host
  const nativeSuccess = await new Promise((resolve) => {
    try {
      chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, {
        action: 'capture_download',
        url,
        referrer,
        filename,
        timestamp: Date.now()
      }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    } catch (err) {
      resolve(false);
    }
  });

  if (nativeSuccess) return true;

  // Method 2: Fallback to local secure bridge endpoint
  try {
    const res = await fetch(LOCAL_BRIDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, referrer, filename })
    });
    if (res.ok) {
      const data = await res.json();
      return data.success === true;
    }
  } catch (e) {
    // TDM desktop is not currently active
  }

  return false;
}
