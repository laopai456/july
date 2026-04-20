#!/bin/bash

APP_DIR="/opt/movie-api"
DATA_FILE="$APP_DIR/data.json"
BACKUP_FILE="$APP_DIR/data.json.bak"
LOG_FILE="$APP_DIR/cron.log"
MAX_LOG_SIZE=1048576

echo "===== $(date '+%Y-%m-%d %H:%M:%S') 开始每日更新 ====="

cd "$APP_DIR" || { echo "[错误] 无法进入目录 $APP_DIR"; exit 1; }

if [ -f "$LOG_FILE" ] && [ "$(wc -c < "$LOG_FILE")" -gt "$MAX_LOG_SIZE" ]; then
  mv "$LOG_FILE" "$LOG_FILE.old"
  echo "[信息] 日志已轮转"
fi

if [ -f "$DATA_FILE" ]; then
  cp "$DATA_FILE" "$BACKUP_FILE"
  echo "[信息] data.json 已备份"
fi

echo "[1/4] 拉取最新代码..."
git pull
if [ $? -ne 0 ]; then
  echo "[警告] git pull 失败，使用现有代码继续"
fi

echo "[2/4] 抓取综艺/电影/热剧数据..."
node scripts/fetch_all.js
if [ $? -ne 0 ]; then
  echo "[错误] fetch_all.js 失败，恢复备份"
  if [ -f "$BACKUP_FILE" ]; then
    cp "$BACKUP_FILE" "$DATA_FILE"
  fi
  exit 1
fi

echo "[3/4] 更新标签索引..."
node scripts/fetch_genre.js
if [ $? -ne 0 ]; then
  echo "[警告] fetch_genre.js 失败，不影响主数据"
fi

echo "[4/4] 重启服务..."
pm2 restart movie-api
if [ $? -ne 0 ]; then
  echo "[错误] pm2 restart 失败"
  exit 1
fi

echo "===== $(date '+%Y-%m-%d %H:%M:%S') 每日更新完成 ====="
