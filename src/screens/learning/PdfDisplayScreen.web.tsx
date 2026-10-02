import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';
import { LearningStackParamList } from '../../navigation/navigationTypes';
import { resolveFileUri } from '../../utils/fileStorage';

type Props = NativeStackScreenProps<LearningStackParamList, 'PdfDisplay'>;

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

const ensurePdfJsLoaded = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window not available'));
      return;
    }

    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = '/pdfjs/pdf.min.js';
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        loadCdnFallback().then(resolve).catch(reject);
      }
    };
    script.onerror = () => {
      loadCdnFallback().then(resolve).catch(reject);
    };
    document.head.appendChild(script);
  });
};

const loadCdnFallback = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const cdnScript = document.createElement('script');
    cdnScript.src =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    cdnScript.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('Failed to load PDF.js library'));
      }
    };
    cdnScript.onerror = () =>
      reject(new Error('Failed to load PDF.js from CDN'));
    document.head.appendChild(cdnScript);
  });
};

const PdfDisplayScreen: React.FC<Props> = ({ route, navigation }) => {
  const { pdfUrl, title } = route.params;
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Initializing PDF viewer...');
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [renderedCount, setRenderedCount] = useState(0);
  const [scale, setScale] = useState(1.4);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderingRef = useRef(false);

  const getTargetUrl = async (rawUrl: string): Promise<string> => {
    if (!rawUrl) throw new Error('PDF URL is missing.');
    if (rawUrl.startsWith('idb://')) {
      return await resolveFileUri(rawUrl);
    }
    if (
      rawUrl.startsWith('blob:') ||
      rawUrl.startsWith('http://') ||
      rawUrl.startsWith('https://')
    ) {
      return rawUrl;
    }
    return `/api/pdf-content?file=${encodeURIComponent(rawUrl)}`;
  };

  const renderPages = async (doc: any, currentScale: number) => {
    if (!containerRef.current || renderingRef.current) return;
    renderingRef.current = true;
    const container = containerRef.current;
    container.innerHTML = '';

    try {
      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: currentScale });

        const pageCard = document.createElement('div');
        pageCard.style.marginBottom = '20px';
        pageCard.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
        pageCard.style.borderRadius = '4px';
        pageCard.style.backgroundColor = '#ffffff';
        pageCard.style.overflow = 'hidden';
        pageCard.style.display = 'flex';
        pageCard.style.justifyContent = 'center';

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';
        canvas.style.display = 'block';

        pageCard.appendChild(canvas);
        container.appendChild(pageCard);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
        page.cleanup();
        setRenderedCount(pageNum);
      }
    } catch (err: any) {
      console.error('Error rendering page:', err);
    } finally {
      renderingRef.current = false;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadAndRenderPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        setStatusMessage('Loading PDF engine...');

        const pdfjs = await ensurePdfJsLoaded();
        if (cancelled) return;

        setStatusMessage('Fetching PDF document...');
        const targetUrl = await getTargetUrl(pdfUrl);
        if (cancelled) return;

        setStatusMessage('Parsing pages...');
        const loadingTask = pdfjs.getDocument({
          url: targetUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (cancelled) return;

        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        setLoading(false);

        // Render pages on canvas
        setTimeout(() => {
          if (!cancelled && doc) {
            renderPages(doc, scale);
          }
        }, 100);
      } catch (err: any) {
        console.error('PDF load error:', err);
        if (!cancelled) {
          setError(err?.message || 'Could not load the PDF document.');
          setLoading(false);
        }
      }
    };

    loadAndRenderPdf();

    return () => {
      cancelled = true;
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [pdfUrl]);

  // Handle zoom changes
  const handleZoom = (newScale: number) => {
    if (pdfDocRef.current && !renderingRef.current) {
      setScale(newScale);
      renderPages(pdfDocRef.current, newScale);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Title & Zoom Controls */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title || 'PDF Document'}
        </Text>

        {/* Toolbar: Zoom Controls & Page Counter */}
        {!loading && !error && totalPages > 0 && (
          <View style={styles.toolbar}>
            <Text style={styles.pageCountBadge}>
              {renderedCount}/{totalPages}
            </Text>
            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => handleZoom(Math.max(scale - 0.25, 0.75))}
            >
              <Ionicons name="remove" size={18} color="#334155" />
            </TouchableOpacity>
            <Text style={styles.scaleText}>{Math.round(scale * 100)}%</Text>
            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => handleZoom(Math.min(scale + 0.25, 2.5))}
            >
              <Ionicons name="add" size={18} color="#334155" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>📄</Text>
          <Text style={styles.errorTitle}>Unable to Load PDF</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
        >
          {/* @ts-ignore */}
          <div
            ref={(el: any) => {
              containerRef.current = el;
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              maxWidth: '900px',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default PdfDisplayScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: COLORS.white,
    zIndex: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scaleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    minWidth: 38,
    textAlign: 'center',
  },
  pageCountBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 4,
  },
  scrollArea: {
    flex: 1,
    width: '100%',
    backgroundColor: '#525659',
  },
  scrollContent: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#F8FAFC',
  },
  statusText: {
    marginTop: 14,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  errorIcon: {
    fontSize: 50,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 19,
    maxWidth: 360,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});
