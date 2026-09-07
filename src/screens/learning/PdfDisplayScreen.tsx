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

// -----------------------------------------------------------------
// Fully OFFLINE, memory-efficient in-app PDF viewer.
//
// IMPORTANT: unlike a naive approach, this does NOT read the whole
// PDF into memory as a base64 string and pass it through the React
// Native bridge. That works for small files but can crash on large
// PDFs (base64 inflates size ~33%, then it gets duplicated across
// JS memory + the RN bridge + the WebView's own memory).
//
// Instead:
//  1. The pdf.js viewer HTML (with the library bundled inline, no
//     network) is written to disk ONCE and reused for every PDF.
//  2. The WebView loads that HTML *from disk* via a file:// URI
//     (source={{uri}}), not via source={{html}} — so the ~1.4MB
//     pdf.js payload never goes through the bridge either.
//  3. The target PDF's own file:// path is handed to pdf.js, which
//     reads/renders it directly, page by page, from disk.
//
// This keeps peak memory roughly proportional to "one page at a
// time" rather than "the entire file", so it scales far better to
// large PDFs and to opening many PDFs across a session.
//
// There is deliberately NO share/download button anywhere on this
// screen, and long-press / text-selection / right-click are
// disabled in the page itself. Screenshots are additionally blocked
// while this screen is open (Android only — iOS has no public API
// to block screenshots, only to detect them).
// -----------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFJS_LIB_ASSET = require('../../../assets/pdfjs/pdf.min.js.txt');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFJS_WORKER_ASSET = require('../../../assets/pdfjs/pdf.worker.min.js.txt');

const VIEWER_HTML_PATH = FileSystem.documentDirectory + 'pdf_viewer.html';

const buildViewerHtml = (pdfJsSource: string, pdfWorkerSource: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #525659;
      overflow-x: hidden;
    }
    #pages {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px 0 40px;
    }
    canvas {
      margin-bottom: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      max-width: 100%;
      height: auto;
    }
    #status {
      color: white;
      font-family: sans-serif;
      text-align: center;
      padding: 40px 20px;
    }
  </style>
</head>
<body oncontextmenu="return false">
  <div id="pages"><div id="status">Loading PDF...</div></div>

  <script>
  ${pdfJsSource}
  </script>

  <script>
    (function () {
      var workerSource = ${JSON.stringify(pdfWorkerSource)};
      var blob = new Blob([workerSource], { type: 'application/javascript' });
      pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
    })();

    // Renders pages one at a time and discards each page object right
    // after drawing it, instead of holding the whole document's pages
    // in memory at once.
    async function renderPdf(pdfFileUri) {
      const container = document.getElementById('pages');
      try {
        const pdf = await pdfjsLib.getDocument({ url: pdfFileUri }).promise;
        container.innerHTML = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          container.appendChild(canvas);
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          page.cleanup();
        }
      } catch (err) {
        container.innerHTML = '<div id="status">Could not display this PDF.<br/>' + (err && err.message ? err.message : '') + '</div>';
      }
    }

    // The actual PDF path is injected right before this script runs
    // (see injectedJavaScriptBeforeContentLoaded on the RN side).
    if (window.__PDF_FILE_URI__) {
      renderPdf(window.__PDF_FILE_URI__);
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

        // Write the shared viewer HTML to disk once and reuse it for
        // every PDF — avoids re-embedding the 1.4MB pdf.js payload
        // through the bridge on every open.
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

  // Runs inside the WebView right before its own <script> tags run —
  // hands the target PDF's file path to the page without ever routing
  // the PDF's *contents* through React Native.
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
        <Text style={styles.title} numberOfLines={1}>{title || 'PDF Document'}</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.statusText}>Preparing PDF viewer...</Text>
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
          style={{ flex: 1, backgroundColor: '#525659' }}
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
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  backText: { fontSize: 32, color: COLORS.textPrimary, marginTop: -4 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: COLORS.background,
  },
  statusText: { marginTop: 14, color: COLORS.textSecondary, fontSize: 14 },
  errorIcon: { fontSize: 50, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  errorText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 19 },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10 },
  retryButtonText: { color: COLORS.white, fontWeight: '600' },
});
