import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as ScreenCapture from 'expo-screen-capture';

import { COLORS } from '../../constants/colors';
import { LearningStackParamList } from '../../navigation/navigationTypes';

type Props = NativeStackScreenProps<LearningStackParamList, 'PdfDisplay'>;

// -----------------------------------------------------------------
// Renders the PDF entirely inside the app using PDF.js (loaded from
// a CDN, since Expo Go can't bundle the pdf.js worker as a local
// asset without a custom dev client). The PDF's own bytes never
// leave the device — only the pdf.js *library* needs a network
// fetch, so this needs internet the first time it's opened.
//
// There is deliberately NO share/download button anywhere on this
// screen, and long-press / text-selection / right-click are
// disabled in the page itself, so there's no built-in way to export
// the file from here. Screenshots are additionally blocked while
// this screen is open (Android only — iOS has no public API to
// block screenshots, only to detect them).
// -----------------------------------------------------------------

const buildViewerHtml = (base64: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
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
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    function base64ToUint8Array(base64) {
      const raw = atob(base64);
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      return arr;
    }

    async function renderPdf() {
      const container = document.getElementById('pages');
      try {
        const data = base64ToUint8Array("${base64}");
        const pdf = await pdfjsLib.getDocument({ data }).promise;
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
        }
      } catch (err) {
        container.innerHTML = '<div id="status">Could not display this PDF.</div>';
      }
    }
    renderPdf();
  </script>
</body>
</html>
`;

const PdfDisplayScreen: React.FC<Props> = ({ route, navigation }) => {
  const { pdfUrl, title } = route.params;
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Block screenshots/screen recording while a PDF is open (Android).
    ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!pdfUrl) {
        setError('No PDF file was found for this item.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const base64 = await FileSystem.readAsStringAsync(pdfUrl, {
          encoding: 'base64' as any,
        });
        setHtml(buildViewerHtml(base64));
      } catch (err) {
        console.error('Error reading PDF:', err);
        setError('Failed to load this PDF. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pdfUrl]);

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
          <Text style={styles.statusText}>Loading PDF...</Text>
        </View>
      ) : error || !html ? (
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
          source={{ html }}
          style={{ flex: 1, backgroundColor: '#525659' }}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
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
