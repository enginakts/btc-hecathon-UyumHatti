@echo off
setlocal EnableExtensions
title BTK API - Uvicorn
cd /d "%~dp0backend" || (
  echo [HATA] backend klasoru bulunamadi: %~dp0backend
  pause
  exit /b 1
)

set "PYEXE=%CD%\.venv\Scripts\python.exe"

if not exist "%PYEXE%" (
  echo [BILGI] .venv yok; olusturuluyor...
  py -3 -m venv .venv 2>nul
  if not exist "%PYEXE%" python -m venv .venv 2>nul
  if not exist "%PYEXE%" (
    echo [HATA] Python bulunamadi. "py -3" veya "python" PATH'te olmali.
    echo Anaconda icin: run_api_conda.ps1 kullanin.
    pause
    exit /b 1
  )
  echo [BILGI] pip install...
  "%PYEXE%" -m pip install -r requirements.txt
  if errorlevel 1 (
    echo [HATA] pip install basarisiz.
    pause
    exit /b 1
  )
)

echo.
echo [BILGI] API: http://127.0.0.1:8010  (durdurmak icin Ctrl+C)
echo.
"%PYEXE%" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
set "UVICORN_EXIT=%ERRORLEVEL%"
echo.
if not "%UVICORN_EXIT%"=="0" (
  echo [HATA] Uvicorn cikis kodu: %UVICORN_EXIT%
)
pause
endlocal
