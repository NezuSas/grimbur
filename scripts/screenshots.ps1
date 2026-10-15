<#
  Screenshots of the web build with headless Chrome, for responsive checks (needs `npm run web` or `expo start` running).
  Usage: powershell -File scripts/screenshots.ps1 -Screens CoverScreen,ForgeScreen -Sizes 844x390,640x300 -Preset veteran
  Output: $env:TEMP\shots\<screen>_<preset>_<w>x<h><Tag>.png  (use a new -Tag per round so a viewer never shows a stale file)
#>
param(
  [string[]]$Screens = @('CoverScreen'),
  [string[]]$Sizes = @('844x390'),
  [string]$Preset = 'veteran',
  [string]$Lang = 'es',
  [string]$Params = '',
  [string]$Base = 'http://localhost:8081',
  [int]$Budget = 30000,
  [string]$Tag = '',
  [switch]$Calm,
  [double]$Scale = 1
)
$Screens = $Screens | ForEach-Object { $_ -split ',' }
$Sizes = $Sizes | ForEach-Object { $_ -split ',' }
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$dir = Join-Path $env:TEMP 'shots'
New-Item -ItemType Directory -Force $dir | Out-Null
foreach ($screen in $Screens) {
  foreach ($size in $Sizes) {
    $w, $h = $size -split 'x'
    $out = Join-Path $dir "${screen}_${Preset}_${size}${Tag}.png"
    if (Test-Path $out) { [IO.File]::Delete($out) }
    $profile = Join-Path $env:TEMP "chrome-shot-$([guid]::NewGuid().ToString('N'))"
    $url = "$Base/?screen=$screen&preset=$Preset&lang=$Lang"
    if ($Calm) { $url += "&calm=1" }
    if ($Params) { $url += "&params=$([uri]::EscapeDataString($Params))" }
    # Start-Process -Wait is the reliable way to let headless Chrome finish writing the file; retry if the machine is busy.
    $args = @('--headless=new', '--disable-gpu', '--hide-scrollbars', "--user-data-dir=$profile", "--window-size=$w,$h", "--force-device-scale-factor=$Scale", "--virtual-time-budget=$Budget", "--screenshot=$out", $url)
    for ($try = 1; $try -le 3 -and -not (Test-Path $out); $try++) {
      Start-Process -FilePath $chrome -ArgumentList $args -Wait | Out-Null
    }
    if (Test-Path $profile) { [IO.Directory]::Delete($profile, $true) }
    if (Test-Path $out) { Write-Output $out } else { Write-Output "FAILED $out" }
  }
}
