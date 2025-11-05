@echo off
echo ========================================
echo   Local Desk - EXE Build
echo   Yazar: Harun Selçuk Çetin
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] C++ Addon kontrol ediliyor...
if not exist server\keyboard-addon\build\Release\keyboard.node (
    echo Keyboard addon bulunamadi, derleniyor...
    cd server\keyboard-addon
    call npm install
    call npm run rebuild
    cd ..\..
    if not exist server\keyboard-addon\build\Release\keyboard.node (
        echo.
        echo ========================================
        echo   ❌ Keyboard Addon Derleme Hatasi!
        echo ========================================
        echo.
        echo Visual Studio Build Tools kurulu mu?
        echo Yukaridaki rebuild-desktop.bat dosyasini calistirip
        echo addon'u once derleyin.
        pause
        exit /b 1
    )
)

echo.
echo [2/3] Bagimliliklar kontrol ediliyor...
if not exist node_modules (
    echo node_modules bulunamadi, yukleniyor...
    call npm install
)

echo.
echo [3/3] EXE build baslatiliyor...
echo Bu islem bir kac dakika surebilir...
echo.

call npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   ✅ Build Basarili!
    echo ========================================
    echo.
    echo Build ciktilari 'dist' klasorunde bulunuyor:
    echo   - Local Desk Setup x.x.x.exe (Kurulum dosyasi)
    echo   - Local Desk-x.x.x-portable.exe (Portable versiyon)
    echo.
) else (
    echo.
    echo ========================================
    echo   ❌ Build Hatasi!
    echo ========================================
    echo.
    echo Hata detaylarini yukarida kontrol edin.
    echo.
)

pause

