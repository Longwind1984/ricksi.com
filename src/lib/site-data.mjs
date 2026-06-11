// 构建时读取 data/*.json（本地采集脚本的产物）。
// 文件缺失或损坏时返回 null，页面回退到样例数据并保留「样例数据」标注。
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve('data');

function readJson(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));
  } catch {
    return null;
  }
}

export function loadSiteData() {
  return {
    activity: readJson('activity.json'),
    usage: readJson('usage.json'),
    graph: readJson('graph.json'),
    reading: readJson('reading.json'),
  };
}

/* 把 ISO 时间渲染为「6月10日 14:30」风格的更新戳 */
export function stamp(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
