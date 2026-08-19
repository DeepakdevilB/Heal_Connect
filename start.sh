#!/bin/bash

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Start backend
cd "$ROOT/backend" && npm run dev &
BACKEND_PID=$!

# Start frontend
cd "$ROOT/web" && npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID | Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop both servers."

# Kill both on exit
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
