#!/usr/bin/env bash
# ==============================================================================
# Game Platform Manager
# Usage: ./manage.sh [start|stop|restart|setup|push]
# ==============================================================================

PID_FILE=".server.pid"
LOG_FILE=".server.log"

get_current_branch() {
  git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "web-game-platform"
}

is_port_listening() {
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
    return $?
  else
    lsof -i :5000 >/dev/null 2>&1
    return $?
  fi
}

start_server() {
  if is_port_listening; then
    echo "[!] Server is already running on port 5000."
    echo "    URL: http://localhost:5000"
    return 0
  fi

  echo "[+] Starting development server on port 5000..."

  if command -v powershell.exe >/dev/null 2>&1 && [[ "$(uname -s)" =~ (MINGW|MSYS|CYGWIN) ]]; then
    powershell.exe -NoProfile -Command "Start-Process node -ArgumentList 'node_modules/vite/bin/vite.js', '--port', '5000' -WindowStyle Hidden"
  else
    nohup node node_modules/vite/bin/vite.js --port 5000 > "$LOG_FILE" 2>&1 &
    echo "$!" > "$PID_FILE"
  fi

  sleep 2
  echo "[OK] Server started in background."
  echo "     URL: http://localhost:5000"
}

stop_server() {
  echo "[*] Stopping server on port 5000..."

  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$PID" ]; then
      kill "$PID" 2>/dev/null || true
      taskkill //F //PID "$PID" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
  fi

  # Free any process on port 5000
  if command -v powershell.exe >/dev/null 2>&1; then
    PORT_PID=$(powershell.exe -NoProfile -Command "(Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess" 2>/dev/null | tr -d '\r\n')
    if [ -n "$PORT_PID" ] && [ "$PORT_PID" -gt 0 ] 2>/dev/null; then
      taskkill //F //PID "$PORT_PID" 2>/dev/null || true
    fi
  fi

  echo "[OK] Server stopped."
}

restart_server() {
  echo "[*] Restarting server..."
  stop_server
  sleep 1
  start_server
}

setup_project() {
  echo "[*] Setting up dependencies..."
  if ! command -v node >/dev/null 2>&1; then
    echo "[!] Node.js not found in PATH."
    exit 1
  fi
  npm install
  echo "[OK] Setup complete! Run './manage.sh start' to launch."
}

push_project() {
  BRANCH=$(get_current_branch)
  echo "[*] Committing and pushing all changes on branch '$BRANCH'..."
  git add -A
  if git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "[i] Nothing to commit, working tree is clean."
  else
    git commit -m "Auto Commit"
  fi
  git push -u origin "$BRANCH"
  echo "[OK] Pushed to origin/$BRANCH!"
}

case "$1" in
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    restart_server
    ;;
  setup)
    setup_project
    ;;
  push)
    push_project
    ;;
  *)
    echo "Usage: ./manage.sh {start|stop|restart|setup|push}"
    echo ""
    echo "Commands:"
    echo "  start    - Launch dev server on port 5000 in background"
    echo "  stop     - Stop the running server"
    echo "  restart  - Restart the server"
    echo "  setup    - Install dependencies"
    echo "  push     - Commit with 'Auto Commit' and push to git"
    exit 1
    ;;
esac
