// src/screens/learning/videos/VideoPlayerScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as ScreenCapture from 'expo-screen-capture';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS } from '../../../constants/colors';
import { executeQuery } from '../../../database/database';
import { useAuth } from '../../../context/AuthContext';
import { videoAssets } from '../../../data/videoAssets';
import { subtitleAssets } from '../../../data/subtitleAssets';
import { parseSrt, SubtitleCue } from '../../../utils/subtitleParser';
import { resolveFileUri } from '../../../utils/fileStorage';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<any, 'VideoPlayer'>;

interface VideoItem {
  id: number;
  subject_id: number;
  title_english: string;
  title_marathi: string | null;
  description_english: string | null;
  description_marathi: string | null;
  video_url: string;
  subtitle_url: string | null;
  video_duration: number | null;
  sort_order: number;
}

interface VideoBookmark {
  id: number;
  timestamp: number;
  created_at?: string;
}

interface ContinueWatchingItem {
  video_id: number;
  title_english: string;
  title_marathi: string | null;
  video_url: string;
  position_millis: number;
  duration_millis: number;
  progressPercent: number;
  last_watched_at: string;
}

interface WatchHistoryItem {
  video_id: number;
  title_english: string;
  title_marathi: string | null;
  position_millis: number;
  duration_millis: number;
  is_completed: boolean;
  last_watched_at: string;
}

const playbackRates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

const VideoPlayerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { subjectId, videoId: targetVideoId } = (route.params as any) || {};
  const { user } = useAuth();
  const videoRef = useRef<Video>(null);
  const lastSavedPosition = useRef(0);

  // Core Video states
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [videoSource, setVideoSource] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [currentDuration, setCurrentDuration] = useState(0);

  // Speed Control
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);

  // Subtitles
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState('');

  // Resume Playback
  const [resumePosition, setResumePosition] = useState(0);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // Orientation / Landscape Mode
  const [isLandscape, setIsLandscape] = useState(false);

  // Bookmarks
  const [videoBookmarks, setVideoBookmarks] = useState<VideoBookmark[]>([]);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);

  // Continue Watching & Watch History
  const [continueWatchingList, setContinueWatchingList] = useState<ContinueWatchingItem[]>([]);
  const [watchHistoryList, setWatchHistoryList] = useState<WatchHistoryItem[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const formatTime = (milliseconds: number) => {
    if (!milliseconds || isNaN(milliseconds) || milliseconds < 0) return '00:00';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // -------------------------------------------------------------
  // SECURITY RESTRICTIONS:
  // Anti-download, Anti-save, Anti-share, Anti-screenshot
  // -------------------------------------------------------------
  useEffect(() => {
    // 1. Prevent Mobile Screen Capture / Recording
    ScreenCapture.preventScreenCaptureAsync().catch(() => {});

    // 2. Prevent Web Context Menu and Keyboard Screen Grab
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        return false;
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (
          (e.ctrlKey || e.metaKey) &&
          ['s', 'p', 'u', 'c'].includes(e.key.toLowerCase())
        ) {
          e.preventDefault();
          return false;
        }
        if (e.key === 'PrintScreen') {
          try {
            if (navigator.clipboard?.writeText) {
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
        ScreenCapture.allowScreenCaptureAsync().catch(() => {});
      };
    }

    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, []);

  // -------------------------------------------------------------
  // RESOLVE VIDEO SOURCE (Bundled assets, Local disk, Drive stream)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!selectedVideo) {
      setVideoSource(null);
      return;
    }

    let isMounted = true;

    const resolveSource = async () => {
      const url = selectedVideo.video_url;
      if (!url) {
        if (isMounted) setVideoSource(null);
        return;
      }

      // 1. Check bundled asset dictionary
      if (videoAssets[url]) {
        if (isMounted) setVideoSource(videoAssets[url]);
        return;
      }

      // 2. Explicit sample video reference
      if (url === 'sample-video.mp4' && videoAssets['sample-video.mp4']) {
        if (isMounted) setVideoSource(videoAssets['sample-video.mp4']);
        return;
      }

      // 3. Web IndexedDB saved file (idb://...)
      if (url.startsWith('idb://')) {
        try {
          const blobUrl = await resolveFileUri(url);
          if (isMounted) setVideoSource({ uri: blobUrl });
          return;
        } catch (err) {
          console.warn('Failed to resolve IndexedDB video URI:', err);
        }
      }

      // 4. Local file:// on Web: routed through Metro 206 Partial Content server
      if (Platform.OS === 'web' && url.startsWith('file://')) {
        const proxyUri = `/api/video-content?file=${encodeURIComponent(url)}`;
        if (isMounted) setVideoSource({ uri: proxyUri });
        return;
      }

      // 5. Google Drive direct / usercontent URLs
      const driveMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (driveMatch && driveMatch[1]) {
        const driveId = driveMatch[1];
        if (Platform.OS === 'web') {
          const proxyUri = `/api/drive-video?id=${driveId}`;
          if (isMounted) setVideoSource({ uri: proxyUri });
          return;
        } else {
          const directStream = `https://drive.usercontent.google.com/download?id=${driveId}&export=download`;
          if (isMounted) setVideoSource({ uri: directStream });
          return;
        }
      }

      // 6. Direct HTTP/HTTPS or Native file://
      if (isMounted) setVideoSource({ uri: url });
    };

    resolveSource();

    return () => {
      isMounted = false;
    };
  }, [selectedVideo]);

  // -------------------------------------------------------------
  // LOAD VIDEOS FOR SUBJECT
  // -------------------------------------------------------------
  const loadVideos = async () => {
    try {
      setIsLoading(true);

      let query = `
        SELECT 
          id,
          subject_id,
          title_english,
          title_marathi,
          description_english,
          description_marathi,
          video_url,
          subtitle_url,
          video_duration,
          sort_order
        FROM videos
        WHERE subject_id = ? AND is_active = 1
      `;
      const params: any[] = [subjectId];

      if (user?.medium && (user.medium === 'english' || user.medium === 'marathi')) {
        query += ` AND (medium IS NULL OR medium = 'both' OR medium = ?)`;
        params.push(user.medium);
      }

      query += ` ORDER BY sort_order ASC, id ASC`;

      const result = await executeQuery(query, params);
      const videoData = result as VideoItem[];
      setVideos(videoData);

      if (videoData.length > 0) {
        const initialVideo = targetVideoId
          ? videoData.find((v) => v.id === targetVideoId) || videoData[0]
          : videoData[0];

        await setupVideo(initialVideo);
      }

      await loadContinueWatching();
    } catch (error) {
      console.error('Error loading videos:', error);
      Alert.alert('Error', 'Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };

  const setupVideo = async (video: VideoItem) => {
    setSelectedVideo(video);
    setIsPlaying(false);
    setCurrentPosition(0);

    // 1. Load saved progress for Resume Playback
    const savedProgress = await loadVideoProgress(video.id);
    if (savedProgress > 5000) {
      setResumePosition(savedProgress);
      setShowResumePrompt(true);
    } else {
      setResumePosition(0);
      setShowResumePrompt(false);
    }

    // 2. Load subtitles if available
    if (video.subtitle_url) {
      await loadSubtitles(video.subtitle_url);
    } else {
      setSubtitles([]);
      setSubtitlesEnabled(false);
    }

    // 3. Load bookmarks for this video
    await loadBookmarks(video.id);
  };

  // -------------------------------------------------------------
  // PROGRESS & RESUME PLAYBACK
  // -------------------------------------------------------------
  const loadVideoProgress = async (videoId: number): Promise<number> => {
    try {
      // 1. From SQLite
      if (user?.id) {
        const result = await executeQuery(
          `SELECT position_millis FROM video_progress 
           WHERE user_id = ? AND video_id = ?`,
          [user.id, videoId]
        );
        if (result.length > 0 && Number(result[0].position_millis) > 0) {
          return Number(result[0].position_millis);
        }
      }

      // 2. From AsyncStorage fallback
      const localKey = `ssc_video_prog_${user?.id || 'guest'}_${videoId}`;
      const saved = await AsyncStorage.getItem(localKey);
      if (saved) {
        return Number(saved) || 0;
      }
    } catch (error) {
      console.error('Error loading video progress:', error);
    }
    return 0;
  };

  const saveVideoProgress = async (
    videoId: number,
    positionMillis: number,
    durationMillis: number
  ) => {
    try {
      const isCompleted = durationMillis > 0 && positionMillis >= durationMillis * 0.95 ? 1 : 0;

      // 1. SQLite saving
      if (user?.id) {
        await executeQuery(
          `INSERT OR REPLACE INTO video_progress 
           (user_id, video_id, position_millis, duration_millis, is_completed, last_watched_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [user.id, videoId, positionMillis, durationMillis, isCompleted]
        );
      }

      // 2. AsyncStorage saving
      const localKey = `ssc_video_prog_${user?.id || 'guest'}_${videoId}`;
      await AsyncStorage.setItem(localKey, String(positionMillis));
    } catch (error) {
      console.error('Error saving video progress:', error);
    }
  };

  const resumePlayback = async () => {
    if (!videoRef.current || resumePosition === 0) return;
    try {
      await videoRef.current.setPositionAsync(resumePosition);
      await videoRef.current.playAsync();
      setIsPlaying(true);
      setShowResumePrompt(false);
      showToast(`Resumed at ${formatTime(resumePosition)} ▶`);
    } catch (error) {
      console.error('Resume playback error:', error);
    }
  };

  const startFromBeginning = async () => {
    if (!videoRef.current) return;
    try {
      await videoRef.current.setPositionAsync(0);
      setCurrentPosition(0);
      setResumePosition(0);
      setShowResumePrompt(false);
      await videoRef.current.playAsync();
      setIsPlaying(true);
    } catch (error) {
      console.error('Start over error:', error);
    }
  };

  // -------------------------------------------------------------
  // BOOKMARK MANAGEMENT
  // -------------------------------------------------------------
  const loadBookmarks = async (videoId: number) => {
    let list: VideoBookmark[] = [];
    try {
      if (user?.id) {
        const result = await executeQuery(
          `SELECT id, timestamp, created_at FROM bookmarks 
           WHERE user_id = ? AND subject_id = ? AND content_type = 'video' AND content_id = ?
           ORDER BY timestamp ASC`,
          [user.id, subjectId, videoId]
        );
        list = (result as any[]).map((r) => ({
          id: Number(r.id),
          timestamp: Number(r.timestamp),
          created_at: r.created_at,
        }));
      }

      // AsyncStorage fallback
      const localKey = `ssc_video_bms_${user?.id || 'guest'}_${videoId}`;
      const savedRaw = await AsyncStorage.getItem(localKey);
      if (savedRaw) {
        const localList: VideoBookmark[] = JSON.parse(savedRaw);
        localList.forEach((lb) => {
          if (!list.some((b) => Math.abs(b.timestamp - lb.timestamp) < 2000)) {
            list.push(lb);
          }
        });
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
    setVideoBookmarks(list);
  };

  const addBookmarkAtCurrentTime = async () => {
    if (!selectedVideo) return;
    const pos = currentPosition;
    const newBm: VideoBookmark = {
      id: Date.now(),
      timestamp: pos,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      if (user?.id) {
        await executeQuery(
          `INSERT INTO bookmarks (user_id, subject_id, content_type, content_id, timestamp)
           VALUES (?, ?, 'video', ?, ?)`,
          [user.id, subjectId, selectedVideo.id, pos]
        );
      }

      const updated = [...videoBookmarks, newBm].sort((a, b) => a.timestamp - b.timestamp);
      setVideoBookmarks(updated);

      const localKey = `ssc_video_bms_${user?.id || 'guest'}_${selectedVideo.id}`;
      await AsyncStorage.setItem(localKey, JSON.stringify(updated));

      showToast(`Bookmarked at ${formatTime(pos)} 🔖`);
    } catch (error) {
      console.error('Error adding bookmark:', error);
      showToast('Could not save bookmark');
    }
  };

  const deleteBookmark = async (bm: VideoBookmark) => {
    if (!selectedVideo) return;
    try {
      if (user?.id) {
        await executeQuery(
          `DELETE FROM bookmarks 
           WHERE user_id = ? AND content_type = 'video' AND content_id = ? AND (id = ? OR timestamp = ?)`,
          [user.id, selectedVideo.id, bm.id, bm.timestamp]
        );
      }

      const updated = videoBookmarks.filter(
        (b) => b.id !== bm.id && b.timestamp !== bm.timestamp
      );
      setVideoBookmarks(updated);

      const localKey = `ssc_video_bms_${user?.id || 'guest'}_${selectedVideo.id}`;
      await AsyncStorage.setItem(localKey, JSON.stringify(updated));

      showToast('Bookmark removed');
    } catch (error) {
      console.error('Error deleting bookmark:', error);
    }
  };

  // -------------------------------------------------------------
  // CONTINUE WATCHING & WATCH HISTORY
  // -------------------------------------------------------------
  const loadContinueWatching = async () => {
    try {
      if (!user?.id) return;
      const rows = await executeQuery(
        `SELECT vp.video_id, vp.position_millis, vp.duration_millis, vp.last_watched_at,
                v.title_english, v.title_marathi, v.video_url
         FROM video_progress vp
         JOIN videos v ON vp.video_id = v.id
         WHERE vp.user_id = ? AND vp.is_completed = 0 AND vp.position_millis > 5000
         ORDER BY vp.last_watched_at DESC
         LIMIT 5`,
        [user.id]
      );

      const items: ContinueWatchingItem[] = (rows as any[]).map((r) => ({
        video_id: Number(r.video_id),
        title_english: r.title_english,
        title_marathi: r.title_marathi,
        video_url: r.video_url,
        position_millis: Number(r.position_millis),
        duration_millis: Number(r.duration_millis),
        progressPercent:
          r.duration_millis > 0
            ? Math.min(100, Math.round((Number(r.position_millis) / Number(r.duration_millis)) * 100))
            : 0,
        last_watched_at: r.last_watched_at,
      }));

      setContinueWatchingList(items);
    } catch (err) {
      console.warn('Error loading continue watching:', err);
    }
  };

  const loadWatchHistory = async () => {
    try {
      if (!user?.id) return;
      const rows = await executeQuery(
        `SELECT vp.video_id, vp.position_millis, vp.duration_millis, vp.is_completed, vp.last_watched_at,
                v.title_english, v.title_marathi
         FROM video_progress vp
         JOIN videos v ON vp.video_id = v.id
         WHERE vp.user_id = ?
         ORDER BY vp.last_watched_at DESC
         LIMIT 25`,
        [user.id]
      );

      const items: WatchHistoryItem[] = (rows as any[]).map((r) => ({
        video_id: Number(r.video_id),
        title_english: r.title_english,
        title_marathi: r.title_marathi,
        position_millis: Number(r.position_millis),
        duration_millis: Number(r.duration_millis),
        is_completed: Boolean(r.is_completed),
        last_watched_at: r.last_watched_at || '',
      }));

      setWatchHistoryList(items);
    } catch (err) {
      console.warn('Error loading watch history:', err);
    }
  };

  // -------------------------------------------------------------
  // PLAYBACK STATUS UPDATE
  // -------------------------------------------------------------
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded || !selectedVideo) return;

    const position = status.positionMillis;
    const duration = status.durationMillis || 0;

    setCurrentPosition(position);
    setCurrentDuration(duration);
    setIsPlaying(status.isPlaying);

    // Auto-save progress every 5 seconds
    const difference = Math.abs(position - lastSavedPosition.current);
    if (difference >= 5000) {
      lastSavedPosition.current = position;
      saveVideoProgress(selectedVideo.id, position, duration);
    }

    // Handle completion
    if (status.didJustFinish) {
      lastSavedPosition.current = duration;
      setResumePosition(0);
      setShowResumePrompt(false);
      saveVideoProgress(selectedVideo.id, duration, duration);
      loadContinueWatching();
    }

    // Subtitle sync
    if (subtitlesEnabled && subtitles.length > 0) {
      const activeCue = subtitles.find(
        (cue) => position >= cue.startTime && position < cue.endTime
      );
      setCurrentSubtitle(activeCue?.text || '');
    } else if (currentSubtitle) {
      setCurrentSubtitle('');
    }
  };

  const togglePlayPause = async () => {
    if (!videoRef.current) return;
    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
        if (selectedVideo) {
          saveVideoProgress(selectedVideo.id, currentPosition, currentDuration);
        }
      } else {
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Toggle play/pause error:', error);
    }
  };

  const handleSeek = async (position: number) => {
    if (!videoRef.current) return;
    try {
      await videoRef.current.setPositionAsync(position);
      setCurrentPosition(position);
    } catch (error) {
      console.error('Seek error:', error);
    }
  };

  const changePlaybackRate = async (rate: number) => {
    try {
      setPlaybackRate(rate);
      setShowSpeedOptions(false);
      await videoRef.current?.setRateAsync(rate, true);
      showToast(`Speed: ${rate}x`);
    } catch (error) {
      console.error('Playback speed error:', error);
    }
  };

  // -------------------------------------------------------------
  // SUBTITLES & LANDSCAPE
  // -------------------------------------------------------------
  const loadSubtitles = async (subtitleUrl: string | null) => {
    if (!subtitleUrl) return;
    try {
      const subtitleModule = subtitleAssets[subtitleUrl];
      if (subtitleModule) {
        const asset = Asset.fromModule(subtitleModule);
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        if (uri) {
          const content = await FileSystem.readAsStringAsync(uri);
          const parsed = parseSrt(content);
          setSubtitles(parsed);
        }
      }
    } catch (error) {
      console.error('Subtitle loading error:', error);
    }
  };

  const toggleSubtitles = () => {
    if (subtitles.length === 0) {
      showToast('No subtitles available for this video lesson');
      return;
    }
    const next = !subtitlesEnabled;
    setSubtitlesEnabled(next);
    showToast(next ? 'Subtitles: ON' : 'Subtitles: OFF');
  };

  const toggleLandscape = async () => {
    try {
      setShowSpeedOptions(false);
      if (isLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setIsLandscape(false);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsLandscape(true);
      }
    } catch (error) {
      console.error('Orientation error:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadVideos();
      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      };
    }, [subjectId])
  );

  const isCurrentBookmarked = videoBookmarks.some(
    (b) => Math.abs(b.timestamp - currentPosition) < 2000
  );

  const isOfflineSource = Boolean(
    (selectedVideo?.video_url && videoAssets[selectedVideo.video_url]) ||
    selectedVideo?.video_url?.startsWith('file://') ||
    selectedVideo?.video_url?.startsWith('idb://') ||
    selectedVideo?.video_url === 'sample-video.mp4'
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading video lessons...</Text>
      </SafeAreaView>
    );
  }

  if (!selectedVideo || videos.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Ionicons name="videocam-off-outline" size={64} color="#CBD5E1" />
        <Text style={styles.emptyTitle}>No Videos Available</Text>
        <Text style={styles.emptyText}>No video lessons have been added for this subject.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selectedVideo.title_english}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => {
                loadWatchHistory();
                setShowHistoryModal(true);
              }}
            >
              <Ionicons name="time-outline" size={22} color="#475569" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => setShowBookmarksModal(true)}
            >
              <Ionicons
                name={videoBookmarks.length > 0 ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={videoBookmarks.length > 0 ? COLORS.primary : '#475569'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Video Player Container */}
        <View style={[styles.videoContainer, isLandscape && styles.videoLandscape]}>
          <Video
            ref={videoRef}
            key={selectedVideo.id}
            source={videoSource || { uri: selectedVideo.video_url }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls={false}
            shouldPlay={false}
            positionMillis={resumePosition}
            rate={playbackRate}
            shouldCorrectPitch
            progressUpdateIntervalMillis={500}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onError={(e) => console.warn('Video playback error:', e)}
            onFullscreenUpdate={async ({ fullscreenUpdate }) => {
              if (fullscreenUpdate === 3) {
                try {
                  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
                  setIsLandscape(false);
                } catch (error) {
                  console.error('Portrait orientation error:', error);
                }
              }
            }}
          />

          {/* Big Center Play Overlay when paused */}
          {!isPlaying && (
            <TouchableOpacity
              style={styles.playOverlay}
              onPress={togglePlayPause}
              activeOpacity={0.8}
            >
              <Ionicons name="play-circle" size={72} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          )}

          {/* Subtitle Overlay */}
          {subtitlesEnabled && currentSubtitle !== '' && (
            <View pointerEvents="none" style={styles.subtitleOverlay}>
              <Text style={styles.subtitleText}>{currentSubtitle}</Text>
            </View>
          )}
        </View>

        {/* Interactive Resume Banner */}
        {showResumePrompt && resumePosition > 5000 && (
          <View style={styles.resumeBanner}>
            <View style={styles.resumeBannerContent}>
              <Ionicons name="reload-circle-outline" size={22} color="#2563EB" />
              <Text style={styles.resumeBannerText}>
                Resume playback from <Text style={{ fontWeight: '700' }}>{formatTime(resumePosition)}</Text>?
              </Text>
            </View>
            <View style={styles.resumeBannerActions}>
              <TouchableOpacity style={styles.resumeBtn} onPress={resumePlayback}>
                <Text style={styles.resumeBtnText}>Resume ▶</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.startOverBtn} onPress={startFromBeginning}>
                <Text style={styles.startOverBtnText}>Start Over ↺</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Player Controls */}
        <View style={styles.controls}>
          {/* Rewind 10s */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              const newPosition = Math.max(0, currentPosition - 10000);
              handleSeek(newPosition);
            }}
          >
            <Ionicons name="play-back" size={22} color={COLORS.white} />
          </TouchableOpacity>

          {/* Play/Pause */}
          <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={COLORS.white} />
          </TouchableOpacity>

          {/* Forward 10s */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              const newPosition = Math.min(currentDuration, currentPosition + 10000);
              handleSeek(newPosition);
            }}
          >
            <Ionicons name="play-forward" size={22} color={COLORS.white} />
          </TouchableOpacity>

          {/* Speed Selector Toggle */}
          <TouchableOpacity
            style={[styles.controlButton, playbackRate !== 1.0 && styles.controlButtonActive]}
            onPress={() => setShowSpeedOptions(!showSpeedOptions)}
          >
            <Text style={[styles.speedText, playbackRate !== 1.0 && styles.speedTextActive]}>
              {playbackRate}x
            </Text>
          </TouchableOpacity>

          {/* Subtitle Toggle (CC) */}
          <TouchableOpacity
            style={[styles.controlButton, subtitlesEnabled && styles.controlButtonActive]}
            onPress={toggleSubtitles}
          >
            <Ionicons
              name="chatbox-ellipses-outline"
              size={20}
              color={subtitlesEnabled ? '#38BDF8' : COLORS.white}
            />
          </TouchableOpacity>

          {/* Bookmark Current Moment */}
          <TouchableOpacity
            style={[styles.controlButton, isCurrentBookmarked && styles.controlButtonActive]}
            onPress={addBookmarkAtCurrentTime}
          >
            <Ionicons
              name={isCurrentBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={isCurrentBookmarked ? '#F59E0B' : COLORS.white}
            />
          </TouchableOpacity>

          {/* Landscape / Fullscreen Toggle */}
          <TouchableOpacity style={styles.controlButton} onPress={toggleLandscape}>
            <Ionicons
              name={isLandscape ? 'contract' : 'expand'}
              size={20}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </View>

        {/* Speed Options Bar */}
        {showSpeedOptions && (
          <View style={styles.speedMenu}>
            <Text style={styles.speedLabel}>Playback Speed:</Text>
            {playbackRates.map((rate) => (
              <TouchableOpacity
                key={rate}
                style={[styles.speedOption, playbackRate === rate && styles.speedOptionActive]}
                onPress={() => changePlaybackRate(rate)}
              >
                <Text
                  style={[
                    styles.speedOptionText,
                    playbackRate === rate && styles.speedOptionTextActive,
                  ]}
                >
                  {rate}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Progress Bar & Timestamps */}
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(currentPosition)}</Text>
          <Pressable
            style={styles.progressBar}
            onPress={(e) => {
              if (currentDuration > 0) {
                const clickX = e.nativeEvent.locationX;
                const barWidth = width - 120;
                const ratio = Math.max(0, Math.min(1, clickX / barWidth));
                handleSeek(ratio * currentDuration);
              }
            }}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    currentDuration > 0 ? (currentPosition / currentDuration) * 100 : 0
                  }%`,
                },
              ]}
            />
          </Pressable>
          <Text style={styles.timeText}>{formatTime(currentDuration)}</Text>
        </View>

        {/* Video Information Card */}
        <View style={styles.videoInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.videoTitle}>{selectedVideo.title_english}</Text>
            <View
              style={[
                styles.offlineBadge,
                isOfflineSource ? styles.offlineReady : styles.onlineStream,
              ]}
            >
              <Ionicons
                name={isOfflineSource ? 'cloud-offline-outline' : 'globe-outline'}
                size={12}
                color={isOfflineSource ? '#10B981' : '#60A5FA'}
              />
              <Text
                style={[
                  styles.offlineBadgeText,
                  { color: isOfflineSource ? '#10B981' : '#60A5FA' },
                ]}
              >
                {isOfflineSource ? 'Offline Ready' : 'Streamed'}
              </Text>
            </View>
          </View>

          {selectedVideo.title_marathi && (
            <Text style={styles.videoMarathi}>{selectedVideo.title_marathi}</Text>
          )}

          {selectedVideo.description_english && (
            <Text style={styles.description}>{selectedVideo.description_english}</Text>
          )}

          {/* Quick Action Badges */}
          <View style={styles.badgeRow}>
            <TouchableOpacity
              style={styles.actionChip}
              onPress={() => setShowBookmarksModal(true)}
            >
              <Ionicons name="bookmark" size={15} color={COLORS.primary} />
              <Text style={styles.actionChipText}>
                Bookmarks ({videoBookmarks.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionChip}
              onPress={() => {
                loadWatchHistory();
                setShowHistoryModal(true);
              }}
            >
              <Ionicons name="time" size={15} color="#0284C7" />
              <Text style={styles.actionChipText}>Watch History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Continue Watching Section */}
        {continueWatchingList.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Continue Watching</Text>
              <Ionicons name="play-circle-outline" size={20} color={COLORS.primary} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.continueScroll}>
              {continueWatchingList.map((item) => (
                <TouchableOpacity
                  key={item.video_id}
                  style={styles.continueCard}
                  onPress={() => {
                    const match = videos.find((v) => v.id === item.video_id);
                    if (match) {
                      setupVideo(match);
                      setResumePosition(item.position_millis);
                      setShowResumePrompt(true);
                    }
                  }}
                >
                  <View style={styles.continueCardThumb}>
                    <Ionicons name="play" size={24} color={COLORS.primary} />
                  </View>
                  <Text style={styles.continueCardTitle} numberOfLines={1}>
                    {item.title_english}
                  </Text>
                  <View style={styles.continueCardProgressTrack}>
                    <View
                      style={[
                        styles.continueCardProgressFill,
                        { width: `${item.progressPercent}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.continueCardTime}>
                    {formatTime(item.position_millis)} ({item.progressPercent}%)
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* More Videos Section */}
        {videos.length > 1 && (
          <View style={styles.otherSection}>
            <Text style={styles.sectionTitle}>All Lessons ({videos.length})</Text>
            {videos
              .filter((v) => v.id !== selectedVideo.id)
              .map((video) => (
                <TouchableOpacity
                  key={video.id}
                  style={styles.otherVideoCard}
                  onPress={() => setupVideo(video)}
                >
                  <View style={styles.smallPlayIcon}>
                    <Ionicons name="play-circle" size={28} color={COLORS.primary} />
                  </View>
                  <View style={styles.otherVideoInfo}>
                    <Text style={styles.otherVideoTitle}>{video.title_english}</Text>
                    {video.title_marathi && (
                      <Text style={styles.otherVideoMarathi}>{video.title_marathi}</Text>
                    )}
                    <Text style={styles.otherVideoText} numberOfLines={1}>
                      {video.description_english || 'Video lesson'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                </TouchableOpacity>
              ))}
          </View>
        )}
      </ScrollView>

      {/* Bookmarks Modal */}
      <Modal
        visible={showBookmarksModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBookmarksModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Ionicons name="bookmark" size={20} color="#F59E0B" />
                <Text style={styles.modalTitle}>Saved Timestamps</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBookmarksModal(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {videoBookmarks.length === 0 ? (
                <View style={styles.modalEmptyBox}>
                  <Ionicons name="bookmark-outline" size={40} color="#94A3B8" />
                  <Text style={styles.modalEmptyText}>
                    No timestamps bookmarked yet.{'\n'}Tap 🔖 during playback to mark key moments.
                  </Text>
                </View>
              ) : (
                videoBookmarks.map((bm, index) => (
                  <View key={bm.id || index} style={styles.modalItemRow}>
                    <TouchableOpacity
                      style={styles.modalItemJump}
                      onPress={() => {
                        handleSeek(bm.timestamp);
                        setShowBookmarksModal(false);
                        showToast(`Jumped to ${formatTime(bm.timestamp)} ⏱️`);
                      }}
                    >
                      <Ionicons name="play-circle" size={24} color={COLORS.primary} />
                      <View style={{ marginLeft: 10 }}>
                        <Text style={styles.modalItemTime}>
                          {formatTime(bm.timestamp)}
                        </Text>
                        {bm.created_at && (
                          <Text style={styles.modalItemDate}>Marked at {bm.created_at}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalItemDelete}
                      onPress={() => deleteBookmark(bm)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalAddBtn}
                onPress={() => {
                  addBookmarkAtCurrentTime();
                }}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.modalAddBtnText}>
                  Bookmark Current Time ({formatTime(currentPosition)})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Watch History Modal */}
      <Modal
        visible={showHistoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Ionicons name="time" size={20} color="#0284C7" />
                <Text style={styles.modalTitle}>Watch History</Text>
              </View>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {watchHistoryList.length === 0 ? (
                <View style={styles.modalEmptyBox}>
                  <Ionicons name="time-outline" size={40} color="#94A3B8" />
                  <Text style={styles.modalEmptyText}>
                    No watch history recorded yet.{'\n'}Your watched lessons will be tracked here.
                  </Text>
                </View>
              ) : (
                watchHistoryList.map((item) => (
                  <TouchableOpacity
                    key={item.video_id}
                    style={styles.modalHistoryCard}
                    onPress={() => {
                      const match = videos.find((v) => v.id === item.video_id);
                      if (match) {
                        setShowHistoryModal(false);
                        setupVideo(match);
                        setResumePosition(item.position_millis);
                        setShowResumePrompt(true);
                      }
                    }}
                  >
                    <View style={styles.modalHistoryInfo}>
                      <Text style={styles.modalHistoryTitle} numberOfLines={1}>
                        {item.title_english}
                      </Text>
                      <Text style={styles.modalHistorySub}>
                        {item.is_completed
                          ? 'Completed ✓'
                          : `Watched to ${formatTime(item.position_millis)}`}
                      </Text>
                    </View>
                    <Ionicons name="play" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingBottom: 40,
  },
  toastContainer: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    zIndex: 999,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#F8FAFC',
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginTop: 15,
    color: '#0F172A',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 7,
  },
  backButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerBackButton: {
    padding: 4,
  },
  headerTitleBox: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  videoContainer: {
    width: '100%',
    backgroundColor: '#000000',
    position: 'relative',
    aspectRatio: 16 / 9,
  },
  videoLandscape: {
    aspectRatio: undefined,
    height: 280,
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitleOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    alignItems: 'center',
  },
  subtitleText: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    color: '#FFFFFF',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  resumeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  resumeBannerText: {
    fontSize: 13,
    color: '#1E3A8A',
  },
  resumeBannerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  resumeBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  resumeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  startOverBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  startOverBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  controlButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    borderRadius: 6,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  speedTextActive: {
    color: '#38BDF8',
  },
  speedMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    flexWrap: 'wrap',
  },
  speedLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginRight: 4,
  },
  speedOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  speedOptionActive: {
    backgroundColor: COLORS.primary,
  },
  speedOptionText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  speedOptionTextActive: {
    color: '#FFFFFF',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#0F172A',
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  timeText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 42,
  },
  videoInfo: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: COLORS.white,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  videoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineReady: {
    backgroundColor: '#ECFDF5',
  },
  onlineStream: {
    backgroundColor: '#EFF6FF',
  },
  offlineBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  videoMarathi: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 4,
  },
  description: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  actionChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionContainer: {
    backgroundColor: COLORS.white,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  continueScroll: {
    marginTop: 6,
  },
  continueCard: {
    width: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  continueCardThumb: {
    width: '100%',
    height: 70,
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  continueCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
  },
  continueCardProgressTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  continueCardProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  continueCardTime: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  otherSection: {
    paddingHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.white,
    paddingVertical: 16,
  },
  otherVideoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    backgroundColor: COLORS.white,
  },
  smallPlayIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherVideoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  otherVideoTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  otherVideoMarathi: {
    color: COLORS.primary,
    fontSize: 12,
    marginTop: 2,
  },
  otherVideoText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalHeaderTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalBody: {
    padding: 16,
  },
  modalEmptyBox: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  modalEmptyText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalItemJump: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalItemTime: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalItemDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  modalItemDelete: {
    padding: 8,
  },
  modalFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  modalAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalHistoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHistoryInfo: {
    flex: 1,
    paddingRight: 10,
  },
  modalHistoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalHistorySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});

export default VideoPlayerScreen;