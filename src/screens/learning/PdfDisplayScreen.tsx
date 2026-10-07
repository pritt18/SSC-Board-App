import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as ScreenCapture from 'expo-screen-capture';

import { COLORS } from '../../constants/colors';
import { LearningStackParamList } from '../../navigation/navigationTypes';

type Props = NativeStackScreenProps<LearningStackParamList, 'PdfDisplay'>;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFJS_LIB_ASSET = require('../../../assets/pdfjs/pdf.min.js.txt');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFJS_WORKER_ASSET = require('../../../assets/pdfjs/pdf.worker.min.js.txt');

// Upgraded versioned path to ensure cache refresh
const VIEWER_HTML_PATH = FileSystem.documentDirectory + 'pdf_book_viewer_v3.html';

const buildViewerHtml = (pdfJsSource: string, pdfWorkerSource: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.5, user-scalable=yes" />
  <style>
    * {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
      box-sizing: border-box;
    }
    @media print {
      body { display: none !important; }
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #1e293b;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: background-color 0.2s ease;
    }
    body.night-mode {
      background: #090d16;
    }
    #viewer-root {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      position: relative;
    }
    #top-bar {
      min-height: 48px;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 12px;
      color: #e2e8f0;
      font-size: 13px;
      font-weight: 600;
      border-bottom: 1px solid #334155;
      z-index: 50;
      gap: 6px;
      flex-wrap: wrap;
    }
    body.night-mode #top-bar {
      background: #030712;
      border-bottom-color: #1e293b;
    }
    .top-section-left {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 140px;
    }
    .top-section-right {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    #title-display {
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }
    #book-viewport {
      flex: 1;
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: auto;
      background: #334155;
      padding: 12px;
      transition: background-color 0.2s ease;
    }
    body.night-mode #book-viewport {
      background: #111827;
    }
    #page-card {
      position: relative;
      background: #ffffff;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease;
    }
    canvas {
      display: block;
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      transition: filter 0.25s ease;
    }
    body.night-mode #page-card canvas {
      filter: invert(90%) hue-rotate(180deg);
    }
    .side-nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 44px;
      height: 52px;
      background: rgba(15, 23, 42, 0.75);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      cursor: pointer;
      z-index: 40;
    }
    .side-nav-left { left: 8px; }
    .side-nav-right { right: 8px; }
    .side-nav-btn:disabled, .side-nav-btn.disabled {
      opacity: 0.2;
      pointer-events: none;
    }
    #bottom-bar {
      height: 54px;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 0 8px;
      border-top: 1px solid #334155;
      color: white;
      z-index: 50;
    }
    body.night-mode #bottom-bar {
      background: #030712;
      border-top-color: #1e293b;
    }
    .bar-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #ffffff;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .bar-btn-primary {
      background: #2563eb;
      border-color: #3b82f6;
    }
    .bar-btn-active {
      background: #f59e0b;
      border-color: #fbbf24;
      color: #000;
    }
    .bar-btn:active { opacity: 0.7; }
    .bar-btn:disabled {
      opacity: 0.3;
      pointer-events: none;
    }
    #page-counter {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #cbd5e1;
    }
    #page-input {
      width: 44px;
      height: 28px;
      background: #1e293b;
      border: 1px solid #475569;
      color: #ffffff;
      border-radius: 4px;
      text-align: center;
      font-size: 13px;
      font-weight: bold;
    }
    #status-overlay {
      color: #ffffff;
      font-size: 15px;
      text-align: center;
      padding: 30px;
    }
    .flip-next {
      animation: animFlipNext 0.22s ease-out;
    }
    .flip-prev {
      animation: animFlipPrev 0.22s ease-out;
    }
    @keyframes animFlipNext {
      0% { opacity: 0.4; transform: translateX(30px) scale(0.98); }
      100% { opacity: 1; transform: translateX(0) scale(1); }
    }
    @keyframes animFlipPrev {
      0% { opacity: 0.4; transform: translateX(-30px) scale(0.98); }
      100% { opacity: 1; transform: translateX(0) scale(1); }
    }
    #toast-notice {
      position: absolute;
      top: 56px;
      left: 50%;
      transform: translateX(-50%);
      background: #2563eb;
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      z-index: 90;
      display: none;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      animation: fadeInOut 2.5s ease forwards;
    }
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translate(-50%, -10px); }
      15% { opacity: 1; transform: translate(-50%, 0); }
      85% { opacity: 1; transform: translate(-50%, 0); }
      100% { opacity: 0; transform: translate(-50%, -10px); }
    }
    /* Modals for Search and Bookmarks */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      z-index: 100;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .modal-box {
      background: #1e293b;
      border-radius: 12px;
      width: 100%;
      max-width: 440px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #334155;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #334155;
      color: #ffffff;
      font-size: 15px;
      font-weight: 700;
    }
    .modal-close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 20px;
      cursor: pointer;
      padding: 4px;
    }
    .modal-body {
      padding: 14px 16px;
      overflow-y: auto;
      flex: 1;
    }
    .search-input-row {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .search-input {
      flex: 1;
      height: 38px;
      background: #0f172a;
      border: 1px solid #475569;
      color: #ffffff;
      border-radius: 6px;
      padding: 0 10px;
      font-size: 14px;
      outline: none;
    }
    .search-result-item {
      padding: 10px;
      background: #0f172a;
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      border: 1px solid #334155;
    }
    .search-result-item:hover {
      border-color: #3b82f6;
    }
    .search-result-page {
      font-weight: 700;
      color: #60a5fa;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .search-result-snippet {
      font-size: 12px;
      color: #cbd5e1;
      line-height: 1.4;
    }
    .bookmark-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: #0f172a;
      border-radius: 8px;
      margin-bottom: 8px;
      border: 1px solid #334155;
    }
    .bookmark-page-btn {
      color: #f1f5f9;
      font-weight: 600;
      cursor: pointer;
      background: transparent;
      border: none;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .bookmark-del-btn {
      color: #ef4444;
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 4px 8px;
    }
    .empty-modal-text {
      color: #94a3b8;
      font-size: 13px;
      text-align: center;
      padding: 24px 0;
    }
  </style>
</head>
<body oncontextmenu="return false">
  <div id="viewer-root">
    <div id="toast-notice"></div>

    <div id="top-bar">
      <div class="top-section-left">
        <span id="title-display">पुस्तकाचे पान (Reader)</span>
      </div>

      <div class="top-section-right">
        <!-- Search Button -->
        <button id="btn-search-open" class="bar-btn" title="Search Text in Book">🔍</button>
        <!-- Bookmark Toggle -->
        <button id="btn-bookmark-toggle" class="bar-btn" title="Bookmark This Page">🔖</button>
        <!-- Bookmarks List -->
        <button id="btn-bookmarks-list" class="bar-btn" title="View Bookmarks">📚</button>
        <!-- Night Mode -->
        <button id="btn-night-toggle" class="bar-btn" title="Toggle Night Mode">🌙</button>

        <!-- Zoom Controls -->
        <span id="zoom-controls" style="display:flex;align-items:center;gap:3px;margin-left:4px;">
          <button id="btn-zoom-out" class="bar-btn" style="padding:4px 7px;">−</button>
          <button id="btn-zoom-reset" class="bar-btn" style="padding:4px 6px;font-size:11px;">100%</button>
          <button id="btn-zoom-in" class="bar-btn" style="padding:4px 7px;">+</button>
        </span>
      </div>
    </div>

    <div id="book-viewport">
      <button id="side-prev" class="side-nav-btn side-nav-left">‹</button>
      <div id="page-card">
        <div id="status-overlay">पुस्तक लोड होत आहे...</div>
        <canvas id="pdf-canvas" style="display:none;"></canvas>
      </div>
      <button id="side-next" class="side-nav-btn side-nav-right">›</button>
    </div>

    <div id="bottom-bar">
      <button id="btn-first" class="bar-btn">⏮</button>
      <button id="btn-prev" class="bar-btn">‹ मागील</button>
      <div id="page-counter">
        <span>पान</span>
        <input id="page-input" type="number" min="1" value="1" />
        <span id="page-total">/ 0</span>
      </div>
      <button id="btn-next" class="bar-btn bar-btn-primary">पुढील ›</button>
      <button id="btn-last" class="bar-btn">⏭</button>
    </div>

    <!-- Search Modal -->
    <div id="search-modal" class="modal-overlay">
      <div class="modal-box">
        <div class="modal-header">
          <span>पुस्तकात शोधा (Search Book)</span>
          <button id="btn-search-close" class="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="search-input-row">
            <input id="search-input-field" class="search-input" placeholder="शब्द किंवा धडा शोधा..." />
            <button id="btn-do-search" class="bar-btn bar-btn-primary">शोधा</button>
          </div>
          <div id="search-status" style="font-size:12px;color:#94a3b8;margin-bottom:8px;min-height:16px;"></div>
          <div id="search-results-list"></div>
        </div>
      </div>
    </div>

    <!-- Bookmarks Modal -->
    <div id="bookmarks-modal" class="modal-overlay">
      <div class="modal-box">
        <div class="modal-header">
          <span>जतन केलेली पाने (Bookmarks)</span>
          <button id="btn-bookmarks-close" class="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div id="bookmarks-items-list"></div>
        </div>
      </div>
    </div>
  </div>

  <script>
  ${pdfJsSource}
  </script>

  <script>
    (function () {
      var workerSource = ${JSON.stringify(pdfWorkerSource)};
      var blob = new Blob([workerSource], { type: 'application/javascript' });
      pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
    })();

    var pdfDoc = null;
    var currentPage = 1;
    var totalPages = 0;
    var scale = 1.35;
    var isRendering = false;
    var activeRenderTask = null;
    var isNightMode = false;
    var bookmarks = [];
    var currentFileUri = '';

    var canvas = document.getElementById('pdf-canvas');
    var ctx = canvas.getContext('2d');
    var pageCard = document.getElementById('page-card');
    var statusEl = document.getElementById('status-overlay');
    var pageInput = document.getElementById('page-input');
    var pageTotal = document.getElementById('page-total');
    var toastNotice = document.getElementById('toast-notice');

    var btnPrev = document.getElementById('btn-prev');
    var btnNext = document.getElementById('btn-next');
    var sidePrev = document.getElementById('side-prev');
    var sideNext = document.getElementById('side-next');
    var btnFirst = document.getElementById('btn-first');
    var btnLast = document.getElementById('btn-last');

    var btnNightToggle = document.getElementById('btn-night-toggle');
    var btnBookmarkToggle = document.getElementById('btn-bookmark-toggle');
    var btnBookmarksList = document.getElementById('btn-bookmarks-list');
    var bookmarksModal = document.getElementById('bookmarks-modal');
    var btnBookmarksClose = document.getElementById('btn-bookmarks-close');
    var bookmarksItemsList = document.getElementById('bookmarks-items-list');

    var btnSearchOpen = document.getElementById('btn-search-open');
    var searchModal = document.getElementById('search-modal');
    var btnSearchClose = document.getElementById('btn-search-close');
    var searchInputField = document.getElementById('search-input-field');
    var btnDoSearch = document.getElementById('btn-do-search');
    var searchStatus = document.getElementById('search-status');
    var searchResultsList = document.getElementById('search-results-list');

    // Storage keys
    function getStorageKey(subKey) {
      var base = currentFileUri.replace(/[^a-zA-Z0-9]/g, '_').slice(-40);
      return 'ssc_pdf_' + base + '_' + subKey;
    }

    function showToast(msg) {
      toastNotice.textContent = msg;
      toastNotice.style.display = 'block';
      setTimeout(function() {
        toastNotice.style.display = 'none';
      }, 2500);
    }

    // Security protections
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; });
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u', 'c'].indexOf(e.key.toLowerCase()) !== -1) {
        e.preventDefault();
        return false;
      }
      if (e.key === 'PrintScreen') {
        try { if (navigator.clipboard) navigator.clipboard.writeText(''); } catch(err){}
      }
    });

    // Night Mode
    function initNightMode() {
      try {
        var savedNight = localStorage.getItem('ssc_pdf_night_mode');
        if (savedNight === 'true') {
          isNightMode = true;
          document.body.classList.add('night-mode');
          btnNightToggle.textContent = '☀️';
        }
      } catch(e){}
    }

    btnNightToggle.onclick = function() {
      isNightMode = !isNightMode;
      if (isNightMode) {
        document.body.classList.add('night-mode');
        btnNightToggle.textContent = '☀️';
      } else {
        document.body.classList.remove('night-mode');
        btnNightToggle.textContent = '🌙';
      }
      try {
        localStorage.setItem('ssc_pdf_night_mode', isNightMode ? 'true' : 'false');
      } catch(e){}
    };

    // Bookmarks logic
    function loadBookmarks() {
      try {
        var raw = localStorage.getItem(getStorageKey('bookmarks'));
        if (raw) bookmarks = JSON.parse(raw);
        else bookmarks = [];
      } catch(e) {
        bookmarks = [];
      }
      updateBookmarkIcon();
    }

    function saveBookmarks() {
      try {
        localStorage.setItem(getStorageKey('bookmarks'), JSON.stringify(bookmarks));
      } catch(e){}
      updateBookmarkIcon();
    }

    function updateBookmarkIcon() {
      var isCurrentSaved = bookmarks.indexOf(currentPage) !== -1;
      if (isCurrentSaved) {
        btnBookmarkToggle.classList.add('bar-btn-active');
        btnBookmarkToggle.textContent = '★';
      } else {
        btnBookmarkToggle.classList.remove('bar-btn-active');
        btnBookmarkToggle.textContent = '🔖';
      }
    }

    btnBookmarkToggle.onclick = function() {
      var idx = bookmarks.indexOf(currentPage);
      if (idx !== -1) {
        bookmarks.splice(idx, 1);
        showToast('पान ' + currentPage + ' बुकमार्क मधून काढले');
      } else {
        bookmarks.push(currentPage);
        bookmarks.sort(function(a, b) { return a - b; });
        showToast('पान ' + currentPage + ' बुकमार्क केले 🔖');
      }
      saveBookmarks();
    };

    function renderBookmarksModal() {
      bookmarksItemsList.innerHTML = '';
      if (bookmarks.length === 0) {
        bookmarksItemsList.innerHTML = '<div class="empty-modal-text">कोणतेही बुकमार्क जतन केलेले नाही.<br>(No bookmarks saved yet)</div>';
        return;
      }
      bookmarks.forEach(function(pg) {
        var row = document.createElement('div');
        row.className = 'bookmark-item';

        var pageBtn = document.createElement('button');
        pageBtn.className = 'bookmark-page-btn';
        pageBtn.textContent = '🔖 पान ' + pg;
        pageBtn.onclick = function() {
          bookmarksModal.style.display = 'none';
          goToPage(pg);
        };

        var delBtn = document.createElement('button');
        delBtn.className = 'bookmark-del-btn';
        delBtn.textContent = '✕';
        delBtn.onclick = function() {
          var i = bookmarks.indexOf(pg);
          if (i !== -1) {
            bookmarks.splice(i, 1);
            saveBookmarks();
            renderBookmarksModal();
          }
        };

        row.appendChild(pageBtn);
        row.appendChild(delBtn);
        bookmarksItemsList.appendChild(row);
      });
    }

    btnBookmarksList.onclick = function() {
      renderBookmarksModal();
      bookmarksModal.style.display = 'flex';
    };
    btnBookmarksClose.onclick = function() {
      bookmarksModal.style.display = 'none';
    };

    // Search logic
    btnSearchOpen.onclick = function() {
      searchModal.style.display = 'flex';
      setTimeout(function() { searchInputField.focus(); }, 100);
    };
    btnSearchClose.onclick = function() {
      searchModal.style.display = 'none';
    };

    btnDoSearch.onclick = async function() {
      var query = (searchInputField.value || '').trim();
      if (!query || !pdfDoc) return;

      searchStatus.textContent = 'पुस्तकात शोधत आहे...';
      searchResultsList.innerHTML = '';
      btnDoSearch.disabled = true;

      var results = [];
      var lowerQuery = query.toLowerCase();

      try {
        for (var i = 1; i <= totalPages; i++) {
          if (i % 3 === 0 || i === totalPages) {
            searchStatus.textContent = 'तपासत आहे: पान ' + i + ' / ' + totalPages + '...';
          }
          var page = await pdfDoc.getPage(i);
          var textContent = await page.getTextContent();
          var fullText = textContent.items.map(function(item) { return item.str; }).join(' ');

          var matchIndex = fullText.toLowerCase().indexOf(lowerQuery);
          if (matchIndex !== -1) {
            var start = Math.max(0, matchIndex - 35);
            var end = Math.min(fullText.length, matchIndex + query.length + 35);
            var snippet = fullText.substring(start, end).replace(/\\s+/g, ' ');
            results.push({ pageNumber: i, snippet: '...' + snippet + '...' });
          }
          page.cleanup();
        }

        searchStatus.textContent = results.length + ' परिणाम सापडले (Results found)';
        if (results.length === 0) {
          searchResultsList.innerHTML = '<div class="empty-modal-text">काहीही सापडले नाही.<br>(No matches found for "' + query + '")</div>';
        } else {
          results.forEach(function(r) {
            var item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = '<div class="search-result-page">📄 पान ' + r.pageNumber + '</div><div class="search-result-snippet">' + r.snippet + '</div>';
            item.onclick = function() {
              searchModal.style.display = 'none';
              goToPage(r.pageNumber);
            };
            searchResultsList.appendChild(item);
          });
        }
      } catch(err) {
        searchStatus.textContent = 'शोधताना अडचण आली: ' + (err.message || '');
      } finally {
        btnDoSearch.disabled = false;
      }
    };

    function updateNavState() {
      pageInput.value = currentPage;
      pageTotal.textContent = '/ ' + totalPages;
      document.getElementById('btn-zoom-reset').textContent = Math.round(scale * 100) + '%';

      var atStart = currentPage <= 1;
      var atEnd = currentPage >= totalPages;

      btnPrev.disabled = atStart;
      sidePrev.disabled = atStart;
      btnFirst.disabled = atStart;

      btnNext.disabled = atEnd;
      sideNext.disabled = atEnd;
      btnLast.disabled = atEnd;

      updateBookmarkIcon();

      // Remember last page
      try {
        localStorage.setItem(getStorageKey('last_page'), String(currentPage));
      } catch(e){}
    }

    async function renderPage(num, direction) {
      if (!pdfDoc || isRendering) return;
      isRendering = true;

      if (activeRenderTask) {
        try { activeRenderTask.cancel(); } catch(e){}
      }

      statusEl.style.display = 'block';
      statusEl.textContent = 'पान ' + num + ' लोड होत आहे...';
      canvas.style.display = 'none';

      try {
        var page = await pdfDoc.getPage(num);
        var dpr = window.devicePixelRatio || 1;
        var viewport = page.getViewport({ scale: scale });

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        var renderTask = page.render({ canvasContext: ctx, viewport: viewport });
        activeRenderTask = renderTask;
        await renderTask.promise;

        statusEl.style.display = 'none';
        canvas.style.display = 'block';

        if (direction === 'next') {
          pageCard.classList.remove('flip-prev', 'flip-next');
          void pageCard.offsetWidth;
          pageCard.classList.add('flip-next');
        } else if (direction === 'prev') {
          pageCard.classList.remove('flip-prev', 'flip-next');
          void pageCard.offsetWidth;
          pageCard.classList.add('flip-prev');
        }

        page.cleanup();
      } catch (err) {
        if (err && err.name !== 'RenderingCancelledException') {
          statusEl.textContent = 'पान लोड करण्यात अडचण आली: ' + (err.message || '');
          statusEl.style.display = 'block';
        }
      } finally {
        isRendering = false;
        activeRenderTask = null;
        updateNavState();
      }
    }

    function goToPage(target, dir) {
      if (!pdfDoc || totalPages === 0) return;
      var num = Math.max(1, Math.min(target, totalPages));
      if (num === currentPage && !dir) return;
      currentPage = num;
      renderPage(currentPage, dir);
    }

    function goPrev() { if (currentPage > 1) goToPage(currentPage - 1, 'prev'); }
    function goNext() { if (currentPage < totalPages) goToPage(currentPage + 1, 'next'); }

    btnPrev.onclick = goPrev;
    sidePrev.onclick = goPrev;
    btnNext.onclick = goNext;
    sideNext.onclick = goNext;
    btnFirst.onclick = function() { goToPage(1, 'prev'); };
    btnLast.onclick = function() { goToPage(totalPages, 'next'); };

    pageInput.onchange = function() {
      var n = parseInt(pageInput.value, 10);
      if (!isNaN(n)) goToPage(n);
    };

    document.getElementById('btn-zoom-in').onclick = function() {
      if (scale < 2.5) { scale += 0.2; renderPage(currentPage); }
    };
    document.getElementById('btn-zoom-out').onclick = function() {
      if (scale > 0.8) { scale -= 0.2; renderPage(currentPage); }
    };
    document.getElementById('btn-zoom-reset').onclick = function() {
      scale = 1.35;
      renderPage(currentPage);
    };

    // Touch Swipe Detection (Finger swipe to turn page like a real book)
    var touchStartX = 0;
    var touchStartY = 0;
    var viewportEl = document.getElementById('book-viewport');

    viewportEl.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    viewportEl.addEventListener('touchend', function(e) {
      if (e.changedTouches.length === 1) {
        var diffX = e.changedTouches[0].clientX - touchStartX;
        var diffY = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
          if (diffX < 0) { goNext(); } else { goPrev(); }
        }
      }
    }, { passive: true });

    async function initPdf(fileUri) {
      try {
        currentFileUri = fileUri || '';
        initNightMode();
        loadBookmarks();

        statusEl.textContent = 'पुस्तक उघडत आहे...';
        pdfDoc = await pdfjsLib.getDocument({ url: fileUri }).promise;
        totalPages = pdfDoc.numPages;

        // Restore last remembered page
        var startPage = 1;
        try {
          var saved = localStorage.getItem(getStorageKey('last_page'));
          if (saved) {
            var p = parseInt(saved, 10);
            if (!isNaN(p) && p >= 1 && p <= totalPages) {
              startPage = p;
              if (startPage > 1) {
                showToast('पुन्हा सुरू केले: पान ' + startPage + ' वरून');
              }
            }
          }
        } catch(e){}

        currentPage = startPage;
        updateNavState();
        renderPage(currentPage);
      } catch (err) {
        statusEl.textContent = 'पुस्तक उघडता आले नाही: ' + (err ? err.message : '');
      }
    }

    if (window.__PDF_FILE_URI__) {
      initPdf(window.__PDF_FILE_URI__);
    }
  </script>
