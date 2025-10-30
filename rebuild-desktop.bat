@echo off
echo ========================================
echo   C++ Addon Yeniden Derleme
echo ========================================
echo.

cd desktop

echo [1/2] C++ Addon derleniyor...
echo Bu islem 30-60 saniye surebilir...
echo.
call npm run rebuild

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   ✅ Derleme Basarili!
    echo ========================================
    echo.
    echo Simdi "start-desktop.bat" ile baslatin
    echo ya da yonetici yetkisi deneyin:
    echo   - Sag tik -> "Yonetici olarak calistir"
    echo.
) else (
    echo.
    echo ========================================
    echo   ❌ Derleme Hatasi!
    echo ========================================
    echo.
    echo Visual Studio Build Tools kurulu mu?
    echo.
)

pause

