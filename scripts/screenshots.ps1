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
  [string]$Pad = '',
  [string]$Skin = '',
  [string]$Cat = '',
  [switch]$Calm,
  [double]$Scale = 1
)
$Screens = $Screens | ForEach-Object { $_ -split ',' }
$Sizes = $Sizes | ForEach-Object { $_ -split ',' }
$dir = Join-Path $env:TEMP 'shots'
New-Item -ItemType Directory -Force $dir | Out-Null
foreach ($screen in $Screens) {
  foreach ($size in $Sizes) {
    $w, $h = $size -split 'x'
    $out = Join-Path $dir "${screen}_${Preset}_${size}${Tag}.png"
    if (Test-Path $out) { [IO.File]::Delete($out) }
    $url = "$Base/?screen=$screen&preset=$Preset&lang=$Lang"
    if ($Calm) { $url += "&calm=1" }
    if ($Pad) { $url += "&pad=$Pad" }
    if ($Skin) { $url += "&skin=$Skin" }
    if ($Cat) { $url += "&cat=$Cat" }
    if ($Params) { $url += "&params=$([uri]::EscapeDataString($Params))" }
    # scripts/shot.mjs drives Chrome over the DevTools protocol and always closes it (headless Chrome with a virtual time
    # budget could hang forever on a request that never settles, and every hung one kept running the game).
    $env:SHOT_URL = $url
    & node (Join-Path $PSScriptRoot 'shot.mjs') $out "${w}x${h}" x ([Math]::Max($Budget, 150000)) $Scale | Out-Null
    if (Test-Path $out) { Write-Output $out } else { Write-Output "FAILED $out" }
  }
}
