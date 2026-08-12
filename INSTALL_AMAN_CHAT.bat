@echo off
title AMAN CHAT — Auto Installer & Setup
color 0A
cls

echo ========================================================
echo         AMAN CHAT v3.0 Pro — Auto Installer
echo ========================================================
echo.
echo Sedang menyiapkan file ekstensi ke komputer Anda...
echo.

set TARGET_DIR=%USERPROFILE%\AMAN_CHAT_Extension

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

if exist "%~dp0dist\manifest.json" (
    xcopy /E /Y /I "%~dp0dist\*" "%TARGET_DIR%\" >nul
) else if exist "%~dp0manifest.json" (
    xcopy /E /Y /I "%~dp0*" "%TARGET_DIR%\" >nul
)

echo [OK] File Ekstensi berhasil disimpan di:
echo      %TARGET_DIR%
echo.
echo Alamat folder telah disalin otomatis ke Clipboard Anda!
echo %TARGET_DIR%| clip
echo.
echo ========================================================
echo    Membuka Google Chrome ( chrome://extensions )...
echo ========================================================
echo.

start chrome "chrome://extensions"

echo ========================================================
echo    LANGKAH TERAKHIR INSTALASI DI GOOGLE CHROME:
echo ========================================================
echo.
echo 1. Aktifkan "Mode Pengembang" (Developer Mode) di kanan atas.
echo 2. Klik tombol "Muat tanpa paket" (Load unpacked) di kiri atas.
echo 3. Tekan ( Ctrl + V ) pada kotak alamat folder, lalu Enter!
echo.
echo ========================================================
echo Selesai! Buka https://web.whatsapp.com untuk menggunakan.
echo ========================================================
echo.
pause
