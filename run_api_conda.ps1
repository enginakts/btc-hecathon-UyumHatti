# Anaconda ortami "p3.9" ile API (FastAPI + uvicorn)
#
# ONEMLI: Bu dosyayi satir satir yapistirmayin. Proje kokunde calistirin:
#   cd C:\Users\engin\Desktop\folders\btk_projects
#   .\run_api_conda.ps1
#
# PowerShell'de conda: bir kez "conda init powershell", terminali yeniden acin.
#
# WinError 10013: Windows'ta 8000 sik rezerve / dolu. Varsayilan port 8010.
# Baska port: .\run_api_conda.ps1 -Port 8765
# Frontend: frontend/.env.development -> VITE_API_PROXY_TARGET ayni porta.

param(
    [int] $Port = 8010
)

$ErrorActionPreference = "Stop"

function Get-BtkProjectRoot {
    $candidates = @()
    if ($PSScriptRoot) { $candidates += $PSScriptRoot }
    if ($PSCommandPath) {
        $candidates += (Split-Path -Parent $PSCommandPath)
    }
    $candidates += (Get-Location).Path

    foreach ($dir in ($candidates | Where-Object { $_ } | Select-Object -Unique)) {
        $req = Join-Path $dir "backend\requirements.txt"
        if (Test-Path -LiteralPath $req) {
            return $dir
        }
    }
    return $null
}

$ProjectRoot = Get-BtkProjectRoot
if (-not $ProjectRoot) {
    Write-Host ""
    Write-Host "[HATA] backend\requirements.txt bulunamadi." -ForegroundColor Red
    Write-Host "       Script'i .ps1 olarak proje kokunden calistirin:" -ForegroundColor Yellow
    Write-Host "         cd ...\btk_projects" -ForegroundColor Gray
    Write-Host "         .\run_api_conda.ps1" -ForegroundColor Gray
    Write-Host ""
    Read-Host "Cikmak icin Enter"
    exit 1
}

$Backend = Join-Path $ProjectRoot "backend"
Set-Location -LiteralPath $Backend
Write-Host "[BILGI] Backend: $Backend" -ForegroundColor DarkGray
Write-Host "[BILGI] Ortam: p3.9" -ForegroundColor Cyan

conda activate p3.9

python --version
python -m pip install -r requirements.txt

Write-Host ""
Write-Host "[BILGI] API: http://127.0.0.1:$Port  (Ctrl+C ile dur)" -ForegroundColor Green
Write-Host ""

python -m uvicorn app.main:app --reload --host 127.0.0.1 --port $Port

Write-Host ""
Read-Host "Bitti. Enter ile kapat"
