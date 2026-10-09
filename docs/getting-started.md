---
title: 快速开始
date: 2024-03-01
category: 指南
tags: [入门, 使用说明]
description: 了解如何使用这个学习资料库，添加你自己的文档。
---

# 快速开始

欢迎使用个人学习资料库！这是一个支持 **Markdown**、**PDF**、**DOCX** 三种格式的静态文档站点。

## 添加文档

将你的文档放入项目的 `docs/` 目录即可，支持任意层级的子目录。

### 支持的格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| Markdown | `.md` / `.markdown` | 支持 YAML frontmatter 元数据 |
| PDF | `.pdf` | 在线翻页查看 |
| Word | `.docx` | 自动转换为 HTML 展示 |

### Markdown 元数据

在 Markdown 文件顶部添加 frontmatter，可以为文档设置标题、分类、标签等：

```yaml
---
title: 我的学习笔记
date: 2024-03-01
category: 编程
tags: [JavaScript, 前端]
description: 这是一篇关于 JavaScript 的学习笔记
---
```

### PDF / DOCX 元数据

对于 PDF 和 DOCX 文件，可以创建同名的 `.meta.json` 文件：

```json
{
  "title": "设计模式详解",
  "date": "2024-03-01",
  "category": "设计",
  "tags": ["PDF", "设计模式"],
  "description": "经典设计模式的 PDF 教程"
}
```

如果没有元数据文件，系统会自动使用文件名作为标题，文件修改时间作为日期。

## 重新生成索引

添加或修改文档后，运行以下命令重新生成索引：

```bash
npm run manifest
```

在 GitHub 上推送代码时，GitHub Actions 会自动执行此步骤。

## 代码示例

资料库支持代码高亮，例如：

```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
}

greet('World');
```

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(10))
```

## 引用与列表

> 这是一段引用文字。学习是一个持续的过程，保持好奇心和耐心。

- 第一项内容
- 第二项内容
  - 嵌套项 A
  - 嵌套项 B
- 第三项内容

1. 有序列表第一项
2. 有序列表第二项
3. 有序列表第三项

## 链接与图片

你可以在 Markdown 中使用 [链接](https://github.com) 和图片。

---

现在就开始添加你的学习资料吧！
