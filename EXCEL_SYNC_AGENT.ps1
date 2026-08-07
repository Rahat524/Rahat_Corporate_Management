# Rahat Corporate Management - Excel Auto Sync Agent V49
# 1) Set the four values below. 2) Run this file on the computer that owns the Excel file.
$ServerUrl = "https://rahat-corporate-management-1.onrender.com"
$SourceName = "CHANGE_ME"
$SyncKey = "PASTE_KEY_FROM_SOFTWARE"
$ExcelFile = "C:\Path\To\Your\File.xlsx"
$CheckEverySeconds = 60

$ErrorActionPreference = "Stop"
$lastHash = ""
Write-Host "Rahat Excel Sync Agent started." -ForegroundColor Cyan
while ($true) {
  try {
    if (!(Test-Path $ExcelFile)) { throw "Excel file not found: $ExcelFile" }
    $hash = (Get-FileHash $ExcelFile -Algorithm SHA256).Hash
    if ($hash -ne $lastHash) {
      Write-Host "Change detected. Synchronizing..." -ForegroundColor Yellow
      $result = & curl.exe -sS --fail-with-body -X POST "$ServerUrl/api/integration/excel-sync" `
        -H "X-Rahat-Sync-Key: $SyncKey" `
        -F "source_name=$SourceName" `
        -F "file=@$ExcelFile"
      if ($LASTEXITCODE -ne 0) { throw "Sync request failed: $result" }
      Write-Host $result -ForegroundColor Green
      $lastHash = $hash
    }
  } catch { Write-Host ("Sync error: " + $_.Exception.Message) -ForegroundColor Red }
  Start-Sleep -Seconds $CheckEverySeconds
}
