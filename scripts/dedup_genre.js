const fs = require('fs');
const path = require('path');
const DATA_FILE = path.join(__dirname, '..', 'data.json');

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const gi = data.genreIndex;
if (!gi) { console.log('无 genreIndex'); process.exit(0); }

const GENRE_TAGS = ['悬疑', '喜剧', '恐怖', '爱情'];
const seenMovie = new Set();
const seenDrama = new Set();
let total = 0;

for (const tag of GENRE_TAGS) {
  const d = gi[tag];
  if (!d) continue;

  const mb = (d.movie || []).length;
  d.movie = (d.movie || []).filter(item => {
    if (seenMovie.has(item.doubanId)) return false;
    seenMovie.add(item.doubanId);
    return true;
  });
  total += mb - d.movie.length;

  const db = (d.drama || []).length;
  d.drama = (d.drama || []).filter(item => {
    if (seenDrama.has(item.doubanId)) return false;
    seenDrama.add(item.doubanId);
    return true;
  });
  total += db - d.drama.length;
}

if (total > 0) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  console.log('去重完成: 移除 ' + total + ' 条重复作品');
} else {
  console.log('无重复');
}
