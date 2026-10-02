import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
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
  const [statusMessage, setStatusMessage] = useState('Initializing book reader...');
  const [error, setError] = useState<string | null>(null);
  
  // Book Reading states (1-by-1 manual page flip)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageInput, setPageInput] = useState('1');
  const [scale, setScale] = useState(1.3);
  const [pageRendering, setPageRendering] = useState(false);
  const [turnDirection, setTurnDirection] = useState<'next' | 'prev' | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const activeRenderTaskRef = useRef<any>(null);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  const getTargetUrl = async (rawUrl: string): Promise<string> => {
    if (!rawUrl) throw new Error('PDF URL is missing.');
    if (rawUrl.startsWith('idb://')) {
      return await resolveFileUri(rawUrl);
    }
    // Check if it's a Google Drive link or ID
    const driveMatch = rawUrl.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=)|id=)([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      return `/api/drive-pdf?id=${driveMatch[1]}`;
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

  // Render a single page onto the canvas (book view)
  const renderSinglePage = useCallback(
    async (doc: any, pageNum: number, currentScale: number) => {
      if (!containerRef.current || !doc) return;

      // Cancel previous render if still in progress
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch (e) {
          // ignore cancel error
        }
        activeRenderTaskRef.current = null;
      }

      setPageRendering(true);
      const container = containerRef.current;
      container.innerHTML = '';

      try {
        const page = await doc.getPage(pageNum);
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: currentScale });

        // Outer book card for physical page feel
        const pageCard = document.createElement('div');
        pageCard.style.position = 'relative';
        pageCard.style.backgroundColor = '#ffffff';
        pageCard.style.boxShadow =
          '0 12px 36px rgba(0,0,0,0.38), 0 2px 8px rgba(0,0,0,0.18)';
        pageCard.style.borderRadius = '6px';
        pageCard.style.overflow = 'hidden';
        pageCard.style.display = 'flex';
        pageCard.style.justifyContent = 'center';
        pageCard.style.alignItems = 'center';
        pageCard.style.transition = 'transform 0.22s ease-out, opacity 0.22s ease-out';
        pageCard.style.userSelect = 'none';

        // Add subtle page flip animation
        if (turnDirection === 'next') {
          pageCard.style.animation = 'flipPageNext 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
        } else if (turnDirection === 'prev') {
          pageCard.style.animation = 'flipPagePrev 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.style.maxWidth = '100%';
        canvas.style.display = 'block';

        pageCard.appendChild(canvas);
        container.appendChild(pageCard);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
          const renderTask = page.render({
            canvasContext: ctx,
            viewport,
          });
          activeRenderTaskRef.current = renderTask;
          await renderTask.promise;
        }

        page.cleanup();
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
        }
      } finally {
        setPageRendering(false);
        activeRenderTaskRef.current = null;
      }
    },
    [turnDirection]
  );

  // Load document initially
  useEffect(() => {
    let cancelled = false;

    const loadDoc = async () => {
      try {
        setLoading(true);
        setError(null);
        setStatusMessage('Loading PDF engine...');

        const pdfjs = await ensurePdfJsLoaded();
        if (cancelled) return;

        setStatusMessage('Opening book...');
        const targetUrl = await getTargetUrl(pdfUrl);
        if (cancelled) return;

        setStatusMessage('Reading pages...');
        const loadingTask = pdfjs.getDocument({
          url: targetUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (cancelled) return;

        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        setCurrentPage(1);
        setPageInput('1');
        setLoading(false);

        setTimeout(() => {
          if (!cancelled && doc) {
            renderSinglePage(doc, 1, scale);
          }
        }, 80);
      } catch (err: any) {
        console.error('PDF load error:', err);
        if (!cancelled) {
          setError(err?.message || 'Could not load the textbook.');
          setLoading(false);
        }
      }
    };

    loadDoc();

    return () => {
      cancelled = true;
      if (activeRenderTaskRef.current) {
        try { activeRenderTaskRef.current.cancel(); } catch (e) {}
      }
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [pdfUrl]);

  // Navigate to specific page (1 by 1)
  const goToPage = useCallback(
    (targetPage: number, dir?: 'next' | 'prev') => {
      if (!pdfDocRef.current || totalPages === 0) return;
      const validPage = Math.max(1, Math.min(targetPage, totalPages));
      if (validPage === currentPage && !dir) return;

      setTurnDirection(dir || (validPage > currentPage ? 'next' : 'prev'));
      setCurrentPage(validPage);
      setPageInput(String(validPage));

      if (pdfDocRef.current) {
        renderSinglePage(pdfDocRef.current, validPage, scale);
      }
    },
    [currentPage, totalPages, scale, renderSinglePage]
  );

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1, 'next');
    }
  }, [currentPage, totalPages, goToPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1, 'prev');
    }
  }, [currentPage, goToPage]);

  // Handle zoom changes
  const handleZoom = (newScale: number) => {
    const clampedScale = Math.max(0.7, Math.min(newScale, 2.8));
    setScale(clampedScale);
    if (pdfDocRef.current && !pageRendering) {
      renderSinglePage(pdfDocRef.current, currentPage, clampedScale);
    }
  };

  // Keyboard navigation: Left/Right Arrow keys turn pages
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevPage();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToPage(totalPages);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPage, prevPage, goToPage, totalPages]);

  // Handle page jump submission from input
  const handlePageInputSubmit = () => {
    const pageNum = parseInt(pageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      goToPage(pageNum);
    } else {
      setPageInput(String(currentPage));
    }
  };

  // Touch Swipe for turning pages on touchscreen / mobile web
  // Touch Swipe for turning pages on touchscreen / mobile web
  const handleTouchStart = (e: any) => {
    const touch = e.touches ? e.touches[0] : (e.nativeEvent ? e.nativeEvent.touches && e.nativeEvent.touches[0] : null);
    if (touch) {
      touchStartXRef.current = touch.clientX || touch.pageX || 0;
      touchStartYRef.current = touch.clientY || touch.pageY || 0;
    }
  };

  const handleTouchEnd = (e: any) => {
    const touch = e.changedTouches ? e.changedTouches[0] : (e.nativeEvent ? e.nativeEvent.changedTouches && e.nativeEvent.changedTouches[0] : null);
    if (touch) {
      const clientX = touch.clientX || touch.pageX || 0;
      const clientY = touch.clientY || touch.pageY || 0;
      const diffX = clientX - touchStartXRef.current;
      const diffY = clientY - touchStartYRef.current;
      // Detect horizontal swipe (at least 45px, more horizontal than vertical)
      if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
        if (diffX < 0) {
          nextPage(); // Swiped left -> Next page
        } else {
          prevPage(); // Swiped right -> Previous page
        }
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title || 'पुस्तकाचे पान (Book Reader)'}
          </Text>
          {!loading && !error && totalPages > 0 && (
            <Text style={styles.subtitle}>
              पान {currentPage} / {totalPages}
            </Text>
          )}
        </View>

        {/* Zoom Controls */}
        {!loading && !error && totalPages > 0 && (
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => handleZoom(scale - 0.2)}
              accessibilityLabel="Zoom Out"
            >
              <Ionicons name="remove" size={18} color="#334155" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.scaleBadge}
              onPress={() => handleZoom(1.3)}
              accessibilityLabel="Reset Zoom"
            >
              <Text style={styles.scaleText}>{Math.round(scale * 100)}%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => handleZoom(scale + 0.2)}
              accessibilityLabel="Zoom In"
            >
              <Ionicons name="add" size={18} color="#334155" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main Reader View */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>📖</Text>
          <Text style={styles.errorTitle}>पुस्तक उघडता आले नाही</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>मागे जा (Go Back)</Text>
          </Pressable>
        </View>
      ) : (
        <View
          style={styles.bookStage}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Floating Left Page Turn Button */}
          <TouchableOpacity
            style={[
              styles.floatingNavButton,
              styles.floatingNavLeft,
              currentPage <= 1 && styles.navButtonDisabled,
            ]}
            onPress={prevPage}
            disabled={currentPage <= 1}
            accessibilityLabel="मागील पान (Previous Page)"
          >
            <Ionicons name="chevron-back" size={28} color="#ffffff" />
          </TouchableOpacity>

          {/* Book Page Canvas Container */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
              overflow: 'auto',
              padding: '16px',
              boxSizing: 'border-box',
            }}
          >
            {/* @ts-ignore */}
            <div
              ref={(el: any) => {
                containerRef.current = el;
              }}
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            />
          </div>

          {/* Floating Right Page Turn Button */}
          <TouchableOpacity
            style={[
              styles.floatingNavButton,
              styles.floatingNavRight,
              currentPage >= totalPages && styles.navButtonDisabled,
            ]}
            onPress={nextPage}
            disabled={currentPage >= totalPages}
            accessibilityLabel="पुढील पान (Next Page)"
          >
            <Ionicons name="chevron-forward" size={28} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Manual Book Navigation Bar (1 by 1 Page Controls) */}
      {!loading && !error && totalPages > 0 && (
        <View style={styles.bottomBar}>
          {/* First Page */}
          <TouchableOpacity
            style={[styles.bottomBtn, currentPage <= 1 && styles.bottomBtnDisabled]}
            onPress={() => goToPage(1)}
            disabled={currentPage <= 1}
            accessibilityLabel="पहिल्या पानावर जा"
          >
            <Ionicons name="play-back" size={18} color={currentPage <= 1 ? '#64748B' : '#FFFFFF'} />
          </TouchableOpacity>

          {/* Previous Page */}
          <TouchableOpacity
            style={[styles.pageTurnBtn, currentPage <= 1 && styles.bottomBtnDisabled]}
            onPress={prevPage}
            disabled={currentPage <= 1}
          >
            <Ionicons name="arrow-back" size={16} color={currentPage <= 1 ? '#64748B' : '#FFFFFF'} />
            <Text style={[styles.pageTurnBtnText, currentPage <= 1 && styles.pageTurnBtnTextDisabled]}>
              मागील पान
            </Text>
          </TouchableOpacity>

          {/* Current Page / Total Jump Selector */}
          <View style={styles.pageJumpBox}>
            <Text style={styles.pageJumpLabel}>पान</Text>
            <TextInput
              style={styles.pageJumpInput}
              value={pageInput}
              onChangeText={setPageInput}
              onSubmitEditing={handlePageInputSubmit}
              keyboardType="number-pad"
              returnKeyType="go"
              selectTextOnFocus
            />
            <Text style={styles.pageJumpTotal}>/ {totalPages}</Text>
          </View>

          {/* Next Page */}
          <TouchableOpacity
            style={[styles.pageTurnBtn, styles.pageTurnBtnPrimary, currentPage >= totalPages && styles.bottomBtnDisabled]}
            onPress={nextPage}
            disabled={currentPage >= totalPages}
          >
            <Text style={[styles.pageTurnBtnText, currentPage >= totalPages && styles.pageTurnBtnTextDisabled]}>
              पुढील पान
            </Text>
            <Ionicons name="arrow-forward" size={16} color={currentPage >= totalPages ? '#64748B' : '#FFFFFF'} />
          </TouchableOpacity>

          {/* Last Page */}
          <TouchableOpacity
            style={[styles.bottomBtn, currentPage >= totalPages && styles.bottomBtnDisabled]}
            onPress={() => goToPage(totalPages)}
            disabled={currentPage >= totalPages}
            accessibilityLabel="शेवटच्या पानावर जा"
          >
            <Ionicons name="play-forward" size={18} color={currentPage >= totalPages ? '#64748B' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>
      )}

      {/* Global CSS for book page turn flip effect */}
      {/* @ts-ignore */}
      <style>{`
        @keyframes flipPageNext {
          0% {
            opacity: 0.35;
            transform: translateX(36px) scale(0.97);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes flipPagePrev {
          0% {
            opacity: 0.35;
            transform: translateX(-36px) scale(0.97);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
    </SafeAreaView>
  );
};

export default PdfDisplayScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    backgroundColor: '#0F172A',
    zIndex: 10,
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
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toolButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  scaleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  scaleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    minWidth: 36,
    textAlign: 'center',
  },
  bookStage: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#334155',
    overflow: 'hidden',
  },
  floatingNavButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -28,
    width: 48,
    height: 56,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  floatingNavLeft: {
    left: 12,
  },
  floatingNavRight: {
    right: 12,
  },
  navButtonDisabled: {
    opacity: 0.2,
    pointerEvents: 'none',
  },
  bottomBar: {
    height: 58,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 8,
    zIndex: 30,
  },
  bottomBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  bottomBtnDisabled: {
    opacity: 0.35,
  },
  pageTurnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  pageTurnBtnPrimary: {
    backgroundColor: '#2563EB',
    borderColor: '#3B82F6',
  },
  pageTurnBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pageTurnBtnTextDisabled: {
    color: '#64748B',
  },
  pageJumpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  pageJumpLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  pageJumpInput: {
    width: 44,
    height: 28,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 4,
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    padding: 0,
  },
  pageJumpTotal: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#0F172A',
  },
  statusText: {
    marginTop: 14,
    color: '#94A3B8',
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
    color: '#F8FAFC',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 19,
    maxWidth: 360,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
