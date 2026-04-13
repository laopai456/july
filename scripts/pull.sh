#!/bin/bash

set -e

PROJECT_DIR="/opt/movie-api"

echo "========================================"
echo "服务器拉取更新 & 刷新数据"
echo "========================================"

cd "$PROJECT_DIR"

echo ""
echo "[1/4] 拉取代码..."
git pull origin main

echo ""
echo "[2/4] 安装依赖（如有变更）..."
npm install --production --silent 2>/dev/null || true

echo ""
echo "[3/4] 更新数据..."
node scripts/fetch_all.js

echo ""
echo "[4/4] 重启服务..."
pm2 restart movie-api

echo ""
echo "========================================"
echo "完成！"
echo "========================================"
