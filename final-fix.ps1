Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "SSC Board App - FINAL FIX" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Write-Host "`n1. Removing old files..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue

Write-Host "`n2. Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

Write-Host "`n3. Installing dependencies (this will take a few minutes)..." -ForegroundColor Yellow
npm install --legacy-peer-deps

Write-Host "`n4. Creating missing directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path ".expo\metro\externals\node" -ErrorAction SilentlyContinue

Write-Host "`n5. Starting app with npx expo..." -ForegroundColor Yellow
npx expo start --clear