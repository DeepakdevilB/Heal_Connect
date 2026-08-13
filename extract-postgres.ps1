# ─── Extract portable PostgreSQL zip ──────────────────────────────────────────
$ZIP  = "C:\Users\priya\pro\postgresql16.zip"
$DEST = "C:\pgsql"

if (Test-Path "$DEST\bin\pg_ctl.exe") {
    Write-Host "✅ PostgreSQL already extracted at $DEST" -ForegroundColor Green
    exit 0
}

if (-not (Test-Path $ZIP)) {
    Write-Host "❌ Zip not found: $ZIP" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Extracting PostgreSQL 16 to $DEST ..." -ForegroundColor Cyan
Write-Host "   (This may take ~1 minute)" -ForegroundColor Gray
Expand-Archive -Path $ZIP -DestinationPath "C:\" -Force
Write-Host "✅ Extraction complete! PostgreSQL is at $DEST\bin" -ForegroundColor Green
