# Rahat Corporate Management - Auto Update Folder Agent V52
# Configure these values from Excel Auto Sync Center:
$ServerUrl = "https://rahat-corporate-management-1.onrender.com"
$SourceName = "CHANGE_ME"
$SyncKey = "PASTE_KEY_FROM_SOFTWARE"
$WatchFolder = "C:\Rahat_Auto_Update"
$CheckEverySeconds = 30
$ErrorActionPreference = "Continue"
if (!(Test-Path $WatchFolder)) { New-Item -ItemType Directory -Path $WatchFolder -Force | Out-Null }
$StateFile = Join-Path $WatchFolder ".rahat_sync_state.json"
$state = @{}
if (Test-Path $StateFile) { try { $obj=Get-Content $StateFile -Raw | ConvertFrom-Json; $obj.psobject.Properties | ForEach-Object { $state[$_.Name]=$_.Value } } catch {} }
Write-Host "Rahat Auto Update Folder Agent started: $WatchFolder" -ForegroundColor Cyan
while ($true) {
  Get-ChildItem $WatchFolder -File | Where-Object { $_.Extension -match '^\.(xlsx|xlsm|xls)$' -and $_.Name -notlike '~$*' } | ForEach-Object {
    $file=$_.FullName
    try {
      $hash=(Get-FileHash $file -Algorithm SHA256).Hash
      if (!$state.ContainsKey($file) -or $state[$file] -ne $hash) {
        $result=& curl.exe -sS --fail-with-body -X POST "$ServerUrl/api/integration/excel-sync" -H "X-Rahat-Sync-Key: $SyncKey" -F "source_name=$SourceName" -F "file=@$file"
        if ($LASTEXITCODE -ne 0) { throw $result }
        $state[$file]=$hash
        $state | ConvertTo-Json | Set-Content $StateFile -Encoding UTF8
        Write-Host "Synced: $($_.Name)" -ForegroundColor Green
      }
    } catch { Write-Host "Sync failed: $($_.Exception.Message)" -ForegroundColor Red }
  }
  Start-Sleep -Seconds $CheckEverySeconds
}
