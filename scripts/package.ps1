$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $projectRoot 'dist'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$archive = Join-Path $destination 'vrchat-accessory-transfer-0.1.0.zip'
Compress-Archive -LiteralPath (Join-Path $projectRoot 'manifest.json'), (Join-Path $projectRoot 'src'), (Join-Path $projectRoot 'docs'), (Join-Path $projectRoot 'README.md'), (Join-Path $projectRoot 'LICENSE') -DestinationPath $archive -Force
Write-Output $archive
