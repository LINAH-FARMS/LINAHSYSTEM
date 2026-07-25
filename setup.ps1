# Setup script for لينة فارمز Desktop App
Write-Host "📦 Installing dependencies..." -ForegroundColor Green
Set-Location $PSScriptRoot
npm install

Write-Host "`n✅ Done!" -ForegroundColor Green
Write-Host "Run 'npm start' to launch the app." -ForegroundColor Cyan
