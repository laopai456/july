Write-Host "========================================"
Write-Host "部署增量更新功能到服务器"
Write-Host "========================================"
Write-Host ""

Write-Host "1. 提交本地更改..."
git add .
git commit -m "feat: 添加增量更新功能"
git push origin main

Write-Host ""
Write-Host "========================================"
Write-Host "本地已推送到 GitHub"
Write-Host ""
Write-Host "请在服务器执行以下命令："
Write-Host ""
Write-Host "  cd /opt/movie-api"
Write-Host "  git pull origin main"
Write-Host "  pm2 restart movie-api"
Write-Host ""
Write-Host "========================================"
