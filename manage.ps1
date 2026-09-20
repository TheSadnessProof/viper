<#
.SYNOPSIS
    DuelArena Platform Manager for PowerShell
.DESCRIPTION
    Commands: start, stop, restart, setup, push
#>

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "setup", "push")]
    [string]$Action
)

$PID_FILE = ".server.pid"
$LOG_FILE = ".server.log"

function Start-Server {
    if (Test-Path $PID_FILE) {
        $existingPid = Get-Content $PID_FILE -ErrorAction SilentlyContinue
        if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
            Write-Host "⚠️  Server is already running (PID: $existingPid)." -ForegroundColor Yellow
            Write-Host "   URL: http://localhost:3000 / http://localhost:3001"
            return
        }
    }

    Write-Host "🚀 Starting development server..." -ForegroundColor Cyan
    $process = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -PassThru -NoNewWindow -RedirectStandardOutput $LOG_FILE -RedirectStandardError $LOG_FILE
    Set-Content -Path $PID_FILE -Value $process.Id

    Start-Sleep -Seconds 2
    Write-Host "✅ Server started in background (PID: $($process.Id))." -ForegroundColor Green
    Write-Host "   Logs: $LOG_FILE"
    Write-Host "   URL:  http://localhost:3000 / http://localhost:3001"
}

function Stop-Server {
    if (Test-Path $PID_FILE) {
        $pId = Get-Content $PID_FILE -ErrorAction SilentlyContinue
        if ($pId) {
            Write-Host "🛑 Stopping server (PID: $pId)..." -ForegroundColor Yellow
            Stop-Process -Id $pId -Force -ErrorAction SilentlyContinue
        }
        Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Server stopped." -ForegroundColor Green
    } else {
        Write-Host "ℹ️  No PID file found. Stopping node processes..." -ForegroundColor Yellow
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*vite*" } | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Done." -ForegroundColor Green
    }
}

function Restart-Server {
    Write-Host "🔄 Restarting server..." -ForegroundColor Cyan
    Stop-Server
    Start-Sleep -Seconds 1
    Start-Server
}

function Setup-Project {
    Write-Host "📦 Setting up DuelArena project dependencies..." -ForegroundColor Cyan
    npm install
    Write-Host "✅ Setup complete! Run '.\manage.ps1 start' to launch." -ForegroundColor Green
}

function Push-Project {
    $branch = git rev-parse --abbrev-ref HEAD
    Write-Host "🚀 Committing and pushing all changes on branch '$branch'..." -ForegroundColor Cyan
    
    Write-Host "1. Staging changes..."
    git add -A

    Write-Host "2. Committing with message: 'Auto Commit'..."
    git commit -m "Auto Commit"

    Write-Host "3. Pushing to origin/$branch..."
    git push -u origin $branch

    Write-Host "✅ Successfully pushed to origin/$branch!" -ForegroundColor Green
}

switch ($Action) {
    "start"   { Start-Server }
    "stop"    { Stop-Server }
    "restart" { Restart-Server }
    "setup"   { Setup-Project }
    "push"    { Push-Project }
    default   {
        Write-Host "Usage: .\manage.ps1 {start|stop|restart|setup|push}" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  start    - Launch Vite dev server in background"
        Write-Host "  stop     - Stop the running server"
        Write-Host "  restart  - Restart the server"
        Write-Host "  setup    - Install dependencies (npm install)"
        Write-Host "  push     - Commit all changes with -m 'Auto Commit' and push to git"
    }
}
