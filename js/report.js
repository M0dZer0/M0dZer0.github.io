(function(window, document) {
  'use strict';

  var app = document.getElementById('report-app');
  if (!app) {
    return;
  }

  var list = document.getElementById('report-list');
  var sidebarEmpty = document.getElementById('report-sidebar-empty');
  var frame = document.getElementById('report-frame');
  var frameWrap = document.getElementById('report-frame-wrap');
  var loading = document.getElementById('report-loading');
  var loadingText = document.getElementById('report-loading-text');
  var empty = document.getElementById('report-empty');
  var emptyTitle = document.getElementById('report-empty-title');
  var emptyText = document.getElementById('report-empty-text');
  var currentTitle = document.getElementById('report-current-title');
  var download = document.getElementById('report-download');
  var share = document.getElementById('report-share');
  var viewer = document.querySelector('.report-viewer');
  var reports = [];
  var selectedReport = null;
  var toastTimer = null;

  function absoluteUrl(pathname) {
    return new URL(pathname, window.location.href).href;
  }

  function formatDate(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '上传时间未知';
    }
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function showToast(message, isError) {
    var toast = document.getElementById('report-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'report-toast';
      toast.className = 'report-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.toggle('is-error', Boolean(isError));
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function() {
      toast.classList.remove('is-visible');
    }, 2800);
  }

  function setEmptyState(title, message) {
    emptyTitle.textContent = title;
    emptyText.textContent = message;
    empty.hidden = false;
    frame.hidden = true;
    loading.hidden = true;
    viewer.setAttribute('aria-busy', 'false');
  }

  function clearEmptyState() {
    empty.hidden = true;
    frame.hidden = false;
  }

  function renderList() {
    list.textContent = '';
    sidebarEmpty.hidden = reports.length > 0;

    reports.forEach(function(report) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'report-item';
      item.setAttribute('role', 'listitem');
      item.setAttribute('aria-label', report.title + '，上传于 ' + formatDate(report.uploadedAt));
      item.dataset.slug = report.slug;

      var itemTitle = document.createElement('span');
      itemTitle.className = 'report-item-title';
      itemTitle.textContent = report.title;

      var itemDate = document.createElement('span');
      itemDate.className = 'report-item-date';
      itemDate.textContent = formatDate(report.uploadedAt);

      item.appendChild(itemTitle);
      item.appendChild(itemDate);
      item.addEventListener('click', function() {
        selectReport(report);
      });
      list.appendChild(item);
    });
  }

  function updateActiveItem() {
    Array.prototype.forEach.call(list.querySelectorAll('.report-item'), function(item) {
      var active = selectedReport && item.dataset.slug === selectedReport.slug;
      item.classList.toggle('is-active', active);
      if (active) {
        item.setAttribute('aria-current', 'true');
      } else {
        item.removeAttribute('aria-current');
      }
    });
  }

  function selectReport(report) {
    if (!report) {
      setEmptyState('暂无可展示的报告', '将 HTML 文件放入 source/reports/ 后重新生成博客即可。');
      currentTitle.textContent = '暂无报告';
      download.classList.add('is-disabled');
      download.setAttribute('aria-disabled', 'true');
      download.setAttribute('tabindex', '-1');
      share.disabled = true;
      share.classList.add('is-disabled');
      return;
    }

    selectedReport = report;
    updateActiveItem();
    clearEmptyState();
    loading.hidden = false;
    loadingText.textContent = '正在载入…';
    viewer.setAttribute('aria-busy', 'true');
    currentTitle.textContent = report.title;
    document.title = report.title + ' - ' + (app.dataset.siteTitle || document.title);

    download.href = absoluteUrl(report.fileUrl);
    download.download = report.filename;
    download.classList.remove('is-disabled');
    download.removeAttribute('aria-disabled');
    download.removeAttribute('tabindex');
    share.disabled = false;
    share.classList.remove('is-disabled');
    frame.title = report.title;
    frame.src = absoluteUrl(report.fileUrl);
  }

  function fallbackCopy(value) {
    var textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    var copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    }
    document.body.removeChild(textarea);
    return copied;
  }

  function copyShareLink() {
    if (!selectedReport) {
      return;
    }
    var link = absoluteUrl(selectedReport.sharePath);
    var copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link).then(function() {
        showToast('独立报告链接已复制');
      }).catch(function() {
        if (fallbackCopy(link)) {
          showToast('独立报告链接已复制');
        } else {
          showToast('复制失败，请手动复制地址栏链接', true);
        }
      });
      return;
    }
    copied = fallbackCopy(link);
    showToast(copied ? '独立报告链接已复制' : '复制失败，请手动复制地址栏链接', !copied);
  }

  frame.addEventListener('load', function() {
    loading.hidden = true;
    viewer.setAttribute('aria-busy', 'false');
  });

  share.addEventListener('click', copyShareLink);

  fetch(app.dataset.manifestUrl, { cache: 'no-store' })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('manifest request failed');
      }
      return response.json();
    })
    .then(function(manifest) {
      reports = Array.isArray(manifest.reports) ? manifest.reports : [];
      renderList();
      if (reports.length === 0) {
        setEmptyState('还没有报告', '将 HTML 文件放入 source/reports/ 后重新生成博客即可。');
        currentTitle.textContent = '暂无报告';
        return;
      }
      var requestedSlug = app.dataset.reportSlug;
      var initial = reports.find(function(report) {
        return report.slug === requestedSlug;
      });
      selectReport(initial || reports[0]);
    })
    .catch(function() {
      list.textContent = '';
      sidebarEmpty.hidden = false;
      setEmptyState('报告清单载入失败', '请确认站点已完成构建，并且 source/reports/ 中存在报告文件。');
      currentTitle.textContent = '报告清单不可用';
    });
})(window, document);
