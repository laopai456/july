$apiKey = '96ac6a609d077c2d49da61e620697ea7'

$movies = @(
    @{en='A Frozen Flower'; zh=[char]0x971c + [char]0x82b1 + [char]0x5e97; year=2008},
    @{en='The Housemaid 2010'; zh='Nu Pu'; year=2010},
    @{en='The Isle Kim Ki Duk'; zh='Piao Liu Yu Shi'; year=2000},
    @{en='The Taste of Money'; zh='Jin Qian De Wei Dao'; year=2012},
    @{en='Obsessed 2014'; zh='Ren Jian Zhong Du'; year=2014},
    @{en='Scarlet Letter Korean'; zh='Hong Zi'; year=2004},
    @{en='Portrait of a Beauty'; zh='Mei Ren Tu'; year=2008},
    @{en='The Servant 2010'; zh='Fang Zi Zhuan'; year=2010},
    @{en='Untold Scandal'; zh='Chou Wen'; year=2003},
    @{en='A Man and a Woman 2016'; zh='Nan Yu Nu'; year=2016},
    @{en='Happy End 1999'; zh='Kuai Le Dao Si'; year=1999},
    @{en='B.E.D 2012 Korean'; zh='B.E.D'; year=2012},
    @{en='Green Chair'; zh='Lv Se Yi Zi'; year=2005},
    @{en='Lie 2000 Korean'; zh='Huang Yan'; year=2000},
    @{en='April Snow'; zh='Wai Chu'; year=2005},
    @{en='Natalie 2010 Korean'; zh='Na Ta Li'; year=2010},
    @{en='Scarlet Innocence'; zh='Ma Dan Zan'; year=2014},
    @{en='Too Young to Die 2008'; zh='Si Ye Wu Fang'; year=2008},
    @{en='Sad Movie'; zh='Bei Shang Dian Ying'; year=2005},
    @{en='Love 2007 Korean'; zh='Ai'; year=2007}
)

$dataRaw = [System.IO.File]::ReadAllText((Join-Path $PSScriptRoot '..\data.json'), [System.Text.Encoding]::UTF8)
$data = $dataRaw | ConvertFrom-Json
$existingIds = @()
foreach ($item in $data.genreIndex.'情色'.movie) { $existingIds += $item.doubanId }

$added = 0
foreach ($m in $movies) {
    $url = "https://api.themoviedb.org/3/search/movie?api_key=$apiKey&language=ko-KR&query=$([System.Uri]::EscapeDataString($m.en))&include_adult=true&page=1"
    try {
        $r = Invoke-RestMethod -Uri $url -TimeoutSec 10
    } catch {
        Write-Host "[ERR] $($m.en) - $_"
        continue
    }
    
    $found = $null
    foreach ($item in $r.results) {
        if ($item.original_language -eq 'ko') {
            $yr = 0
            if ($item.release_date -and $item.release_date.Length -ge 4) {
                $yr = [int]($item.release_date.Substring(0,4))
            }
            if ([Math]::Abs($yr - $m.year) -le 3) { $found = $item; break }
        }
    }
    if (-not $found) {
        foreach ($item in $r.results) {
            if ($item.original_language -eq 'ko') { $found = $item; break }
        }
    }
    
    if (-not $found) { Write-Host "[MISS] $($m.en)"; Start-Sleep -Milliseconds 200; continue }
    
    $tmdbId = "tmdb_$($found.id)"
    if ($existingIds -contains $tmdbId) { Write-Host "[EXISTS] $($m.en)"; continue }
    
    $yr = if ($found.release_date) { $found.release_date.Substring(0,4) } else { '0' }
    $poster = if ($found.poster_path) { "https://image.tmdb.org/t/p/w300$($found.poster_path)" } else { '' }
    $rate = [math]::Round($found.vote_average, 1)
    $hotScore = [math]::Round($rate * 10 + 150)
    $overview = if ($found.overview) { $found.overview } else { '' }
    
    $movieObj = [PSCustomObject]@{
        doubanId = $tmdbId
        title = $zh_titles[[Array]::IndexOf($movies, $m)]
        rate = "$rate"
        year = $yr
        cover = $poster
        directors = @()
        casts = @()
        genres = @()
        abstract = $overview
        region = '韩国'
        hotScore = $hotScore
        supplement = $true
    }
    
    $data.genreIndex.'情色'.movie += $movieObj
    $existingIds += $tmdbId
    $added++
    Write-Host "[ADD] $($m.zh) -> $($found.title) ($yr) r=$rate hs=$hotScore"
    Start-Sleep -Milliseconds 300
}

$data.genreIndex.'情色'.movie = @($data.genreIndex.'情色'.movie | Sort-Object { $_.hotScore } -Descending)
$json = $data | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot '..\data.json'), $json, [System.Text.Encoding]::UTF8)

$total = $data.genreIndex.'情色'.movie.Count
Write-Host "`nAdded $added, total $total movies"
