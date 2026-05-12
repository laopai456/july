$apiKey = if ($env:TMDB_API_KEY) { $env:TMDB_API_KEY } else { (Get-Content (Join-Path $PSScriptRoot '..\.env') | Where-Object { $_ -match 'TMDB_API_KEY=(.+)' } | ForEach-Object { $Matches[1] }).Trim() }
$ids = @(17903, 269955, 50727, 50476, 103750, 56485, 60192, 384127, 27154, 333167, 45202, 287649, 270143)
$allKw = @{}

foreach ($id in $ids) {
    $r = Invoke-RestMethod -Uri "https://api.themoviedb.org/3/movie/$id/keywords?api_key=$apiKey" -TimeoutSec 10
    foreach ($kw in $r.keywords) {
        if ($allKw.ContainsKey($kw.id)) {
            $allKw[$kw.id] = @($kw.name, $allKw[$kw.id][1] + 1)
        } else {
            $allKw[$kw.id] = @($kw.name, 1)
        }
    }
    Start-Sleep -Milliseconds 200
}

Write-Host "=== Shared keywords among Korean erotic films ==="
$sorted = $allKw.GetEnumerator() | Sort-Object { $_.Value[1] } -Descending
$sorted | Select-Object -First 25 | ForEach-Object {
    Write-Host "  $($_.Value[1])x $($_.Value[0]) (id:$($_.Key))"
}

Write-Host "`n=== Testing top keywords for Korean movie count ==="
$topIds = ($sorted | Select-Object -First 8 | ForEach-Object { $_.Key }) -join '|'
$url = "https://api.themoviedb.org/3/discover/movie?api_key=$apiKey&language=ko-KR&sort_by=vote_count.desc&vote_count.gte=5&with_keywords=$topIds&with_original_language=ko&page=1"
$r2 = Invoke-RestMethod -Uri $url -TimeoutSec 10
Write-Host "Top 8 keywords combined (KR): $($r2.total_results) movies"
$r2.results | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.title) | $($_.original_title) | rating:$([math]::Round($_.vote_average,1)) | votes:$($_.vote_count)"
}
