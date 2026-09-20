#!/usr/bin/env bash
# ==============================================================================
# DuelArena Platform Manager
# Usage: ./manage.sh [start|stop|restart|setup|push]
# ==============================================================================

set -e

PID_FILE=".server.pid"
LOG_FILE=".server.log"

get_current_branch() {
  git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "web-game-platform"
}

is_running() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$PID" ]; then
      if ps -p "$PID" > /dev/null 2>&1 || taskkill //FI "PID eq $PID" 2>&1 | grep -q "$PID"; then
        return 0
      fi
    fi
  fi
  return 1
}

start_server() {
  if is_running; then
    echo "⚠️  Server is already running (PID: $(cat "$PID_FILE"))."
    echo "   URL: http://localhost:3000 / http://localhost:3001"
    return 0
  fi

  echo "🚀 Starting development server..."
  nohup npm run dev > "$LOG_FILE" 2>&1 &
  PID=$!
  echo "$PID" > "$PID_FILE"

  sleep 2
  echo "✅ Server started in background (PID: $PID)."
  echo "   Logs: $LOG_FILE"
  echo "   URL:  http://localhost:3000 (or http://localhost:3001)"
}

stop_server() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE" 2>/dev/null || true)
    echo "🛑 Stopping server (PID: $PID)..."
    kill "$PID" 2>/dev/null || true
    taskkill //F //PID "$PID" 2>/dev/null || true
    rm -f "$PID_FILE"
    echo "✅ Server stopped."
  else
    echo "ℹ️  No PID file found. Stopping any active vite dev processes..."
    taskkill //F //IM node.exe //FI "WINDOWTITLE eq *vite*" 2>/dev/null || true
    echo "✅ Done."
  fi
}

restart_server() {
  echo "🔄 Restarting server..."
  stop_server
  sleep 1
  start_server
}

setup_project() {
  echo "📦 Setting up DuelArena project dependencies..."
  if ! command -v node >/dev/null 2>&1; then
    echo "❌ Error: Node.js is not found in PATH."
    exit 1
  fi
  if ! command -v npm >/dev/null 2>&1; then
    echo "❌ Error: npm is not found in PATH."
    exit 1
  fi

  echo "   Node: $(node -v)"
  echo "   npm:  $(npm -v)"
  echo "   Installing packages..."
  npm install
  echo "✅ Setup complete! Run './manage.sh start' to launch."
}

push_project() {
  BRANCH=$(get_current_branch)
  echo "🚀 Committing and pushing all changes on branch '$BRANCH'..."

  echo "1. Staging changes..."
  git add -A

  echo "2. Committing with message: 'Auto Commit'..."
  if git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "ℹ️  Working tree is already clean. Nothing to commit."
  else
    git commit -m "Auto Commit"
  fi

  echo "3. Pushing to origin/$BRANCH..."
  git push -u origin "$BRANCH"

  echo "✅ Successfully pushed to origin/$BRANCH!"
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
    echo "  start    - Launch Vite dev server in background"
    echo "  stop     - Stop the running server"
    echo "  restart  - Restart the server"
    echo "  setup    - Install dependencies (npm install)"
    echo "  push     - Commit all changes with -m 'Auto Commit' and push to git"
    exit 1
    ;;
esac
