<#
  Screenshots of the web build with headless Chrome, for responsive checks (needs `npm run web` or `expo start` running).
  Usage: powershell -File scripts/screenshots.ps1 -Screens CoverScreen,ForgeScreen -Sizes 844x390,640x300 -Preset veteran
  Output: $env:TEMP\shots\<screen>_<preset>_<w>x<h>.png
#>
param(
  [string[]]$Screens = @('CoverScreen'),
  [string[]]$Sizes = @('844x390'),
  [string]$Preset = 'veteran',
  [string]$Lang = 'es',
  [string]$Params = '',
  [string]$Base = 'http://localhost:8081',
  [int]$Budget = 30000
)
$Screens = $Screens | ForEach-Object { $_ -split ',' }
$Sizes = $Sizes | ForEach-Object { $_ -split ',' }
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$dir = Join-Path $env:TEMP 'shots'
New-Item -ItemType Directory -Force $dir | Out-Null
foreach ($screen in $Screens) {
  foreach ($size in $Sizes) {
    $w, $h = $size -split 'x'
    $out = Join-Path $dir "${screen}_${Preset}_${size}.png"
    $profile = Join-Path $env:TEMP "chrome-shot-$([guid]::NewGuid().ToString('N'))"
    $url = "$Base/?screen=$screen&preset=$Preset&lang=$Lang"
    if ($Params) { $url += "&params=$([uri]::EscapeDataString($Params))" }
    & $chrome --headless=new --disable-gpu --hide-scrollbars "--user-data-dir=$profile" "--window-size=$w,$h" "--virtual-time-budget=$Budget" "--screenshot=$out" $url 2>&1 | Out-Null
    Remove-Item -Recurse -Force $profile -ErrorAction SilentlyContinue
    Write-Output $out
  }
}
