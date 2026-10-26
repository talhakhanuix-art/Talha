/**
 * Talha Download Manager (TDM) - Preload Bridge
 * Implements secure context isolation bridge between renderer and main process.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tdmAPI', {
  isElectron: true,
  platform: process.platform,

  // Window Controls
  minimize: () => ipcRenderer.invoke('tdm:window-minimize'),
  maximize: () => ipcRenderer.invoke('tdm:window-maximize'),
  close: () => ipcRenderer.invoke('tdm:window-close'),

  // Download Operations
  probeUrl: (url) => ipcRenderer.invoke('tdm:probe-url', url),
  startDownload: (taskOptions) => ipcRenderer.invoke('tdm:start-download', taskOptions),
  pauseDownload: (id) => ipcRenderer.invoke('tdm:pause-download', id),
  resumeDownload: (id) => ipcRenderer.invoke('tdm:resume-download', id),
  pauseAll: () => ipcRenderer.invoke('tdm:pause-all'),
  resumeAll: () => ipcRenderer.invoke('tdm:resume-all'),
  cancelDownload: (id) => ipcRenderer.invoke('tdm:cancel-download', id),
  deleteDownload: (id, deleteFile) => ipcRenderer.invoke('tdm:delete-download', { id, deleteFile }),
  getAllTasks: () => ipcRenderer.invoke('tdm:get-all-tasks'),

  // File and Folder Management
  getDiskInfo: () => ipcRenderer.invoke('tdm:get-disk-info'),
  selectFolder: () => ipcRenderer.invoke('tdm:select-folder'),
  openFile: (filePath) => ipcRenderer.invoke('tdm:open-file', filePath),
  openFolder: (folderPath) => ipcRenderer.invoke('tdm:open-folder', folderPath),

  // Settings
  getSettings: () => ipcRenderer.invoke('tdm:get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('tdm:save-settings', settings),

  // Events Listeners
  onProgress: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('tdm:on-progress', subscription);
    return () => ipcRenderer.removeListener('tdm:on-progress', subscription);
  },
  onStatus: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('tdm:on-status', subscription);
    return () => ipcRenderer.removeListener('tdm:on-status', subscription);
  },
  onCompleted: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('tdm:on-completed', subscription);
    return () => ipcRenderer.removeListener('tdm:on-completed', subscription);
  },
  onError: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('tdm:on-error', subscription);
    return () => ipcRenderer.removeListener('tdm:on-error', subscription);
  }
});
