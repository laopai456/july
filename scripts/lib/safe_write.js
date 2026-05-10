const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', '..', 'data.json');
const BACKUP_PATH = DATA_PATH + '.bak';

function getGenreCounts(data) {
  const gi = data.genreIndex || {};
  const counts = {};
  for (const key of Object.keys(gi)) {
    const movies = gi[key].movie || [];
    counts[key] = movies.length;
  }
  return counts;
}

function safeWriteData(data, options = {}) {
  const { allowShrink = false, scriptName = 'unknown' } = options;

  let original;
  try {
    original = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch (e) {
    console.error(`[safeWrite] 读取 data.json 失败: ${e.message}，直接写入`);
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
    return;
  }
  const before = getGenreCounts(original);
  const after = getGenreCounts(data);

  const warnings = [];
  const errors = [];

  for (const key of Object.keys(before)) {
    if (before[key] > 0 && (after[key] === undefined || after[key] === 0)) {
      errors.push(`${key}: ${before[key]} -> ${after[key] || 0}`);
    } else if (before[key] > 0 && after[key] < before[key] * 0.5) {
      warnings.push(`${key}: ${before[key]} -> ${after[key]}`);
    }
  }

  if (errors.length > 0 && !allowShrink) {
    console.error(`\n❌ [${scriptName}] 数据安全检查失败！以下分类数据将丢失：`);
    for (const e of errors) console.error(`  ${e}`);
    console.error(`\n如果确实要清空，请传 { allowShrink: true }`);
    console.error(`写入已中止，data.json 未修改`);
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn(`\n⚠️ [${scriptName}] 以下分类数据大幅减少：`);
    for (const w of warnings) console.warn(`  ${w}`);
  }

  try {
    fs.copyFileSync(DATA_PATH, BACKUP_PATH);
    console.log(`[safeWrite] 备份 -> data.json.bak`);
  } catch (e) {
    console.warn(`[safeWrite] 备份失败: ${e.message}，继续写入`);
  }

  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`[safeWrite] 写入失败: ${e.message}`);
    try {
      if (fs.existsSync(BACKUP_PATH)) fs.copyFileSync(BACKUP_PATH, DATA_PATH);
    } catch (e2) {
      console.error(`[safeWrite] 恢复备份也失败: ${e2.message}`);
    }
    process.exit(1);
  }

  const diff = {};
  for (const key of Object.keys({...before, ...after})) {
    const b = before[key] || 0;
    const a = after[key] || 0;
    if (b !== a) diff[key] = `${b} -> ${a}`;
  }
  if (Object.keys(diff).length > 0) {
    console.log(`[safeWrite] 变更: ${JSON.stringify(diff)}`);
  }
  console.log(`[safeWrite] 写入完成`);
}

module.exports = { safeWriteData, DATA_PATH };
