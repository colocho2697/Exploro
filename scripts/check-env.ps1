# scripts/check-env.ps1
# Verifica las herramientas requeridas para el desarrollo local de Exploro

$ErrorActionPreference = "Continue"

Write-Host "=== Exploro: Verificacion del Entorno de Desarrollo ===" -ForegroundColor Cyan

$nodeVer = node --version 2>$null
$pnpmVer = pnpm --version 2>$null
$gitVer  = git --version 2>$null
$dockerVer = docker --version 2>$null
$composeVer = docker compose version 2>$null

Write-Host "Node.js        : $nodeVer"
Write-Host "pnpm           : $pnpmVer"
Write-Host "Git            : $gitVer"
Write-Host "Docker         : $dockerVer"
Write-Host "Docker Compose : $composeVer"

if (-not $nodeVer -or -not $pnpmVer -or -not $dockerVer) {
    Write-Error "Faltan herramientas esenciales (Node.js, pnpm o Docker)."
    exit 1
}

Write-Host "Entorno verificado correctamente." -ForegroundColor Green
exit 0

