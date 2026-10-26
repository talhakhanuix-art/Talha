@echo off
:: Talha Download Manager (TDM) - Native Messaging Host Uninstaller for Windows
echo Removing TDM Native Messaging Host registration...

REG DELETE "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.talha.tdm" /f >nul 2>&1
REG DELETE "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.talha.tdm" /f >nul 2>&1

echo [OK] TDM Native Messaging Host unregistered.
pause
