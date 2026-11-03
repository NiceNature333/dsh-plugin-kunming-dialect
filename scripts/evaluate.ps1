$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'evaluate-v02.ps1')
exit $LASTEXITCODE
