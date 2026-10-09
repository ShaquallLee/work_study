/**
 * 学习资料库 - 主应用逻辑
 */
(function () {
  'use strict';

  let manifest = null;
  let filteredDocs = [];
  let activeCategory = 'all';
  let activeTags = new Set();
  let searchQuery = '';

  const docGrid = document.getElementById('doc-grid');
  const emptyState = document.getElementById('empty-state');
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const categoryFilters = document.getElementById('category-filters');
  const tagFilters = document.getElementById('tag-filters');
  const statsBar = document.getElementById('stats-bar');
  const backToTop = document.getElementById('back-to-top');

  /* ---------------- 主题 ---------------- */
  function initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    setTheme(theme);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const icon = document.querySelector('#theme-toggle .theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    // 切换 highlight.js 主题
    document.getElementById('hljs-light').disabled = theme === 'dark';
    document.getElementById('hljs-dark').disabled = theme !== 'dark';
  }

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  /* ---------------- 加载 manifest ---------------- */
  async function loadManifest() {
    try {
      const res = await fetch('manifest.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      manifest = await res.json();
      renderFilters();
      applyFilters();
    } catch (err) {
      docGrid.innerHTML = '';
      emptyState.hidden = false;
      emptyState.innerHTML = `<div class="empty-icon">⚠️</div>
        <p>无法加载文档索引 (manifest.json)</p>
        <p style="font-size:13px;color:var(--text-muted);">${err.message}<br>请先运行 <code>npm run manifest</code> 生成索引</p>`;
    }
  }

  /* ---------------- 渲染筛选器 ---------------- */
  function renderFilters() {
    // 分类
    const cats = ['all', ...manifest.categories];
    categoryFilters.innerHTML = cats
      .map(
        (c) =>
          `<button class="filter-chip ${c === activeCategory ? 'active' : ''}" data-category="${c}">
            ${c === 'all' ? '全部' : c}
          </button>`
      )
      .join('');

    categoryFilters.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        activeCategory = chip.dataset.category;
        categoryFilters
          .querySelectorAll('.filter-chip')
          .forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        applyFilters();
      });
    });

    // 标签
    tagFilters.innerHTML = manifest.tags
      .map(
        (t) =>
          `<button class="filter-chip ${activeTags.has(t) ? 'active' : ''}" data-tag="${t}">
            #${t}
          </button>`
      )
      .join('');

    tagFilters.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        if (activeTags.has(tag)) activeTags.delete(tag);
        else activeTags.add(tag);
        chip.classList.toggle('active');
        applyFilters();
      });
    });
  }

  /* ---------------- 搜索与筛选 ---------------- */
  function applyFilters() {
    const q = searchQuery.trim().toLowerCase();
    filteredDocs = manifest.documents.filter((doc) => {
      // 分类
      if (activeCategory !== 'all' && doc.category !== activeCategory) return false;
      // 标签
      if (activeTags.size > 0) {
        const hasAll = [...activeTags].every((t) => doc.tags.includes(t));
        if (!hasAll) return false;
      }
      // 搜索
      if (q) {
        const haystack = (
          doc.title +
          ' ' +
          (doc.description || '') +
          ' ' +
          doc.tags.join(' ') +
          ' ' +
          doc.category
        ).toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    renderGrid();
  }

  function renderGrid() {
    statsBar.textContent = `共 ${filteredDocs.length} 篇文档`;

    if (filteredDocs.length === 0) {
      docGrid.innerHTML = '';
      emptyState.hidden = false;
      document.getElementById('clear-filters').onclick = clearAllFilters;
      return;
    }

    emptyState.hidden = true;
    docGrid.innerHTML = filteredDocs
      .map(
        (doc) => `
        <article class="doc-card" data-id="${doc.id}" tabindex="0" role="button">
          <div class="doc-card-header">
            <span class="doc-type-badge ${doc.type}">${typeLabel(doc.type)}</span>
            <span class="doc-category">${doc.category}</span>
          </div>
          <h3 class="doc-title">${escapeHtml(doc.title)}</h3>
          <p class="doc-description">${escapeHtml(doc.description || '暂无描述')}</p>
          <div class="doc-tags">
            ${doc.tags.slice(0, 4).map((t) => `<span class="doc-tag">#${escapeHtml(t)}</span>`).join('')}
            ${doc.tags.length > 4 ? `<span class="doc-tag">+${doc.tags.length - 4}</span>` : ''}
          </div>
          <div class="doc-meta">
            <span>${formatDate(doc.date)}</span>
            <span>点击查看 →</span>
          </div>
        </article>`
      )
      .join('');

    docGrid.querySelectorAll('.doc-card').forEach((card) => {
      card.addEventListener('click', () => openDoc(card.dataset.id));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDoc(card.dataset.id);
        }
      });
    });
  }

  function clearAllFilters() {
    activeCategory = 'all';
    activeTags.clear();
    searchInput.value = '';
    searchQuery = '';
    searchClear.hidden = true;
    renderFilters();
    applyFilters();
  }

  /* ---------------- 打开文档 ---------------- */
  function openDoc(id) {
    const doc = manifest.documents.find((d) => d.id === id);
    if (!doc) return;
    location.hash = `#/doc/${id}`;
    window.DocViewer.open(doc);
  }

  // 监听 hash 变化，支持分享链接
  function handleHash() {
    const hash = location.hash;
    if (hash.startsWith('#/doc/')) {
      const id = hash.slice(6);
      const doc = manifest && manifest.documents.find((d) => d.id === id);
      if (doc) {
        window.DocViewer.open(doc);
      }
    }
  }

  window.addEventListener('hashchange', handleHash);

  /* ---------------- 搜索框 ---------------- */
  let searchTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchQuery = e.target.value;
    searchClear.hidden = !searchQuery;
    searchTimer = setTimeout(applyFilters, 150);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClear.hidden = true;
    searchInput.focus();
    applyFilters();
  });

  /* ---------------- 返回顶部 ---------------- */
  window.addEventListener('scroll', () => {
    backToTop.hidden = window.scrollY < 400;
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // 点击 logo 回到顶部并清除筛选
  document.getElementById('logo').addEventListener('click', () => {
    clearAllFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------------- 工具函数 ---------------- */
  function typeLabel(type) {
    return { markdown: 'MD', pdf: 'PDF', docx: 'DOC' }[type] || type;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }

  /* ---------------- 初始化 ---------------- */
  initTheme();
  loadManifest().then(() => {
    handleHash();
  });
})();
