import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS } from '../../constants/colors';
import { LearningStackParamList } from '../../navigation/navigationTypes';
import { resolveFileUri } from '../../utils/fileStorage';
import { executeQuery } from '../../database/database';
import { useAuth } from '../../context/AuthContext';

type Props = NativeStackScreenProps<LearningStackParamList, 'PdfDisplay'>;

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

interface SearchResult {
  pageNumber: number;
  snippet: string;
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
  const { pdfUrl, title, pdfId } = (route.params as any) || {};
  const { user } = useAuth();

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

  // New Features: Night Mode, Bookmarks, Search, Resume Notice
  const [nightMode, setNightMode] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);

  // Search feature states
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchProgress, setSearchProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const activeRenderTaskRef = useRef<any>(null);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  // -----------------------------------------------------------
  // SECURITY RESTRICTIONS:
  // Anti-download, Anti-save, Anti-screenshot, Anti-print on Web
  // -----------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Prevent context menu (Right-click Save As / Inspect)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Block keyboard shortcuts (Ctrl+S, Ctrl+P, Ctrl+U, PrintScreen, Ctrl+C)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 's' || e.key === 'p' || e.key === 'u' || e.key === 'c')
      ) {
        e.preventDefault();
        return false;
      }
      if (e.key === 'PrintScreen') {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('');
          }
        } catch (err) {}
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // -----------------------------------------------------------
  // LOAD NIGHT MODE & BOOKMARKS PREFERENCES
  // -----------------------------------------------------------
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedNightMode = await AsyncStorage.getItem('pdf_night_mode');
        if (savedNightMode === 'true') {
          setNightMode(true);
        }

        const bookmarkKey = `pdf_bookmarks_${pdfUrl}`;
        const savedBookmarks = await AsyncStorage.getItem(bookmarkKey);
        if (savedBookmarks) {
          setBookmarks(JSON.parse(savedBookmarks));
        } else if (user?.id && pdfId) {
          // Load from SQLite bookmarks table if available
          const rows = await executeQuery(
            `SELECT page_number FROM bookmarks WHERE user_id = ? AND content_type = 'pdf' AND content_id = ?`,
            [user.id, pdfId]
          );
          if (rows && rows.length > 0) {
            const pages = rows.map((r: any) => Number(r.page_number)).filter(Boolean);
            setBookmarks(pages);
          }
        }
      } catch (err) {
        console.warn('Error loading preferences:', err);
      }
    };
    loadPreferences();
  }, [pdfUrl, user?.id, pdfId]);

  const toggleNightMode = async () => {
    const nextMode = !nightMode;
    setNightMode(nextMode);
    await AsyncStorage.setItem('pdf_night_mode', nextMode ? 'true' : 'false');
  };

  const toggleBookmarkCurrentPage = async () => {
    const isBookmarked = bookmarks.includes(currentPage);
    let nextBookmarks: number[];
    if (isBookmarked) {
      nextBookmarks = bookmarks.filter((p) => p !== currentPage);
      if (user?.id && pdfId) {
        await executeQuery(
          `DELETE FROM bookmarks WHERE user_id = ? AND content_type = 'pdf' AND content_id = ? AND page_number = ?`,
          [user.id, pdfId, currentPage]
        ).catch(() => {});
      }
    } else {
      nextBookmarks = [...bookmarks, currentPage].sort((a, b) => a - b);
      if (user?.id && pdfId) {
        await executeQuery(
          `INSERT INTO bookmarks (user_id, subject_id, content_type, content_id, page_number)
           VALUES (?, 0, 'pdf', ?, ?)`,
          [user.id, pdfId, currentPage]
        ).catch(() => {});
      }
    }
    setBookmarks(nextBookmarks);
    await AsyncStorage.setItem(`pdf_bookmarks_${pdfUrl}`, JSON.stringify(nextBookmarks));
  };

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

  // Render single active page with book card styling
  const renderSinglePage = useCallback(
    async (doc: any, pageNum: number, currentScale: number, isDark: boolean) => {
      if (!containerRef.current || !doc) return;

      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch (e) {}
        activeRenderTaskRef.current = null;
      }

      setPageRendering(true);
      const container = containerRef.current;
      container.innerHTML = '';

      try {
        const page = await doc.getPage(pageNum);
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: currentScale });

        const pageCard = document.createElement('div');
        pageCard.style.position = 'relative';
        pageCard.style.backgroundColor = isDark ? '#111827' : '#ffffff';
        pageCard.style.boxShadow = isDark
          ? '0 12px 36px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)'
          : '0 12px 36px rgba(0,0,0,0.38), 0 2px 8px rgba(0,0,0,0.18)';
        pageCard.style.borderRadius = '6px';
        pageCard.style.overflow = 'hidden';
        pageCard.style.display = 'flex';
        pageCard.style.justifyContent = 'center';
        pageCard.style.alignItems = 'center';
        pageCard.style.transition = 'transform 0.22s ease-out, opacity 0.22s ease-out';
        pageCard.style.userSelect = 'none';

        // Dark / Night Mode filter: invert with hue preservation
        if (isDark) {
          pageCard.style.filter = 'invert(90%) hue-rotate(180deg) contrast(110%)';
        }

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

  // Load document initially with Last Page Remember
  useEffect(() => {
    let cancelled = false;

    const loadDoc = async () => {
      try {
        setLoading(true);
        setError(null);
        setStatusMessage('Loading PDF engine...');

        const pdfjs = await ensurePdfJsLoaded();
        if (cancelled) return;

        setStatusMessage('Opening textbook...');
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

        // Feature: Last Page Remember
        let initialPage = 1;
        try {
          const lastPageSaved = await AsyncStorage.getItem(`last_page_${pdfUrl}`);
          if (lastPageSaved) {
            const parsed = parseInt(lastPageSaved, 10);
            if (!isNaN(parsed) && parsed >= 1 && parsed <= doc.numPages) {
              initialPage = parsed;
              if (initialPage > 1) {
                setResumeNotice(`मागील वाचन: पान ${initialPage} वरून सुरू केले (Resumed from page ${initialPage})`);
                setTimeout(() => setResumeNotice(null), 4000);
              }
            }
          }
        } catch (e) {}

        setCurrentPage(initialPage);
        setPageInput(String(initialPage));
        setLoading(false);

        setTimeout(() => {
          if (!cancelled && doc) {
            renderSinglePage(doc, initialPage, scale, nightMode);
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

  // Re-render when nightMode toggles
  useEffect(() => {
    if (pdfDocRef.current && !pageRendering) {
      renderSinglePage(pdfDocRef.current, currentPage, scale, nightMode);
    }
  }, [nightMode]);

  // Navigate to specific page & save Last Page Remember
  const goToPage = useCallback(
    (targetPage: number, dir?: 'next' | 'prev') => {
      if (!pdfDocRef.current || totalPages === 0) return;
      const validPage = Math.max(1, Math.min(targetPage, totalPages));
      if (validPage === currentPage && !dir) return;

      setTurnDirection(dir || (validPage > currentPage ? 'next' : 'prev'));
      setCurrentPage(validPage);
      setPageInput(String(validPage));

      // Save Last Page Remember
      AsyncStorage.setItem(`last_page_${pdfUrl}`, String(validPage)).catch(() => {});

      if (pdfDocRef.current) {
        renderSinglePage(pdfDocRef.current, validPage, scale, nightMode);
      }
    },
    [currentPage, totalPages, scale, nightMode, pdfUrl, renderSinglePage]
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
    const clampedScale = Math.max(0.75, Math.min(newScale, 2.8));
    setScale(clampedScale);
    if (pdfDocRef.current && !pageRendering) {
      renderSinglePage(pdfDocRef.current, currentPage, clampedScale, nightMode);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (showSearchModal || showBookmarksModal) return;

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
  }, [nextPage, prevPage, goToPage, totalPages, showSearchModal, showBookmarksModal]);

  const handlePageInputSubmit = () => {
    const pageNum = parseInt(pageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      goToPage(pageNum);
    } else {
      setPageInput(String(currentPage));
    }
  };

  // Touch Swipe for mobile touchscreen
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
      if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
        if (diffX < 0) {
          nextPage();
        } else {
          prevPage();
        }
      }
    }
  };

  // -----------------------------------------------------------
  // FULL-TEXT SEARCH ACROSS PDF PAGES
  // -----------------------------------------------------------
  const executeSearch = async () => {
    const query = searchQuery.trim();
    if (!query || !pdfDocRef.current || totalPages === 0) return;

    setIsSearching(true);
    setSearchResults([]);
    setSearchProgress(0);

    const doc = pdfDocRef.current;
    const matches: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    try {
      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        setSearchProgress(pageNum);
        const page = await doc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str || '').join(' ');
        const lowerPageText = pageText.toLowerCase();

        const matchIdx = lowerPageText.indexOf(lowerQuery);
        if (matchIdx !== -1) {
          const start = Math.max(0, matchIdx - 35);
          const end = Math.min(pageText.length, matchIdx + query.length + 35);
          const snippet = (start > 0 ? '...' : '') + pageText.substring(start, end).trim() + (end < pageText.length ? '...' : '');
          matches.push({ pageNumber: pageNum, snippet });
        }
        page.cleanup();
      }
      setSearchResults(matches);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const isCurrentPageBookmarked = bookmarks.includes(currentPage);

  return (
    <SafeAreaView style={[styles.container, nightMode && styles.containerDark]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, nightMode && styles.headerDark]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={nightMode ? '#F8FAFC' : COLORS.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={[styles.title, nightMode && styles.titleDark]} numberOfLines={1}>
            {title || 'पुस्तकाचे पान (Book Reader)'}
          </Text>
          {!loading && !error && totalPages > 0 && (
            <Text style={styles.subtitle}>
              पान {currentPage} / {totalPages}
            </Text>
          )}
        </View>

        {/* Toolbar: Bookmark, Search, Night Mode, Zoom */}
        {!loading && !error && totalPages > 0 && (
          <View style={styles.toolbar}>
            {/* Search Button */}
            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => setShowSearchModal(true)}
              accessibilityLabel="Search textbook"
            >
              <Ionicons name="search" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Bookmark Current Page */}
            <TouchableOpacity
              style={[styles.toolButton, isCurrentPageBookmarked && styles.toolButtonActive]}
              onPress={toggleBookmarkCurrentPage}
              accessibilityLabel="Bookmark page"
            >
              <Ionicons
                name={isCurrentPageBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={isCurrentPageBookmarked ? '#F59E0B' : '#94A3B8'}
              />
            </TouchableOpacity>

            {/* Bookmarks List View */}
            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => setShowBookmarksModal(true)}
              accessibilityLabel="View all bookmarks"
            >
              <Ionicons name="list" size={18} color="#94A3B8" />
              {bookmarks.length > 0 && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>{bookmarks.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Night Mode Toggle */}
            <TouchableOpacity
              style={[styles.toolButton, nightMode && styles.toolButtonActive]}
              onPress={toggleNightMode}
              accessibilityLabel="Toggle Night Mode"
            >
              <Ionicons name={nightMode ? 'sunny' : 'moon'} size={18} color={nightMode ? '#FBBF24' : '#94A3B8'} />
            </TouchableOpacity>

            {/* Zoom Controls */}
            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => handleZoom(scale - 0.2)}
              accessibilityLabel="Zoom Out"
            >
              <Ionicons name="remove" size={18} color="#94A3B8" />
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
              <Ionicons name="add" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Resume Notice Toast (Last Page Remember) */}
      {resumeNotice && (
        <View style={styles.toastNotice}>
          <Ionicons name="time" size={18} color="#FBBF24" style={{ marginRight: 6 }} />
          <Text style={styles.toastNoticeText}>{resumeNotice}</Text>
        </View>
      )}

      {/* Main Reader Stage */}
      {loading ? (
        <View style={[styles.centerBox, nightMode && styles.centerBoxDark]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      ) : error ? (
        <View style={[styles.centerBox, nightMode && styles.centerBoxDark]}>
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
          style={[styles.bookStage, nightMode && styles.bookStageDark]}
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

      {/* Bottom Manual Book Navigation Bar */}
      {!loading && !error && totalPages > 0 && (
        <View style={[styles.bottomBar, nightMode && styles.bottomBarDark]}>
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

          {/* Current Page Jump Selector */}
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

      {/* ----------------------------------------------------------- */}
      {/* SEARCH MODAL */}
      {/* ----------------------------------------------------------- */}
      <Modal
        visible={showSearchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>पुस्तकात शोधा (Search Text)</Text>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <TextInput
                style={styles.searchInput}
                placeholder="शब्द किंवा वाक्य टाका (Enter keyword)..."
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={executeSearch}
                autoFocus
              />
              <TouchableOpacity style={styles.searchButton} onPress={executeSearch} disabled={isSearching}>
                {isSearching ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="search" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {isSearching && (
              <View style={styles.searchProgressBox}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.searchProgressText}>
                  पान {searchProgress} / {totalPages} शोधत आहे...
                </Text>
              </View>
            )}

            <ScrollView style={styles.resultsList}>
              {!isSearching && searchResults.length === 0 && searchQuery.trim() !== '' && (
                <Text style={styles.noResultsText}>कोणतेही निकाल आढळले नाहीत (No results found).</Text>
              )}
              {searchResults.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.searchResultItem}
                  onPress={() => {
                    setShowSearchModal(false);
                    goToPage(item.pageNumber);
                  }}
                >
                  <View style={styles.resultBadge}>
                    <Text style={styles.resultBadgeText}>पान {item.pageNumber}</Text>
                  </View>
                  <Text style={styles.resultSnippet} numberOfLines={2}>
                    {item.snippet}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ----------------------------------------------------------- */}
      {/* BOOKMARKS LIST MODAL */}
      {/* ----------------------------------------------------------- */}
      <Modal
        visible={showBookmarksModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBookmarksModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>बुकमार्क केलेली पाने (Bookmarks)</Text>
              <TouchableOpacity onPress={() => setShowBookmarksModal(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.resultsList}>
              {bookmarks.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Ionicons name="bookmark-outline" size={40} color="#64748B" />
                  <Text style={[styles.noResultsText, { marginTop: 12 }]}>
                    अद्याप कोणतेही पान बुकमार्क केलेले नाही. वर दिलेल्या 🔖 चिन्हावर क्लिक करून पान बुकमार्क करा.
                  </Text>
                </View>
              ) : (
                bookmarks.map((p) => (
                  <View key={p} style={styles.bookmarkRow}>
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => {
                        setShowBookmarksModal(false);
                        goToPage(p);
                      }}
                    >
                      <Ionicons name="bookmark" size={20} color="#F59E0B" style={{ marginRight: 10 }} />
                      <Text style={styles.bookmarkPageText}>पान {p}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        const updated = bookmarks.filter((b) => b !== p);
                        setBookmarks(updated);
                        await AsyncStorage.setItem(`pdf_bookmarks_${pdfUrl}`, JSON.stringify(updated));
                        if (user?.id && pdfId) {
                          await executeQuery(
                            `DELETE FROM bookmarks WHERE user_id = ? AND content_type = 'pdf' AND content_id = ? AND page_number = ?`,
                            [user.id, pdfId, p]
                          ).catch(() => {});
                        }
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Global CSS for book page turn flip effect and anti-print protection */}
      {/* @ts-ignore */}
      <style>{`
        @media print {
          body, #root, * {
            display: none !important;
            visibility: hidden !important;
          }
        }
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
  containerDark: {
    backgroundColor: '#090D16',
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
  headerDark: {
    backgroundColor: '#0B0F19',
    borderBottomColor: '#1E293B',
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
  titleDark: {
    color: '#E2E8F0',
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
    position: 'relative',
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  toolButtonActive: {
    backgroundColor: '#334155',
    borderColor: '#3B82F6',
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCountText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
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
  toastNotice: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
    boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
  },
  toastNoticeText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  bookStage: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#334155',
    overflow: 'hidden',
  },
  bookStageDark: {
    backgroundColor: '#0F172A',
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
  bottomBarDark: {
    backgroundColor: '#0B0F19',
    borderTopColor: '#1E293B',
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
  centerBoxDark: {
    backgroundColor: '#0B0F19',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '80%',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  searchBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 14,
  },
  searchButton: {
    width: 44,
    height: 42,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchProgressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  searchProgressText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  resultsList: {
    maxHeight: 320,
  },
  noResultsText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  searchResultItem: {
    padding: 12,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  resultBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  resultBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  resultSnippet: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
  },
  bookmarkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bookmarkPageText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
});
