import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const AUTO_TOPIC = {
  id: 'local-new',
  topic: '新近写作',
  blurb: '近期完成并整理成 ePub 的长篇研究与专题。',
  graphFocus: null,
};

export function normalizeBookTitle(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('zh-CN');
}

export function decodeXmlText(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&#([0-9]+);/g, (_, n) => String.fromCodePoint(Number.parseInt(n, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function dcValue(opf, field) {
  const match = new RegExp(`<dc:${field}\\b[^>]*>([\\s\\S]*?)<\\/dc:${field}>`, 'i').exec(opf);
  return decodeXmlText(match?.[1] ?? '');
}

export function parseEpubMetadata(opf) {
  const title = dcValue(opf, 'title');
  const author = dcValue(opf, 'creator');
  return {
    title: title.includes('\uFFFD') ? '' : title,
    author: author.includes('\uFFFD') ? '' : author,
    identifier: dcValue(opf, 'identifier'),
    date: dcValue(opf, 'date'),
  };
}

export function readEpubMetadata(epubPath) {
  const container = execFileSync('unzip', ['-p', epubPath, 'META-INF/container.xml'], { encoding: 'utf8' });
  const opfRel = /full-path="([^"]+)"/i.exec(container)?.[1];
  if (!opfRel) throw new Error('container.xml 无 OPF 路径');
  const opf = execFileSync('unzip', ['-p', epubPath, opfRel], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return { ...parseEpubMetadata(opf), opfRel };
}

export function autoBookSlug(sourceFile) {
  const stem = String(sourceFile).replace(/\.epub$/i, '').normalize('NFKC');
  const readable = stem
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const digest = crypto.createHash('sha256').update(stem).digest('hex').slice(0, 8);
  return `${readable || 'book'}-${digest}`;
}

export function makeAutoBook({ sourceFile, title, author }) {
  const slug = autoBookSlug(sourceFile);
  return {
    id: `CB_local_${slug}`,
    title,
    author: author || 'Rick × AI',
    sourceFile,
    cover: `/assets/books/epub-covers/${slug}.png`,
    epub: `/assets/books/epub/${slug}.epub`,
    progress: 0,
    finished: false,
    notes: 0,
    lastRead: 0,
    highlights: [],
  };
}
