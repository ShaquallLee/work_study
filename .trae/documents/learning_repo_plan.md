# 个人学习资料库网站 实现计划

## 需求理解
构建一个静态个人学习资料库网站，支持 Markdown / PDF / DOCX 文档展示，用户往项目中添加新文档后能自动出现在列表中，最终部署到 GitHub Pages 免费对外展示。要求界面美观、交互灵活。

## 仓库研究
工作目录 `/Users/lsg/Documents/trae_projects` 当前为空，无现有代码。

## 技术选型
| 能力 | 方案 | 说明 |
|------|------|------|
| Markdown 渲染 | `marked.js` + `DOMPurify`（jsDelivr CDN） | 解析 + XSS 净化 |
| PDF 渲染 | `pdfjs-dist`（cdnjs CDN） | Canvas 渲染页面，支持翻页/缩放 |
| DOCX 渲染 | `mammoth.js`（jsDelivr CDN） | docx → HTML |
| 代码高亮 | `highlight.js`（CDN） | 美化 Markdown 中的代码块 |
| 文档索引 | Node.js 脚本扫描 `docs/` 生成 `manifest.json` | 支持 YAML frontmatter 元数据 |
| 样式 | 原生 CSS + CSS 变量 | 深色/浅色主题、响应式、动画 |
| 部署 | GitHub Pages + GitHub Actions | push 时自动生成 manifest 并部署 |

## 文件结构
```
learning-repo/
├── docs/                        # 用户放文档的目录（支持子目录）
│   ├── example.md
│   ├── sample.pdf
│   ├── notes.docx
│   └── programming/
│       └── js-basics.md
├── scripts/
│   └── generate-manifest.js     # 扫描 docs/ 生成 manifest.json
├── assets/
│   ├── css/
│   │   └── style.css            # 全局样式
│   └── js/
│       ├── app.js               # 主逻辑（列表、路由、搜索）
│       └── viewer.js            # 文档查看器（三种格式）
├── index.html                   # 单页应用入口
├── manifest.json                # 由脚本自动生成
├── package.json                 # manifest 脚本依赖
├── .nojekyll                    # 禁用 GitHub Pages 的 Jekyll
└── .github/
    └── workflows/
        └── deploy.yml           # 自动生成 manifest + 部署
```

## 文档元数据规范
- **Markdown 文件**: 支持 YAML frontmatter
  ```yaml
  ---
  title: 文档标题
  date: 2024-01-15
  category: 编程
  tags: [JavaScript, 前端]
  description: 简要描述
  ---
  ```
- **PDF / DOCX 文件**: 支持同名 `.meta.json` 侧car文件，或自动从文件名推断标题
  ```json
  { "title": "文档标题", "date": "2024-01-15", "category": "编程", "tags": ["PDF"] }
  ```
- 无元数据时，标题取文件名（去扩展名），日期取文件修改时间

## 实现步骤

### 1. 项目骨架
- 创建目录结构、`package.json`、`.nojekyll`
- 示例文档放入 `docs/`（各格式各一份）

### 2. Manifest 生成脚本 `scripts/generate-manifest.js`
- 递归扫描 `docs/` 下 `.md`/`.markdown`/`.pdf`/`.docx` 文件
- 解析 Markdown frontmatter（用轻量正则解析，不引依赖）
- 读取 `.meta.json` 侧car文件
- 生成包含 `id, title, type, path, category, tags, date, description` 的 `manifest.json`
- 提供 CLI 用法 `node scripts/generate-manifest.js`

### 3. `index.html` 页面结构
- 顶部导航栏：站点标题、主题切换、搜索框
- 主区域：文档卡片网格列表 + 分类/标签筛选
- 文档查看器：全屏覆盖层（viewer），内含三种格式渲染容器
- 加载 CDN 脚本：marked, DOMPurify, highlight.js, pdfjs, mammoth

### 4. 样式 `assets/css/style.css`
- CSS 变量定义主题色（浅色/深色两套）
- 卡片网格布局，hover 微动效
- 搜索/筛选器样式
- Viewer 覆盖层、PDF 工具栏、Markdown 排版样式
- 响应式断点（移动端单列）
- 平滑过渡动画

### 5. 应用逻辑 `assets/js/app.js`
- 加载 `manifest.json` 渲染文档列表
- 搜索（标题/标签/描述）+ 分类筛选 + 标签筛选
- 卡片点击打开 viewer，hash 路由支持（`#/doc/:id` 可分享链接）
- 主题切换（localStorage 持久化）
- 空状态、加载状态

### 6. 文档查看器 `assets/js/viewer.js`
- 根据文档类型分发：
  - **markdown**: fetch → marked.parse → DOMPurify.sanitize → 注入，代码高亮
  - **pdf**: pdfjsLib.getDocument → 逐页 canvas 渲染，页码导航 + 缩放
  - **docx**: fetch → mammoth.convertToHtml → 注入
- 关闭按钮、键盘 ESC 关闭、左右翻页（PDF）
- 返回列表按钮

### 7. GitHub Actions 部署 `.github/workflows/deploy.yml`
- push 到 main 时触发
- 安装 Node → 运行 `node scripts/generate-manifest.js`
- 上传整个项目为 Pages artifact → 部署到 GitHub Pages
- 配置 `permissions: pages: write, id-token: write`

### 8. 本地验证
- 运行 `node scripts/generate-manifest.js` 检查 manifest.json
- 用 `python -m http.server` 启动本地服务器预览
- 测试三种格式文档的展示
- 测试搜索、筛选、主题切换、移动端响应

## 依赖与注意事项
- 所有前端库通过 CDN 加载，无需 npm 安装（仅 manifest 脚本用 Node 内置 fs/path，零依赖）
- PDF.js 的 worker 需正确配置 `workerSrc`
- GitHub Pages 路径问题：用相对路径引用资源，适配子路径部署
- DOCX 图片：mammoth 默认转 base64 内嵌，体积大的 docx 可能慢；先支持文本为主
- CORS：本地用 http server 预览，直接 file:// 打开会 fetch 失败

## 验证清单
- [ ] `node scripts/generate-manifest.js` 正确生成 manifest.json
- [ ] 本地服务器可访问，列表展示所有文档
- [ ] Markdown 文档正确渲染（标题、代码高亮、表格）
- [ ] PDF 文档可翻页查看
- [ ] DOCX 文档可展示文本内容
- [ ] 搜索、分类筛选、标签筛选正常
- [ ] 深色/浅色主题切换正常且持久化
- [ ] 移动端响应式正常
- [ ] hash 路由可分享文档链接

## 风险与应对
- **PDF 大文件加载慢**: 分页懒渲染，不一次性渲染所有页
- **DOCX 复杂格式丢失**: mammoth 主要保留文本结构，复杂排版会简化，属预期
- **GitHub Pages 子路径**: 所有资源用相对路径，manifest 路径也用相对路径
- **manifest 未更新**: GitHub Actions 自动生成；本地手动运行脚本
