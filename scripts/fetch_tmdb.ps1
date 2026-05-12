$TMDB_API_KEY = if ($env:TMDB_API_KEY) { $env:TMDB_API_KEY } else { (Get-Content (Join-Path $PSScriptRoot '..\.env') | Where-Object { $_ -match 'TMDB_API_KEY=(.+)' } | ForEach-Object { $Matches[1] }).Trim() }
$OUTPUT = Join-Path $PSScriptRoot '..\tmdb_raw.json'
$MIN_YEAR = 2005

$sources = @(
    @{ name='PH-R18'; params='certification_country=PH&certification=R-18&with_original_language=tl' },
    @{ name='JP-R18+'; params='certification_country=JP&certification=R18%2B&with_original_language=ja&with_release_type=3' },
    @{ name='TH-18'; params='certification_country=TH&certification=18&with_original_language=th' },
    @{ name='KR-erotic'; params='with_keywords=256466|155477&with_original_language=ko' },
    @{ name='GLOBAL-erotic'; params='with_keywords=256466' },
    @{ name='GLOBAL-softcore'; params='with_keywords=155477|41260' }
)

$allMovies = @{}

foreach ($src in $sources) {
    Write-Host "`n[$($src.name)]"
    $page = 1
    $maxPages = 5

    while ($page -le $maxPages) {
        $url = "https://api.themoviedb.org/3/discover/movie?language=zh-CN&sort_by=vote_count.desc&vote_count.gte=5&include_adult=true&$($src.params)&page=$page&api_key=$TMDB_API_KEY"
        try {
            $r = Invoke-RestMethod -Uri $url -TimeoutSec 15
        } catch {
            Write-Host "  FAIL: $_"
            break
        }

        if (-not $r.results -or $r.results.Count -eq 0) { break }
        $maxPages = [Math]::Min($r.total_pages, 5)
        $pageCount = 0

        foreach ($m in $r.results) {
            if ($allMovies.ContainsKey([string]$m.id)) { continue }
            $year = 0
            if ($m.release_date -and $m.release_date.Length -ge 4) {
                $year = [int]($m.release_date.Substring(0,4))
            }
            if ($year -lt $MIN_YEAR) { continue }

            $allMovies[[string]$m.id] = @{
                tmdbId = $m.id
                title = $m.title
                originalTitle = $m.original_title
                year = $year
                rating = "$([math]::Round($m.vote_average, 1))"
                voteCount = $m.vote_count
                language = $m.original_language
                poster = $(if ($m.poster_path) { "https://image.tmdb.org/t/p/w300$($m.poster_path)" } else { '' })
                overview = $m.overview
                source = $src.name
            }
            $pageCount++
        }

        Write-Host "  page ${page}/${maxPages}: +${pageCount}"
        $page++
        Start-Sleep -Milliseconds 300
    }
}

Write-Host "`n========================================"
Write-Host "TMDB total: $($allMovies.Count) movies (>= ${MIN_YEAR})"

$list = @($allMovies.Values | Sort-Object { $_.voteCount } -Descending)

Write-Host "`nTop 15:"
for ($i = 0; $i -lt [Math]::Min(15, $list.Count); $i++) {
    $m = $list[$i]
    $idx = $i + 1
    $line = "  ${idx}. $($m.title) ($($m.year)) $($m.language) r=$($m.rating) v=$($m.voteCount) [$($m.source)]"
    Write-Host $line
}

$json = $list | ConvertTo-Json -Depth 3
[System.IO.File]::WriteAllText($OUTPUT, $json, [System.Text.Encoding]::UTF8)
Write-Host "`nSaved to: $OUTPUT"
Write-Host "========================================"
