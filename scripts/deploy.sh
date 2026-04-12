#!/bin/bash

echo "========================================"
echo "部署增量更新功能到服务器"
echo "========================================"

echo ""
echo "1. 提交本地更改..."
git add .
git commit -m "feat: 添加增量更新功能"
git push origin main

echo ""
echo "========================================"
echo "本地已推送到 GitHub"
echo ""
echo "请在服务器执行以下命令："
echo ""
echo "  cd /opt/movie-api"
echo "  git pull origin main"
echo "  pm2 restart movie-api"
echo ""
echo "========================================"
