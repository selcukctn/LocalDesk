@echo off
echo ========================================
echo   Local Desk Desktop Uygulamasi
echo ========================================
echo.

cd desktop

echo [1/3] Bagimliliklari kontrol ediliyor...
if not exist node_modules (
    echo node_modules bulunamadi, yukleniyor...
    call npm install
)

echo.
echo [2/3] C++ Addon kontrol ediliyor...
if not exist server\keyboard-addon\build (
    echo Keyboard addon bulunamadi, derleniyor...
    cd server\keyboard-addon
    call npm install
    cd ..\..
)

echo.
echo [3/3] Uygulama baslatiliyor...
echo.
call npm start

