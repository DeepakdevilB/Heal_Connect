# ─── HealConnect: Start PostgreSQL (portable install) ─────────────────────────
$PG_BASE    = "C:\pgsql"
$PG_BIN     = "$PG_BASE\bin"
$PG_DATA    = "C:\pgsql-data"
$PG_LOG     = "C:\pgsql-data\pg.log"
$PG_USER    = "postgres"
$PG_PASS    = "test"
$PG_DB      = "healconnect"
$PG_PORT    = "5432"

# Already running?
$listening = netstat -ano | Select-String ":5432 "
if ($listening) {
    Write-Host "✅ PostgreSQL already running on port 5432" -ForegroundColor Green
    exit 0
}

if (-not (Test-Path "$PG_BIN\pg_ctl.exe")) {
    Write-Host "❌ PostgreSQL not found at $PG_BIN" -ForegroundColor Red
    Write-Host "   Run the extract script first: .\extract-postgres.ps1"
    exit 1
}

# Init data directory if needed
if (-not (Test-Path "$PG_DATA\PG_VERSION")) {
    Write-Host "🔧 Initialising PostgreSQL data directory..." -ForegroundColor Yellow
    & "$PG_BIN\initdb.exe" -D $PG_DATA -U $PG_USER -A md5 --pwfile=(
        New-TemporaryFile | ForEach-Object { Set-Content $_ $PG_PASS; $_.FullName }
    ) -E UTF8
    if ($LASTEXITCODE -ne 0) { Write-Host "❌ initdb failed"; exit 1 }
    Write-Host "✅ Data directory initialised" -ForegroundColor Green
}

# Start server
Write-Host "🚀 Starting PostgreSQL on port $PG_PORT..." -ForegroundColor Cyan
& "$PG_BIN\pg_ctl.exe" start -D $PG_DATA -l $PG_LOG -o "-p $PG_PORT"
Start-Sleep -Seconds 3

# Create DB if not exists
$exists = & "$PG_BIN\psql.exe" -U $PG_USER -p $PG_PORT -lqt 2>$null | Select-String $PG_DB
if (-not $exists) {
    Write-Host "📦 Creating database '$PG_DB'..." -ForegroundColor Yellow
    & "$PG_BIN\createdb.exe" -U $PG_USER -p $PG_PORT $PG_DB
    Write-Host "✅ Database created" -ForegroundColor Green
} else {
    Write-Host "✅ Database '$PG_DB' already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "PostgreSQL is ready! Connection string:" -ForegroundColor Green
Write-Host "  postgresql://postgres:test@localhost:5432/healconnect" -ForegroundColor Cyan
