# Talha Download Manager (TDM)

> **Fast. Smart. Always Free.**
> A modern, high-speed Windows desktop download manager inspired by the workflow of Internet Download Manager (IDM), built with Electron, Node.js, and pure HTML5/CSS3.

![Talha Download Manager](assets/tdm-logo.svg)

---

## ⚡ Highlights

- **Multi-Connection Download Engine**: Splits files across multiple concurrent HTTP/HTTPS range connections for accelerated transfer speeds.
- **Resumable Transfers**: Automatic detection of `Accept-Ranges: bytes`. Pause and resume interrupted downloads without losing progress.
- **Chromium Browser Integration**: Manifest V3 extension for Google Chrome, Microsoft Edge, Brave, and Opera to automatically capture user downloads and direct file links.
- **Secure Native Messaging**: Communicates with the desktop manager through standard length-prefixed stdio.
- **IDM-Inspired Workflow**: Classic toolbar, left categories hierarchy with real-time badges, multi-stream segment progress visualizer, and right-click context menus.
- **Dedicated Video Downloader**: Grab open media streams in 4K, 1440p, 1080p, 720p, 480p, or extract high-bitrate MP3 audio.
- **Queue & Scheduler**: Configurable concurrency caps (1 to 8 concurrent active downloads) and time-based scheduling.
- **Windows 10 & 11 Ready**: Includes complete `electron-builder` configuration for building an NSIS installer (`TalhaDownloadManager-Setup.exe`) and portable executable.

---

## 📁 Project Structure

```
├── assets/
│   ├── tdm-logo.svg              # Original vector branding and icon
│   └── icon.ico                  # Application Windows icon
├── browser-extension/            # Chromium Manifest V3 Extension
│   ├── manifest.json             # Extension manifest
│   ├── background.js             # Service worker intercepting downloads
│   ├── popup.html                # Dark glass popup interface
│   └── popup.js                  # Status indicator and capture toggles
├── native-messaging/             # Windows Native Messaging Host
│   ├── tdm_native_host.json      # Host registration manifest
│   ├── tdm-native-host.js        # Node.js length-prefixed stdio host
│   ├── tdm-native-host.bat       # Windows batch wrapper
│   ├── install-host.bat          # Registry registration script for Chrome & Edge
│   └── uninstall-host.bat        # Registry cleanup script
├── src/                          # Core Engine Modules
│   ├── download-engine.js        # Chunked range download engine
│   ├── download-queue.js         # Concurrency manager and queue coordinator
│   └── settings.js               # Persistent JSON configuration manager
├── index.html                    # Application main UI with Windows Fluent titlebar
├── styles.css                    # Modern Windows 11 dark glass stylesheet
├── renderer.js                   # UI logic, table virtualization, unified bridge
├── main.js                       # Electron main process (secure IPC, window controls)
├── preload.js                    # Restricted contextIsolation preload bridge
├── server.ts                     # Full-stack dev server & preview engine
└── package.json                  # Dependencies and electron-builder NSIS config
```

---

## 🚀 Running in Development

### 1. Web Preview & Dev Server
To start the live web preview and local download engine:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Live Electron Desktop Window
To launch the actual native Windows Electron desktop application:
```bash
npm run electron
```

---

## 📦 Building the Windows Installer (.exe)

TDM uses `electron-builder` to package the application into a standalone Windows installer and portable executable for 64-bit Windows 10 and Windows 11:

```bash
# Build the NSIS Windows Installer (.exe)
npm run dist:win
```

The compiled installer will be saved to:
```
dist-electron/TalhaDownloadManager-Setup.exe
```

### Installer Capabilities
- Installs to `%LOCALAPPDATA%\Programs\Talha Download Manager` or user-selected folder.
- Creates Desktop and Start Menu shortcuts.
- Clean uninstaller via Windows "Installed apps" settings.
- Preserves download history and user preferences across updates.

---

## 🌐 Browser Extension Setup (Chrome & Edge)

1. Open your Chromium browser (Chrome, Edge, Brave, Opera).
2. Navigate to `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode** using the toggle switch in the top right.
4. Click **Load unpacked** and select the `browser-extension` folder.
5. In the `native-messaging` folder, right-click `install-host.bat` and select **Run as administrator** to register the native messaging host in the Windows Registry (`HKCU\Software\Google\Chrome\NativeMessagingHosts\com.talha.tdm`).
6. Restart your browser. Downloads matching specified file extensions (`.zip`, `.exe`, `.iso`, `.mp4`, etc.) will now be captured automatically by TDM!

---

## 🛡️ Security Architecture

- **Context Isolation**: `contextIsolation: true` is enforced in the Electron main process.
- **Node Integration Disabled**: `nodeIntegration: false` prevents unauthorized OS access from renderer scripts.
- **Sanitized Filenames**: Paths and filenames are sanitized to prevent directory traversal attacks.
- **Safe Overwrite Prevention**: Downloads with duplicate filenames automatically append safe incremented suffixes (`file (1).zip`).
- **No Credentials Interception**: The browser extension only receives explicit download URLs and does not record session cookies, credentials, or private browsing traffic.

---

## 📄 License

Apache-2.0 License. Free for personal and commercial use.
