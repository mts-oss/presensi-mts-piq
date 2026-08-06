@echo off
echo ========================================
echo  Presensi MTs PIQ Singosari Malang
echo ========================================
echo.
echo Memulai server lokal di port 8000...
echo.
echo Buka browser dan akses: http://localhost:8000
echo Tekan Ctrl+C untuk menghentikan server.
echo.
cd /d "%~dp0"
python -m http.server 8000 || py -m http.server 8000 || python3 -m http.server 8000
pause