</body>
</html>
`;

const PdfDisplayScreen: React.FC<Props> = ({ route, navigation }) => {
  const { pdfUrl, title } = route.params;
  const [viewerReady, setViewerReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const prepare = async () => {
      if (!pdfUrl) {
        setError('No PDF file was found for this item.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);

        const alreadyBuilt = await FileSystem.getInfoAsync(VIEWER_HTML_PATH);
        if (!alreadyBuilt.exists) {
          const [pdfJsAsset, pdfWorkerAsset] = await Asset.loadAsync([
            PDFJS_LIB_ASSET,
            PDFJS_WORKER_ASSET,
          ]);
          const pdfJsLocalUri = pdfJsAsset.localUri || pdfJsAsset.uri;
          const pdfWorkerLocalUri = pdfWorkerAsset.localUri || pdfWorkerAsset.uri;

          const [pdfJsSource, pdfWorkerSource] = await Promise.all([
            FileSystem.readAsStringAsync(pdfJsLocalUri),
            FileSystem.readAsStringAsync(pdfWorkerLocalUri),
          ]);

          await FileSystem.writeAsStringAsync(
            VIEWER_HTML_PATH,
            buildViewerHtml(pdfJsSource, pdfWorkerSource)
          );
        }

        setViewerReady(true);
      } catch (err) {
        console.error('Error preparing PDF viewer:', err);
        setError('Failed to prepare the PDF viewer. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    prepare();
  }, [pdfUrl]);

  const injectedJavaScriptBeforeContentLoaded = `
    window.__PDF_FILE_URI__ = ${JSON.stringify(pdfUrl)};
    true;
  `;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title || 'PDF Document'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.statusText}>Preparing Book Reader...</Text>
        </View>
      ) : error || !viewerReady ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>📄</Text>
          <Text style={styles.errorTitle}>Unable to Load PDF</Text>
          <Text style={styles.errorText}>{error || 'Something went wrong.'}</Text>
          <Pressable style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          originWhitelist={['*']}
          source={{ uri: VIEWER_HTML_PATH }}
          injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
          style={{ flex: 1, backgroundColor: '#1e293b' }}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          allowingReadAccessToURL={FileSystem.documentDirectory || undefined}
          setSupportMultipleWindows={false}
        />
      )}
    </SafeAreaView>
  );
};

export default PdfDisplayScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    backgroundColor: '#0F172A',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backText: { fontSize: 26, color: '#F8FAFC', marginTop: -3 },
  title: { fontSize: 16, fontWeight: '700', color: '#F8FAFC', flex: 1 },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#0F172A',
  },
  statusText: { marginTop: 14, color: '#94A3B8', fontSize: 14 },
  errorIcon: { fontSize: 50, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#F8FAFC', marginBottom: 8 },
  errorText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginBottom: 20, lineHeight: 19 },
  retryButton: { backgroundColor: '#2563EB', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10 },
  retryButtonText: { color: COLORS.white, fontWeight: '600' },
});
