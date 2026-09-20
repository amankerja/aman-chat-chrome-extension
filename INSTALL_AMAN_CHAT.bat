@echo off
title AMAN CHAT - Auto Installer ^& Setup
color 0A
cls

echo ========================================================
echo         AMAN CHAT v3.0 Pro - Auto Installer
echo ========================================================
echo.

set "SOURCE_DIR=%~dp0"
set "TARGET_DIR=%USERPROFILE%\AMAN_CHAT_Extension"

:: 1. Jika folder dist belum ada dan ada package.json, coba build
if not exist "%SOURCE_DIR%dist\manifest.json" (
    if exist "%SOURCE_DIR%package.json" (
        echo [INFO] Menyiapkan file build...
        call npm run build >nul 2>&1
    )
)

:: 2. Tentukan folder sumber
set "COPY_SRC="
if exist "%SOURCE_DIR%dist\manifest.json" set "COPY_SRC=%SOURCE_DIR%dist"
if not defined COPY_SRC if exist "%SOURCE_DIR%manifest.json" set "COPY_SRC=%SOURCE_DIR%"

if not defined COPY_SRC goto :err_no_manifest

echo Sedang memasang file ekstensi ke:
echo %TARGET_DIR%
echo.

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%" >nul 2>&1

:: Salin file ke folder target
xcopy /E /Y /I /Q "%COPY_SRC%\*" "%TARGET_DIR%\" >nul 2>&1

:: Verifikasi apakah manifest tersalin
if not exist "%TARGET_DIR%\manifest.json" goto :err_copy_failed

echo [OK] File Ekstensi berhasil disimpan!
echo.

:: 3. Salin lokasi folder ke Clipboard
powershell -NoProfile -Command "Set-Clipboard -Value '%TARGET_DIR%'" >nul 2>&1
if errorlevel 1 (
    echo %TARGET_DIR%| clip
)
echo [OK] Alamat folder berhasil disalin ke Clipboard!
echo.

:: 4. Buka folder ekstensi di File Explorer
start "" explorer.exe "%TARGET_DIR%"

:: 5. Deteksi Browser (Google Chrome / Edge)
set "BROWSER_EXE="
set "BROWSER_NAME=Google Chrome"
set "BROWSER_URL=chrome://extensions"

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
)
if not defined BROWSER_EXE if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
)
if not defined BROWSER_EXE if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
)
if not defined BROWSER_EXE if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
    set "BROWSER_NAME=Microsoft Edge"
    set "BROWSER_URL=edge://extensions"
)
if not defined BROWSER_EXE if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
    set "BROWSER_NAME=Microsoft Edge"
    set "BROWSER_URL=edge://extensions"
)

echo ========================================================
echo   Membuka %BROWSER_NAME% (%BROWSER_URL%)...
echo ========================================================
echo.

if defined BROWSER_EXE (
    start "" "%BROWSER_EXE%" "%BROWSER_URL%"
) else (
    start "" "chrome://extensions" >nul 2>&1 || start "" "edge://extensions" >nul 2>&1
)

echo ========================================================
echo            LANGKAH INSTALASI DI BROWSER:
echo ========================================================
echo.
echo 1. Di pojok kanan atas browser, aktifkan:
echo    [x] Mode pengembang (Developer Mode)
echo.
echo 2. Di pojok kiri atas browser, klik:
echo    [+] Muat tanpa paket (Load unpacked)
echo.
echo 3. Pada kotak alamat folder yang muncul:
echo    - Tekan tombol keyboard Ctrl + V lalu tekan Enter
echo    - Atau pilih folder AMAN_CHAT_Extension yang terbuka
echo    - Klik tombol Select Folder / Pilih Folder
echo.
echo ========================================================
echo  SELESAI! Buka https://web.whatsapp.com untuk memakai.
echo ========================================================
echo.
pause
exit /b 0

:err_no_manifest
color 0C
echo ========================================================
echo [ERROR] File instalasi (manifest.json) tidak ditemukan!
echo ========================================================
echo.
echo PENTING:
echo 1. Pastikan Anda sudah mengekstrak (Extract All) file ZIP.
echo 2. Jangan menjalankan file .bat langsung dari dalam ZIP.
echo.
pause
exit /b 1

:err_copy_failed
color 0C
echo ========================================================
echo [ERROR] Gagal menyalin file ekstensi ke:
echo %TARGET_DIR%
echo ========================================================
echo.
echo Silakan coba jalankan installer ini sebagai Administrator.
echo.
pause
exit /b 1
