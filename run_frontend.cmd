@echo off
setlocal EnableExtensions
title BTK Frontend - Vite
cd /d "%~dp0frontend" || (
  echo [HATA] frontend klasoru bulunamadi: %~dp0frontend
  pause
  exit /b 1
)

where npm >nul 2>&1 || (
  echo [HATA] npm PATH'te yok. Node.js kurun veya tam yol kullanin.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [BILGI] npm install...
  call npm install
  if errorlevel 1 (
    echo [HATA] npm install basarisiz.
    pause
    exit /b 1
  )
)

echo.
echo [BILGI] http://localhost:5173  (durdurmak icin Ctrl+C)
echo.
call npm run dev
echo.
if errorlevel 1 echo [HATA] npm run dev cikti.
pause
endlocal
