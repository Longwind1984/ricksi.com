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
    frontier: readJson('frontier.json'),
  };
}

/* 把 ISO 时间渲染为「6月10日 14:30」风格的更新戳。
   固定按北京时间（Asia/Shanghai）格式化——不依赖构建服务器时区：EdgeOne 与 Vercel 的
   默认时区可能不同，用 getHours() 会让同一份数据在两平台显示不同（甚至差 8 小时）。
   generated_at 由采集脚本以真实 UTC（new Date().toISOString()）写入，这里转成北京墙钟时间。 */
export function stamp(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai',
      month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(d).map((x) => [x.type, x.value])
  );
  return `${p.month}月${p.day}日 ${p.hour}:${p.minute}`;
}
