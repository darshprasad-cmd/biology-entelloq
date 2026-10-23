param([string]$Python = 'python', [switch]$Install)
$ErrorActionPreference = 'Stop'
$moduleRoot = Split-Path -Parent $PSScriptRoot
$environment = Join-Path $moduleRoot '.venv'
$runtime = Join-Path $environment 'Scripts/python.exe'
if ($Install) {
    if (-not (Test-Path -LiteralPath $runtime)) { & $Python -m venv $environment; if ($LASTEXITCODE -ne 0) { throw 'Could not create the companion Python environment.' } }
    & $runtime -m pip install -r (Join-Path $PSScriptRoot 'requirements.txt')
    if ($LASTEXITCODE -ne 0) { throw 'Could not install Tellurium.' }
}
if (-not (Test-Path -LiteralPath $runtime)) { throw 'Run this script with -Install and a Python 3.12 executable first.' }
& $runtime (Join-Path $PSScriptRoot 'serve.py')
