/**
 * 文档查看器 - 支持 Markdown / PDF / DOCX
 */
(function () {
  'use strict';

  // 配置 PDF.js worker
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const viewer = document.getElementById('viewer');
  const viewerTitle = document.getElementById('viewer-title');
  const viewerBody = document.getElementById('viewer-body');
  const viewerLoading = document.getElementById('viewer-loading');
  const markdownView = document.getElementById('markdown-view');
  const pdfView = document.getElementById('pdf-view');
  const docxView = document.getElementById('docx-view');
  const pdfContainer = document.getElementById('pdf-container');
  const pdfPageInfo = document.getElementById('pdf-page-info');
  const pdfZoomLevel = document.getElementById('pdf-zoom-level');

  let currentDoc = null;
  let pdfDoc = null;
  let pdfCurrentPage = 1;
  let pdfScale = 1.2;
  let pdfRendering = false;

  const allViews = [markdownView, pdfView, docxView];

  function showLoading() {
    viewerLoading.hidden = false;
    allViews.forEach((v) => (v.hidden = true));
  }

  function hideLoading() {
    viewerLoading.hidden = true;
  }

  function showView(view) {
    hideLoading();
    allViews.forEach((v) => (v.hidden = true));
    view.hidden = false;
  }

  /**
   * 打开文档
   */
  function open(doc) {
    currentDoc = doc;
    viewer.hidden = false;
    document.body.style.overflow = 'hidden';
    viewerTitle.textContent = doc.title;
    viewerBody.scrollTop = 0;
    showLoading();

    switch (doc.type) {
      case 'markdown':
        renderMarkdown(doc);
        break;
      case 'pdf':
        renderPdf(doc);
        break;
      case 'docx':
        renderDocx(doc);
        break;
      default:
        showError('不支持的文档类型');
    }
  }

  /**
   * 关闭查看器
   */
  function close() {
    viewer.hidden = true;
    document.body.style.overflow = '';
    // 清理 PDF 资源
    if (pdfDoc) {
      pdfDoc.destroy();
      pdfDoc = null;
    }
    pdfContainer.innerHTML = '';
    currentDoc = null;
    // 清理 hash
    if (location.hash.startsWith('#/doc/')) {
      history.pushState('', document.title, location.pathname + location.search);
    }
  }

  function showError(msg) {
    hideLoading();
    allViews.forEach((v) => (v.hidden = true));
    markdownView.hidden = false;
    markdownView.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
      <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
      <p>${msg}</p>
    </div>`;
  }

  /* ---------------- Markdown ---------------- */
  function renderMarkdown(doc) {
    fetch(doc.path)
      .then((res) => {
        if (!res.ok) throw new Error('文件加载失败');
        return res.text();
      })
      .then((text) => {
        // 去除 frontmatter
        const content = text.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, '');
        const html = marked.parse(content);
        const clean = DOMPurify.sanitize(html);
        markdownView.innerHTML = clean;
        // 代码高亮
        markdownView.querySelectorAll('pre code').forEach((block) => {
          try {
            hljs.highlightElement(block);
          } catch (e) {
            /* ignore */
          }
        });
        showView(markdownView);
      })
      .catch((err) => {
        showError('Markdown 加载失败：' + err.message);
      });
  }

  /* ---------------- DOCX ---------------- */
  function renderDocx(doc) {
    fetch(doc.path)
      .then((res) => {
        if (!res.ok) throw new Error('文件加载失败');
        return res.arrayBuffer();
      })
      .then((buffer) => mammoth.convertToHtml({ arrayBuffer: buffer }))
      .then((result) => {
        docxView.innerHTML = result.value;
        showView(docxView);
      })
      .catch((err) => {
        showError('Word 文档加载失败：' + err.message);
      });
  }

  /* ---------------- PDF ---------------- */
  function renderPdf(doc) {
    showView(pdfView);
    pdfContainer.innerHTML = '';
    pdfCurrentPage = 1;
    pdfScale = 1.2;

    const loadingTask = pdfjsLib.getDocument(doc.path);
    loadingTask.promise
      .then((pdf) => {
        pdfDoc = pdf;
        pdfPageInfo.textContent = `1 / ${pdf.numPages}`;
        renderPdfPage(1);
      })
      .catch((err) => {
        showError('PDF 加载失败：' + err.message);
      });
  }

  function renderPdfPage(num) {
    if (!pdfDoc || pdfRendering) return;
    pdfRendering = true;
    pdfCurrentPage = num;

    pdfDoc.getPage(num).then((page) => {
      const viewport = page.getViewport({ scale: pdfScale });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      pdfContainer.innerHTML = '';
      pdfContainer.appendChild(canvas);

      page
        .render({ canvasContext: ctx, viewport })
        .promise.then(() => {
          pdfRendering = false;
        })
        .catch(() => {
          pdfRendering = false;
        });

      pdfPageInfo.textContent = `${num} / ${pdfDoc.numPages}`;
      updatePdfButtons();
    });
  }

  function updatePdfButtons() {
    document.getElementById('pdf-prev').disabled = pdfCurrentPage <= 1;
    document.getElementById('pdf-next').disabled =
      !pdfDoc || pdfCurrentPage >= pdfDoc.numPages;
    pdfZoomLevel.textContent = Math.round(pdfScale * 100) + '%';
  }

  function pdfPrev() {
    if (pdfCurrentPage > 1) renderPdfPage(pdfCurrentPage - 1);
  }

  function pdfNext() {
    if (pdfDoc && pdfCurrentPage < pdfDoc.numPages)
      renderPdfPage(pdfCurrentPage + 1);
  }

  function pdfZoomIn() {
    if (pdfScale < 3) {
      pdfScale = Math.min(3, +(pdfScale + 0.2).toFixed(1));
      renderPdfPage(pdfCurrentPage);
    }
  }

  function pdfZoomOut() {
    if (pdfScale > 0.5) {
      pdfScale = Math.max(0.5, +(pdfScale - 0.2).toFixed(1));
      renderPdfPage(pdfCurrentPage);
    }
  }

  function pdfDownload() {
    if (currentDoc) {
      const a = document.createElement('a');
      a.href = currentDoc.path;
      a.download = currentDoc.path.split('/').pop();
      a.click();
    }
  }

  // PDF 工具栏事件
  document.getElementById('pdf-prev').addEventListener('click', pdfPrev);
  document.getElementById('pdf-next').addEventListener('click', pdfNext);
  document.getElementById('pdf-zoom-in').addEventListener('click', pdfZoomIn);
  document.getElementById('pdf-zoom-out').addEventListener('click', pdfZoomOut);
  document.getElementById('pdf-download').addEventListener('click', pdfDownload);

  // 键盘导航
  document.addEventListener('keydown', (e) => {
    if (viewer.hidden) return;
    if (e.key === 'Escape') {
      close();
    } else if (currentDoc && currentDoc.type === 'pdf') {
      if (e.key === 'ArrowLeft') pdfPrev();
      else if (e.key === 'ArrowRight') pdfNext();
    }
  });

  // 关闭按钮
  document.getElementById('viewer-close').addEventListener('click', close);
  document.getElementById('viewer-back').addEventListener('click', close);

  // 暴露全局
  window.DocViewer = { open, close };
})();
