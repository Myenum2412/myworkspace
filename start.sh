#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "===================================="
echo "  MyWorkSpace"
echo "===================================="
echo ""

cleanup() {
    echo ""
    echo "Shutting down..."
    kill ${BACKEND_PID:-} ${FRONTEND_PID:-} 2>/dev/null || true
    wait ${BACKEND_PID:-} ${FRONTEND_PID:-} 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

stop_port() {
    local port="$1"
    local label="$2"

    if command -v fuser >/dev/null 2>&1 && fuser "$port/tcp" >/dev/null 2>&1; then
        echo -e "${YELLOW}Stopping existing ${label} process on port ${port}...${NC}"
        fuser -k "$port/tcp" >/dev/null 2>&1 || true
        sleep 1
    fi
}


########################################
# Clean Build Cache
########################################

echo -e "${YELLOW}[1/6] Cleaning Build Cache...${NC}"

rm -rf "$SCRIPT_DIR/backend/.next" \
       "$SCRIPT_DIR/frontend/.next" \
       "$SCRIPT_DIR/backend/dist"

echo -e "${GREEN}✅ Cache Cleaned${NC}"
echo ""

########################################
# Backend Build
########################################

echo -e "${YELLOW}[2/6] Building Backend...${NC}"

cd "$SCRIPT_DIR/backend"

if ! npm run build 2>&1 | tee backend-build.log; then
    echo ""
    echo -e "${RED}❌ Backend Build Failed${NC}"
    echo ""
    grep -iE "error|failed|exception" backend-build.log || true
    exit 1
fi

echo -e "${GREEN}✅ Backend Build Successful${NC}"
echo ""

########################################
# Seed Admin
########################################

echo -e "${YELLOW}[3/6] Seeding Admin...${NC}"

cd "$SCRIPT_DIR/backend"

if ! npm run db:seed-admin 2>&1 | tee seed-admin.log; then
    echo ""
    echo -e "${RED}❌ Admin Seed Failed${NC}"
    echo ""
    grep -iE "error|failed|exception" seed-admin.log || true
    exit 1
fi

echo -e "${GREEN}✅ Admin Seed Successful${NC}"
echo ""

########################################
# Frontend Build
########################################

echo -e "${YELLOW}[4/6] Building Frontend...${NC}"

cd "$SCRIPT_DIR/frontend"

if ! npm run build 2>&1 | tee frontend-build.log; then
    echo ""
    echo -e "${RED}❌ Frontend Build Failed${NC}"
    echo ""
    grep -iE "error|failed|exception" frontend-build.log || true
    exit 1
fi

echo -e "${GREEN}✅ Frontend Build Successful${NC}"
echo ""

########################################
# Start Backend
########################################

echo -e "${YELLOW}[5/6] Starting Backend on Port 4000...${NC}"

stop_port 4000 "backend"

cd "$SCRIPT_DIR/backend"
npm run start &
BACKEND_PID=$!

sleep 5

########################################
# Start Frontend
########################################

echo -e "${YELLOW}[6/6] Starting Frontend on Port 3000...${NC}"

stop_port 3000 "frontend"

cd "$SCRIPT_DIR/frontend"
npm run start &
FRONTEND_PID=$!

echo ""
echo "===================================="
echo -e "${GREEN}Backend : http://localhost:4000${NC}"
echo -e "${GREEN}Frontend: http://localhost:3000${NC}"
echo "===================================="
echo ""
echo "Press Ctrl+C to stop both servers."

wait
