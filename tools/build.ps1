param([string]$IsccPath)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$appRoot = Join-Path $projectRoot 'app'
$addonRoot = Join-Path $appRoot 'addons\finderstyle'
& node (Join-Path $PSScriptRoot 'verify.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Publication checks failed.' }
if (-not $IsccPath) { $IsccPath = Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe' }
if (-not (Test-Path -LiteralPath $IsccPath)) { throw 'Install Inno Setup 6.4.3, or pass -IsccPath with the compiler location.' }
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { throw '.NET Framework C# compiler is required on Windows x64.' }
& $compiler /nologo /target:winexe /r:System.Web.Extensions.dll (('/out:') + (Join-Path $appRoot 'Maintenance.exe')) (Join-Path $appRoot 'Maintenance.cs')
if ($LASTEXITCODE -ne 0) { throw 'Maintenance compile failed.' }
& $compiler /nologo /target:winexe /r:System.Windows.Forms.dll /r:System.Web.Extensions.dll (('/out:') + (Join-Path $addonRoot 'wine-launcher.exe')) (Join-Path $addonRoot 'WinELauncher.cs')
if ($LASTEXITCODE -ne 0) { throw 'Win+E launcher compile failed.' }
& $compiler /nologo /target:winexe /r:System.Web.Extensions.dll (('/out:') + (Join-Path $addonRoot 'thumbnail-repair.exe')) (Join-Path $addonRoot 'ThumbProbe.cs') (Join-Path $addonRoot 'ThumbnailRepair.cs')
if ($LASTEXITCODE -ne 0) { throw 'Thumbnail helper compile failed.' }
$downloadRoot = Join-Path $projectRoot 'installer\downloads'
New-Item -ItemType Directory -Path $downloadRoot -Force | Out-Null
$webview = Join-Path $downloadRoot 'MicrosoftEdgeWebview2Setup.exe'
if (-not (Test-Path -LiteralPath $webview)) { Invoke-WebRequest -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $webview }
$signature = Get-AuthenticodeSignature -FilePath $webview
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'CN=Microsoft Corporation(?:,|$)') { throw 'WebView2 installer signature verification failed.' }
& $IsccPath (Join-Path $projectRoot 'installer\setup.iss')
if ($LASTEXITCODE -ne 0) { throw 'Installer compile failed.' }
$distRoot = Join-Path $projectRoot 'dist'
Get-ChildItem -LiteralPath $distRoot -Filter '*.exe' | ForEach-Object {
 $hash = Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256
 ($hash.Hash + '  ' + $_.Name) | Set-Content -LiteralPath (Join-Path $distRoot ($_.Name+'.sha256')) -Encoding ascii
}
Write-Output ('Build complete: ' + $distRoot)
