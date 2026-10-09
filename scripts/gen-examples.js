/**
 * 生成示例 PDF 和 DOCX 文件，用于演示。
 * 运行: node scripts/gen-examples.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ============ 生成最小可用 PDF ============
function buildPdf() {
  const lines = [
    '%PDF-1.4',
    '1 0 obj',
    '<< /Type /Catalog /Pages 2 0 R >>',
    'endobj',
    '2 0 obj',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    'endobj',
    '3 0 obj',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    'endobj',
    '4 0 obj',
    '<< /Length 120 >>',
    'stream',
    'BT /F1 20 Tf 50 780 Td (Learning Repository - Sample PDF) Tj ET',
    'BT /F1 14 Tf 50 740 Td (This is a sample PDF document for demonstration.) Tj ET',
    'BT /F1 14 Tf 50 710 Td (The viewer supports page navigation and zoom.) Tj ET',
    'BT /F1 12 Tf 50 660 Td (You can replace this file with your own PDF documents.) Tj ET',
    'endstream',
    'endobj',
    '5 0 obj',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    'endobj',
    'xref',
    '0 6',
    '0000000000 65535 f ',
  ];

  // 计算每个对象的字节偏移
  const bodyStart = lines.join('\n');
  let offsets = [0];
  let current = 0;
  const objRegex = /\n(\d+) 0 obj/g;
  // 重新构建以追踪偏移
  let output = '';
  const allLines = [];
  const header = '%PDF-1.4\n';
  output = header;
  allLines.push(header);

  // 用更简单的方法：直接写出并记录偏移
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    '4 0 obj\n<< /Length 120 >>\nstream\nBT /F1 20 Tf 50 780 Td (Learning Repository - Sample PDF) Tj ET\nBT /F1 14 Tf 50 740 Td (This is a sample PDF document for demonstration.) Tj ET\nBT /F1 14 Tf 50 710 Td (The viewer supports page navigation and zoom.) Tj ET\nBT /F1 12 Tf 50 660 Td (You can replace this file with your own PDF documents.) Tj ET\nendstream\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = header;
  const off = [];
  objects.forEach((obj, i) => {
    off.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += obj;
  });

  const xrefStart = Buffer.byteLength(pdf, 'latin1');
  pdf += 'xref\n';
  pdf += `0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  off.forEach(o => {
    pdf += String(o).padStart(10, '0') + ' 00000 n \n';
  });
  pdf += 'trailer\n';
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += xrefStart + '\n';
  pdf += '%%EOF';

  return Buffer.from(pdf, 'latin1');
}

// ============ 生成最小可用 DOCX (ZIP + OOXML) ============
function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content, 'utf8');
    const compressed = zlib.deflateRawSync(data);
    const useCompressed = compressed.length < data.length;
    const payload = useCompressed ? compressed : data;
    const method = useCompressed ? 8 : 0;
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // signature
    local.writeUInt16LE(20, 4);          // version
    local.writeUInt16LE(0, 6);           // flags
    local.writeUInt16LE(method, 8);      // compression
    local.writeUInt16LE(0, 10);          // mod time
    local.writeUInt16LE(0, 12);          // mod date
    local.writeUInt32LE(crc, 14);        // crc32
    local.writeUInt32LE(payload.length, 18); // compressed size
    local.writeUInt32LE(data.length, 22);    // uncompressed size
    local.writeUInt16LE(Buffer.byteLength(name), 26); // name length
    local.writeUInt16LE(0, 28);          // extra length

    const nameBuf = Buffer.from(name, 'utf8');
    chunks.push(local, nameBuf, payload);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(payload.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);

    offset += local.length + nameBuf.length + payload.length;
  }

  const centralBuf = Buffer.concat(central);
  const centralStart = offset;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...chunks, centralBuf, end]);
}

function buildDocx() {
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p><w:r><w:t>学习资料库 - DOCX 示例文档</w:t></w:r></w:p>
<w:p><w:r><w:t>这是一个用于演示的 Word 文档。</w:t></w:r></w:p>
<w:p><w:r><w:t>文档内容会被自动转换为 HTML 在网页中展示。</w:t></w:r></w:p>
<w:p><w:r><w:t>你可以用自己的 .docx 文件替换此示例。</w:t></w:r></w:p>
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
</w:body>
</w:document>`,
  };
  return buildZip(files);
}

// ============ 写入文件 ============
const docsDir = path.join(__dirname, '..', 'docs');

const pdfPath = path.join(docsDir, 'sample.pdf');
fs.writeFileSync(pdfPath, buildPdf());
console.log('✓ 生成示例 PDF:', pdfPath);

const docxPath = path.join(docsDir, 'sample.docx');
fs.writeFileSync(docxPath, buildDocx());
console.log('✓ 生成示例 DOCX:', docxPath);

// 为 PDF 和 DOCX 创建元数据文件
const pdfMeta = {
  title: '示例 PDF 文档',
  date: '2024-02-20',
  category: '示例',
  tags: ['PDF', '演示'],
  description: '用于演示 PDF 在线查看功能的示例文档。',
};
fs.writeFileSync(
  path.join(docsDir, 'sample.meta.json'),
  JSON.stringify(pdfMeta, null, 2)
);
console.log('✓ 生成 PDF 元数据');

const docxMeta = {
  title: '示例 Word 文档',
  date: '2024-02-22',
  category: '示例',
  tags: ['DOCX', 'Word', '演示'],
  description: '用于演示 DOCX 文档在线展示功能的示例。',
};
fs.writeFileSync(
  path.join(docsDir, 'sample.docx.meta.json'),
  JSON.stringify(docxMeta, null, 2)
);
console.log('✓ 生成 DOCX 元数据');
