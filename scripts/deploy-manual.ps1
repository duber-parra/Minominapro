# Script para desplegar manualmente a Netlify
# Ejecutar como: .\scripts\deploy-manual.ps1

Write-Host "🚀 Iniciando despliegue manual a Netlify..." -ForegroundColor Green

# Verificar que estamos en el directorio correcto
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: No se encontró package.json. Asegúrate de estar en el directorio raíz del proyecto." -ForegroundColor Red
    exit 1
}

# Verificar que Netlify CLI está instalado
try {
    $netlifyVersion = netlify --version
    Write-Host "✅ Netlify CLI encontrado: $netlifyVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Netlify CLI no está instalado. Ejecuta: npm install -g netlify-cli" -ForegroundColor Red
    exit 1
}

# Verificar que estamos logueados
$status = netlify status 2>&1
if ($status -match "Not logged in") {
    Write-Host "❌ Error: No estás logueado en Netlify. Ejecuta: netlify login" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Autenticación verificada" -ForegroundColor Green

# Limpiar y construir el proyecto
Write-Host "🧹 Limpiando archivos anteriores..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
}
if (Test-Path "out") {
    Remove-Item -Recurse -Force "out"
}

Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
npm install

Write-Host "🏗️ Construyendo el proyecto..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en el build. Verifica los errores arriba." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completado exitosamente" -ForegroundColor Green

# Preguntar al usuario qué tipo de despliegue quiere
Write-Host "`n🎯 Selecciona el tipo de despliegue:" -ForegroundColor Cyan
Write-Host "1. Preview (despliegue de prueba)" -ForegroundColor Yellow
Write-Host "2. Production (despliegue de producción)" -ForegroundColor Yellow
$choice = Read-Host "Ingresa tu elección (1 o 2)"

switch ($choice) {
    "1" {
        Write-Host "🎭 Desplegando como preview..." -ForegroundColor Yellow
        netlify deploy --dir=.next --open
        Write-Host "✅ Preview desplegado. Revisa el enlace arriba." -ForegroundColor Green
    }
    "2" {
        Write-Host "🚀 Desplegando a producción..." -ForegroundColor Yellow
        netlify deploy --dir=.next --prod --open
        Write-Host "✅ Producción desplegada exitosamente!" -ForegroundColor Green
    }
    default {
        Write-Host "❌ Opción no válida. Desplegando como preview por defecto..." -ForegroundColor Red
        netlify deploy --dir=.next --open
    }
}

Write-Host "`n🎉 Despliegue completado!" -ForegroundColor Green
Write-Host "💡 Tip: Puedes usar 'netlify open' para abrir el dashboard de tu sitio" -ForegroundColor Cyan
