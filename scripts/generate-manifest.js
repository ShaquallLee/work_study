/**
 * 扫描 docs/ 目录，生成 manifest.json 文档索引。
 * 用法: node scripts/generate-manifest.js
 *
 * 支持的文档格式: .md, .markdown, .pdf, .docx
 *
 * Markdown 支持 YAML frontmatter:
 *   ---
 *   title: 标题
 *   date: 2024-01-01
 *   category: 分类
 *   tags: [标签1, 标签2]
 *   description: 描述
 *   ---
 *
 * PDF/DOCX 支持同名元数据文件:
 *   - <文件名>.meta.json (优先)
 *   - <文件名>.<扩展名>.meta.json (备选)
 *   例如 sample.pdf 对应 sample.meta.json 或 sample.pdf.meta.json
 */
const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const OUTPUT_FILE = path.join(__dirname, '..', 'manifest.json');

const SUPPORTED_EXTENSIONS = new Set(['.md', '.markdown', '.pdf', '.docx']);

const TYPE_MAP = {
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.pdf': 'pdf',
  '.docx': 'docx',
};

const TYPE_LABEL = {
  markdown: 'Markdown',
  pdf: 'PDF',
  docx: 'Word',
};

/**
 * 递归遍历目录，返回所有匹配的文件路径
 */
function walkDir(dir, baseDir = dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, baseDir));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

/**
 * 解析 YAML frontmatter（轻量实现，不引依赖）
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) return { data: {}, body: content };

  const yamlBlock = match[1];
  const data = {};
  const lines = yamlBlock.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();

    // 去除引号
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // 数组 [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      if (inner === '') {
        data[key] = [];
      } else {
        data[key] = inner
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      }
    } else {
      data[key] = value;
    }
  }

  return { data, body: content.slice(match[0].length) };
}

/**
 * 读取元数据侧car文件
 */
function readMetaFile(filePath) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const nameWithoutExt = base.replace(/\.[^.]+$/, '');

  // 优先: <name>.<ext>.meta.json (避免同名不同扩展名冲突)
  const metaPath1 = path.join(dir, `${base}.meta.json`);
  // 备选: <name>.meta.json
  const metaPath2 = path.join(dir, `${nameWithoutExt}.meta.json`);

  for (const metaPath of [metaPath1, metaPath2]) {
    if (fs.existsSync(metaPath)) {
      try {
        const raw = fs.readFileSync(metaPath, 'utf8');
        return JSON.parse(raw);
      } catch (e) {
        console.warn(`警告: 元数据文件解析失败 ${metaPath}: ${e.message}`);
      }
    }
  }
  return null;
}

/**
 * 处理单个文档，返回文档对象
 */
function processDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = TYPE_MAP[ext];
  // 相对路径（正斜杠，便于浏览器访问）
  const relativePath = path
    .relative(path.join(__dirname, '..'), filePath)
    .split(path.sep)
    .join('/');

  const baseName = path.basename(filePath, ext);
  const stat = fs.statSync(filePath);

  let title = baseName;
  let date = stat.mtime.toISOString().slice(0, 10);
  let category = '未分类';
  let tags = [TYPE_LABEL[type]];
  let description = '';

  if (type === 'markdown') {
    const content = fs.readFileSync(filePath, 'utf8');
    const { data } = parseFrontmatter(content);
    if (data.title) title = data.title;
    if (data.date) date = data.date;
    if (data.category) category = data.category;
    if (data.tags && Array.isArray(data.tags)) tags = data.tags;
    if (data.description) description = data.description;
  } else {
    const meta = readMetaFile(filePath);
    if (meta) {
      if (meta.title) title = meta.title;
      if (meta.date) date = meta.date;
      if (meta.category) category = meta.category;
      if (meta.tags && Array.isArray(meta.tags)) tags = meta.tags;
      if (meta.description) description = meta.description;
    }
  }

  // 生成稳定 ID：用相对路径去掉扩展名和 docs/ 前缀
  const id = relativePath
    .replace(/^docs\//, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]/g, '-');

  return {
    id,
    title,
    type,
    path: relativePath,
    category,
    tags,
    date,
    description,
    updated: stat.mtime.toISOString(),
  };
}

function main() {
  console.log('扫描目录:', DOCS_DIR);

  if (!fs.existsSync(DOCS_DIR)) {
    console.error('错误: docs/ 目录不存在');
    process.exit(1);
  }

  const files = walkDir(DOCS_DIR);
  console.log(`发现 ${files.length} 个文档文件`);

  const documents = files
    .map((f) => {
      try {
        return processDocument(f);
      } catch (e) {
        console.warn(`警告: 处理文件失败 ${f}: ${e.message}`);
        return null;
      }
    })
    .filter(Boolean);

  // 处理 ID 冲突：若有重复 ID，追加类型后缀 (如 sample-pdf, sample-docx)
  const idCount = {};
  documents.forEach((d) => {
    idCount[d.id] = (idCount[d.id] || 0) + 1;
  });
  documents.forEach((d) => {
    if (idCount[d.id] > 1) {
      d.id = `${d.id}-${d.type}`;
    }
  });

  // 按日期降序排列
  documents.sort((a, b) => (a.date < b.date ? 1 : -1));

  // 收集所有分类和标签
  const categories = [...new Set(documents.map((d) => d.category))];
  const allTags = [...new Set(documents.flatMap((d) => d.tags))];

  const manifest = {
    generatedAt: new Date().toISOString(),
    count: documents.length,
    categories,
    tags: allTags,
    documents,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`✓ 已生成 manifest.json，共 ${documents.length} 个文档`);
  console.log(`  分类: ${categories.join(', ')}`);
  console.log(`  标签: ${allTags.join(', ')}`);
}

main();
