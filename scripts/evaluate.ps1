$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$profileDir = Join-Path $env:USERPROFILE '.dsh/profiles/kunming-validation'
$launcher = Join-Path $env:LOCALAPPDATA 'Programs/DeepSeek Harness/resources/runtime/cli/bin/dsh.cmd'
if (!(Test-Path -LiteralPath $launcher)) { throw '找不到 Harness 桌面版启动器。' }
if (Test-Path -LiteralPath (Join-Path $profileDir 'package.json')) {
    $existing = Get-Content -LiteralPath (Join-Path $profileDir 'package.json') -Raw | ConvertFrom-Json
    if ($existing.name -ne 'dsh-profile-kunming-validation') { throw '验证 Profile 名称已被其他项目占用。' }
}
New-Item -ItemType Directory -Force (Join-Path $profileDir 'node_modules') | Out-Null
'{"name":"dsh-profile-kunming-validation","private":true,"dsh":{"profile":{"bundles":["@deepseek-ai/dsh-base","dsh-plugin-kunming-dialect"]}}}' | Set-Content -Encoding utf8 (Join-Path $profileDir 'package.json')
'[]' | Set-Content (Join-Path $profileDir 'cordis.yml')
$probePath = (Join-Path $PSScriptRoot 'live-probe.js').Replace('\','/')
@"
- id: deepseek-account
  config:
    desktopPlatform: win32
- insert:
    - id: kunming-live-probe
      name: '$probePath'
"@ | Set-Content -Encoding utf8 (Join-Path $profileDir 'cordis.patch.yml')
$link = Join-Path $profileDir 'node_modules/dsh-plugin-kunming-dialect'
if (!(Test-Path -LiteralPath $link)) { New-Item -ItemType Junction -Path $link -Target $projectDir | Out-Null }
& $launcher --profile kunming-validation
exit $LASTEXITCODE
