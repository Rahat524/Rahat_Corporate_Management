$ErrorActionPreference = 'Stop'
$Desktop = [Environment]::GetFolderPath('Desktop')
$WatchFolder = Join-Path $Desktop 'Rahat Cashier Auto Update'
$AgentFolder = Join-Path $env:LOCALAPPDATA 'RahatCashierAutoSync'
New-Item -ItemType Directory -Path $WatchFolder -Force | Out-Null
New-Item -ItemType Directory -Path $AgentFolder -Force | Out-Null

$ServerUrl = Read-Host 'Server URL (Enter press for default)'
if ([string]::IsNullOrWhiteSpace($ServerUrl)) { $ServerUrl = 'https://rahat-corporate-management-1.onrender.com' }
$SourceName = Read-Host 'Software Sync Source Name'
$SyncKey = Read-Host 'Software Sync API Key'
if ([string]::IsNullOrWhiteSpace($SourceName) -or [string]::IsNullOrWhiteSpace($SyncKey)) {
  Write-Host 'Source Name aur API Key required hain.' -ForegroundColor Red
  pause; exit 1
}

$config = @{ server_url=$ServerUrl.TrimEnd('/'); source_name=$SourceName; sync_key=$SyncKey; watch_folder=$WatchFolder; check_seconds=20 }
$config | ConvertTo-Json | Set-Content (Join-Path $AgentFolder 'config.json') -Encoding UTF8

$agent = @'
$ErrorActionPreference = "Continue"
$Base = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = Join-Path $Base "config.json"
if (!(Test-Path $ConfigPath)) { exit 2 }
$c = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$WatchFolder = $c.watch_folder
if (!(Test-Path $WatchFolder)) { New-Item -ItemType Directory -Path $WatchFolder -Force | Out-Null }
$StateFile = Join-Path $Base "state.json"
$LogFile = Join-Path $Base "sync.log"
$state=@{}
if (Test-Path $StateFile) { try { $obj=Get-Content $StateFile -Raw | ConvertFrom-Json; $obj.psobject.Properties | ForEach-Object {$state[$_.Name]=$_.Value} } catch {} }
function Log($m) { Add-Content $LogFile "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $m" }
Log "Agent started. Folder: $WatchFolder"
while ($true) {
  Get-ChildItem $WatchFolder -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -match '^\.(xlsx|xlsm|xls)$' -and $_.Name -notlike '~$*' } | ForEach-Object {
    $f=$_.FullName
    try {
      # Wait until Excel finishes saving/unlocks the file
      $ready=$false
      for($i=0;$i -lt 10;$i++) { try { $fs=[IO.File]::Open($f,'Open','Read','None');$fs.Close();$ready=$true;break } catch { Start-Sleep 2 } }
      if(!$ready){ throw "File is still open/locked" }
      $hash=(Get-FileHash $f -Algorithm SHA256).Hash
      if(!$state.ContainsKey($f) -or $state[$f] -ne $hash) {
        $result=& curl.exe -sS --fail-with-body -X POST "$($c.server_url)/api/integration/excel-sync" -H "X-Rahat-Sync-Key: $($c.sync_key)" -F "source_name=$($c.source_name)" -F "file=@$f"
        if($LASTEXITCODE -ne 0){ throw $result }
        $state[$f]=$hash; $state | ConvertTo-Json | Set-Content $StateFile -Encoding UTF8
        Log "SUCCESS $($_.Name) $result"
      }
    } catch { Log "FAILED $($_.Name): $($_.Exception.Message)" }
  }
  Start-Sleep -Seconds ([int]$c.check_seconds)
}
'@
$AgentPath=Join-Path $AgentFolder 'RahatCashierAutoSync.ps1'
$agent | Set-Content $AgentPath -Encoding UTF8

$startup=[Environment]::GetFolderPath('Startup')
$cmdPath=Join-Path $startup 'Rahat Cashier Auto Sync.cmd'
"@echo off`r`npowershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$AgentPath`"" | Set-Content $cmdPath -Encoding ASCII

$manual=Join-Path $Desktop 'Start Rahat Cashier Auto Sync.cmd'
"@echo off`r`npowershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$AgentPath`"" | Set-Content $manual -Encoding ASCII
Start-Process powershell.exe -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',"`"$AgentPath`""
Write-Host "DONE: Desktop folder created: $WatchFolder" -ForegroundColor Green
Write-Host 'Cashier Closing Excel file is folder mein copy/save karein. Agent 20 seconds mein online software update karega.' -ForegroundColor Cyan
Write-Host "Log: $(Join-Path $AgentFolder 'sync.log')" -ForegroundColor Yellow
pause
