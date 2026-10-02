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
const VIEWER_HTML_PATH = FileSystem.documentDirectory + 'pdf_book_viewer_v2.html';

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
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #1e293b;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #viewer-root {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }
    #top-bar {
      height: 44px;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      color: #e2e8f0;
      font-size: 13px;
      font-weight: 600;
      border-bottom: 1px solid #334155;
      z-index: 50;
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
      height: 56px;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 0 8px;
      border-top: 1px solid #334155;
      color: white;
      z-index: 50;
    }
    .bar-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #ffffff;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .bar-btn-primary {
      background: #2563eb;
      border-color: #3b82f6;
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
  </style>
</head>
<body oncontextmenu="return false">
  <div id="viewer-root">
    <div id="top-bar">
      <span id="title-display">पुस्तकाचे पान (Book Reader)</span>
      <span id="zoom-controls">
        <button id="btn-zoom-out" class="bar-btn" style="padding:4px 8px;">−</button>
        <span id="zoom-val" style="padding:0 6px;">100%</span>
        <button id="btn-zoom-in" class="bar-btn" style="padding:4px 8px;">+</button>
      </span>
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

    var canvas = document.getElementById('pdf-canvas');
    var ctx = canvas.getContext('2d');
    var pageCard = document.getElementById('page-card');
    var statusEl = document.getElementById('status-overlay');
    var pageInput = document.getElementById('page-input');
    var pageTotal = document.getElementById('page-total');
    var zoomVal = document.getElementById('zoom-val');

    var btnPrev = document.getElementById('btn-prev');
    var btnNext = document.getElementById('btn-next');
    var sidePrev = document.getElementById('side-prev');
    var sideNext = document.getElementById('side-next');
    var btnFirst = document.getElementById('btn-first');
    var btnLast = document.getElementById('btn-last');

    function updateNavState() {
      pageInput.value = currentPage;
      pageTotal.textContent = '/ ' + totalPages;
      zoomVal.textContent = Math.round(scale * 100) + '%';

      var atStart = currentPage <= 1;
      var atEnd = currentPage >= totalPages;

      btnPrev.disabled = atStart;
      sidePrev.disabled = atStart;
      btnFirst.disabled = atStart;

      btnNext.disabled = atEnd;
      sideNext.disabled = atEnd;
      btnLast.disabled = atEnd;
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
        statusEl.textContent = 'पुस्तक उघडत आहे...';
        pdfDoc = await pdfjsLib.getDocument({ url: fileUri }).promise;
        totalPages = pdfDoc.numPages;
        currentPage = 1;
        updateNavState();
        renderPage(1);
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
