/**
 * Talha Download Manager (TDM) - Settings Manager
 * Persists application settings to local JSON file or user directory.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

export class SettingsManager {
  constructor(customPath = '') {
    const homeDir = os.homedir();
    const defaultDownloads = path.join(homeDir, 'Downloads');
    
    // TDM config directory in user's profile
    this.configDir = customPath || path.join(homeDir, '.tdm');
    this.configFile = path.join(this.configDir, 'settings.json');

    this.defaultSettings = {
      downloadDirectory: defaultDownloads,
      maxConcurrentDownloads: 4,
      speedLimitKbps: 0, // 0 = unlimited
      theme: 'dark', // 'dark' | 'light'
      playCompletionSound: true,
      autoCaptureBrowserDownloads: true,
      captureFileTypes: [
        'zip', 'rar', '7z', 'iso', 'exe', 'msi', 'bin', 'tar', 'gz',
        'mp4', 'mkv', 'webm', 'avi', 'mp3', 'wav', 'flac',
        'pdf', 'docx', 'xlsx', 'apk'
      ],
      videoQualityPreference: '1080p',
      minDiskSpaceWarningGb: 2,
      startWithWindows: false,
      closeToTray: true,
      notifyOnComplete: true
    };

    this.settings = { ...this.defaultSettings };
    this.load();
  }

  load() {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      if (fs.existsSync(this.configFile)) {
        const raw = fs.readFileSync(this.configFile, 'utf-8');
        const parsed = JSON.parse(raw);
        this.settings = { ...this.defaultSettings, ...parsed };
      } else {
        this.save();
      }
    } catch (err) {
      console.warn('Failed to load TDM settings, using defaults:', err.message);
      this.settings = { ...this.defaultSettings };
    }
    return this.settings;
  }

  save(newSettings = null) {
    if (newSettings) {
      this.settings = { ...this.settings, ...newSettings };
    }
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      fs.writeFileSync(this.configFile, JSON.stringify(this.settings, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('Failed to save TDM settings:', err.message);
      return false;
    }
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    this.save();
  }

  getAll() {
    return { ...this.settings };
  }
}
