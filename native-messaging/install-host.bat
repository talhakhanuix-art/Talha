@echo off
:: Talha Download Manager (TDM) - Native Messaging Host Installer for Windows
:: Registers TDM Native Messaging Host in Chrome and Edge registries

echo ======================================================
echo  Talha Download Manager (TDM) Native Messaging Setup
echo ======================================================
echo.

set SCRIPT_DIR=%~dp0
set MANIFEST_PATH=%SCRIPT_DIR%tdm_native_host.json

echo Registering Chrome Native Host...
REG ADD "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.talha.tdm" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f
if %ERRORLEVEL% EQU 0 (
  echo [OK] Registered successfully for Google Chrome.
) else (
  echo [ERROR] Failed to register for Google Chrome.
)

echo.
echo Registering Microsoft Edge Native Host...
REG ADD "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.talha.tdm" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f
if %ERRORLEVEL% EQU 0 (
  echo [OK] Registered successfully for Microsoft Edge.
) else (
  echo [ERROR] Failed to register for Microsoft Edge.
)

echo.
echo ======================================================
echo Installation Complete!
echo Restart your browser to apply changes.
echo ======================================================
pause
