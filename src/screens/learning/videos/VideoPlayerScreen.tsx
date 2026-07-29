// src/screens/learning/videos/VideoPlayerScreen.tsx
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,  // ✅ ADD THIS IMPORT
  Dimensions,
} from 'react-native';
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';
import { executeQuery } from '../../../database/database';
import { LearningStackParamList } from '../../../navigation/navigationTypes';
import { useAuth } from '../../../context/AuthContext';
import { videoAssets } from '../../../data/videoAssets';
import { subtitleAssets } from '../../../data/subtitleAssets';
import { parseSrt, SubtitleCue } from '../../../utils/subtitleParser';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<LearningStackParamList, 'VideoPlayer'>;

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

const playbackRates = [0.5, 1, 1.5, 2];

const VideoPlayerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { subjectId } = route.params;
  const { user } = useAuth();
  const videoRef = useRef<Video>(null);
  const lastSavedPosition = useRef(0);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [resumePosition, setResumePosition] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const formatTime = (milliseconds: number) => {
    if (!milliseconds) return '00:00';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const getVideoSource = (videoUrl: string) => {
    // Check if it's a bundled asset
    const bundledVideo = videoAssets[videoUrl];
    if (bundledVideo) {
      return bundledVideo;
    }
    
    // Check if it's a local file
    if (videoUrl.startsWith('file://')) {
      return { uri: videoUrl };
    }
    
    // For demo purposes, use the sample video if available
    const sampleVideo = videoAssets['sample-video.mp4'];
    if (sampleVideo) {
      return sampleVideo;
    }
    
    // Fallback: try to use the URL as is
    return { uri: videoUrl };
  };

  const loadVideos = async () => {
    try {
      setIsLoading(true);
      
      const result = await executeQuery(
        `SELECT 
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
        ORDER BY sort_order ASC, id ASC`,
        [subjectId]
      );

      const videoData = result as VideoItem[];
      setVideos(videoData);

      if (videoData.length > 0) {
        const savedProgress = await loadVideoProgress(videoData[0].id);
        setResumePosition(savedProgress);
        setSelectedVideo(videoData[0]);
        
        // Load subtitles if available
        if (videoData[0].subtitle_url) {
          await loadSubtitles(videoData[0].subtitle_url);
        }
        
        // Check bookmark
        await loadBookmark(videoData[0].id);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      Alert.alert('Error', 'Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVideoProgress = async (videoId: number) => {
    if (!user?.id) return 0;
    try {
      const result = await executeQuery(
        `SELECT position_millis FROM video_progress 
         WHERE user_id = ? AND video_id = ?`,
        [user.id, videoId]
      );
      return result.length > 0 ? Number(result[0].position_millis) : 0;
    } catch (error) {
      console.error('Error loading video progress:', error);
      return 0;
    }
  };

  const saveVideoProgress = async (videoId: number, positionMillis: number, durationMillis: number) => {
    if (!user?.id) return;
    try {
      const isCompleted = durationMillis > 0 && positionMillis >= durationMillis * 0.95 ? 1 : 0;
      await executeQuery(
        `INSERT OR REPLACE INTO video_progress 
         (user_id, video_id, position_millis, duration_millis, is_completed, last_watched_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [user.id, videoId, positionMillis, durationMillis, isCompleted]
      );
    } catch (error) {
      console.error('Error saving video progress:', error);
    }
  };

  const loadBookmark = async (videoId: number) => {
    if (!user?.id) return;
    try {
      const result = await executeQuery(
        `SELECT id FROM bookmarks 
         WHERE user_id = ? AND subject_id = ? AND content_type = 'video' AND content_id = ?`,
        [user.id, subjectId, videoId]
      );
      setIsBookmarked(result.length > 0);
    } catch (error) {
      console.error('Error loading bookmark:', error);
    }
  };

  const toggleBookmark = async () => {
    if (!user?.id || !selectedVideo) return;
    try {
      if (isBookmarked) {
        await executeQuery(
          `DELETE FROM bookmarks 
           WHERE user_id = ? AND subject_id = ? AND content_type = 'video' AND content_id = ?`,
          [user.id, subjectId, selectedVideo.id]
        );
        setIsBookmarked(false);
      } else {
        await executeQuery(
          `INSERT INTO bookmarks (user_id, subject_id, content_type, content_id, timestamp)
           VALUES (?, ?, 'video', ?, ?)`,
          [user.id, subjectId, selectedVideo.id, currentPosition]
        );
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Bookmark error:', error);
    }
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded || !selectedVideo) return;
    
    const position = status.positionMillis;
    const duration = status.durationMillis || 0;
    
    setCurrentPosition(position);
    setCurrentDuration(duration);
    setIsPlaying(status.isPlaying);

    // Auto-save every 5 seconds
    const difference = Math.abs(position - lastSavedPosition.current);
    if (difference >= 5000) {
      lastSavedPosition.current = position;
      saveVideoProgress(selectedVideo.id, position, duration);
    }

    // Handle completion
    if (status.didJustFinish) {
      lastSavedPosition.current = duration;
      setResumePosition(0);
      saveVideoProgress(selectedVideo.id, duration, duration);
    }

    // Subtitle sync
    if (subtitlesEnabled && subtitles.length > 0) {
      const activeCue = subtitles.find(
        cue => position >= cue.startTime && position < cue.endTime
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
    } catch (error) {
      console.error('Playback speed error:', error);
    }
  };

  const resumePlayback = async () => {
    if (!videoRef.current || resumePosition === 0) return;
    try {
      await videoRef.current.setPositionAsync(resumePosition);
      await videoRef.current.playAsync();
      setIsPlaying(true);
      setResumePosition(0);
    } catch (error) {
      console.error('Resume playback error:', error);
    }
  };

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
          console.log('Subtitles loaded:', parsed.length);
        }
      }
    } catch (error) {
      console.error('Subtitle loading error:', error);
    }
  };

  const openLandscape = async () => {
    try {
      setShowSpeedOptions(false);
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      await videoRef.current?.presentFullscreenPlayer();
    } catch (error) {
      console.error('Landscape error:', error);
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading videos...</Text>
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedVideo.title_english}
          </Text>
          <TouchableOpacity onPress={toggleBookmark}>
            <Ionicons 
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'} 
              size={24} 
              color={isBookmarked ? COLORS.primary : '#94A3B8'} 
            />
          </TouchableOpacity>
        </View>

        {/* Video Player */}
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            key={selectedVideo.id}
            source={getVideoSource(selectedVideo.video_url)}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls={false}
            shouldPlay={false}
            positionMillis={resumePosition}
            rate={playbackRate}
            shouldCorrectPitch
            progressUpdateIntervalMillis={500}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onFullscreenUpdate={async ({ fullscreenUpdate }) => {
              if (fullscreenUpdate === 3) {
                try {
                  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
                } catch (error) {
                  console.error('Portrait orientation error:', error);
                }
              }
            }}
          />
          
          {/* Play/Pause Overlay */}
          <TouchableOpacity
            style={styles.playOverlay}
            onPress={togglePlayPause}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isPlaying ? 'pause-circle' : 'play-circle'}
              size={72}
              color="rgba(255,255,255,0.9)"
            />
          </TouchableOpacity>

          {/* Subtitle Overlay */}
          {subtitlesEnabled && currentSubtitle !== '' && (
            <View pointerEvents="none" style={styles.subtitleOverlay}>
              <Text style={styles.subtitleText}>{currentSubtitle}</Text>
            </View>
          )}
        </View>

        {/* Video Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              const newPosition = Math.max(0, currentPosition - 10000);
              handleSeek(newPosition);
            }}
          >
            <Ionicons name="play-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              const newPosition = Math.min(currentDuration, currentPosition + 10000);
              handleSeek(newPosition);
            }}
          >
            <Ionicons name="play-forward" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowSpeedOptions(!showSpeedOptions)}
          >
            <Text style={styles.speedText}>{playbackRate}x</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={openLandscape}
          >
            <Ionicons name="expand" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Speed Options */}
        {showSpeedOptions && (
          <View style={styles.speedMenu}>
            {playbackRates.map(rate => (
              <TouchableOpacity
                key={rate}
                style={[styles.speedOption, playbackRate === rate && styles.speedOptionActive]}
                onPress={() => changePlaybackRate(rate)}
              >
                <Text style={[styles.speedOptionText, playbackRate === rate && styles.speedOptionTextActive]}>
                  {rate}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(currentPosition)}</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${currentDuration > 0 ? (currentPosition / currentDuration) * 100 : 0}%` }
              ]} 
            />
          </View>
          <Text style={styles.timeText}>{formatTime(currentDuration)}</Text>
        </View>

        {/* Resume Button */}
        {resumePosition > 0 && (
          <TouchableOpacity style={styles.resumeButton} onPress={resumePlayback}>
            <Ionicons name="refresh" size={20} color={COLORS.white} />
            <Text style={styles.resumeButtonText}>Resume from {formatTime(resumePosition)}</Text>
          </TouchableOpacity>
        )}

        {/* Video Details */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle}>{selectedVideo.title_english}</Text>
          {selectedVideo.title_marathi && (
            <Text style={styles.videoMarathi}>{selectedVideo.title_marathi}</Text>
          )}
          {selectedVideo.description_english && (
            <Text style={styles.description}>{selectedVideo.description_english}</Text>
          )}
        </View>

        {/* More Videos */}
        {videos.length > 1 && (
          <View style={styles.otherSection}>
            <Text style={styles.sectionTitle}>More Videos</Text>
            {videos.filter(v => v.id !== selectedVideo.id).map(video => (
              <TouchableOpacity
                key={video.id}
                style={styles.otherVideoCard}
                onPress={() => {
                  setSelectedVideo(video);
                  setResumePosition(0);
                  setCurrentPosition(0);
                  setCurrentDuration(0);
                  setIsPlaying(false);
                  loadSubtitles(video.subtitle_url);
                  loadBookmark(video.id);
                }}
              >
                <View style={styles.smallPlayIcon}>
                  <Ionicons name="play-circle" size={28} color={COLORS.primary} />
                </View>
                <View style={styles.otherVideoInfo}>
                  <Text style={styles.otherVideoTitle}>{video.title_english}</Text>
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
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 12,
    marginRight: 12,
  },
  videoContainer: {
    width: '100%',
    backgroundColor: '#000000',
    position: 'relative',
    aspectRatio: 16 / 9,
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
    bottom: 60,
    alignItems: 'center',
  },
  subtitleText: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    color: '#FFFFFF',
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12,
  },
  controlButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  playButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: {
    color: '#35D878',
    fontSize: 16,
    fontWeight: '700',
  },
  speedMenu: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  speedOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  speedOptionActive: {
    backgroundColor: COLORS.primary,
  },
  speedOptionText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  speedOptionTextActive: {
    color: '#FFFFFF',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  timeText: {
    color: '#94A3B8',
    fontSize: 12,
    minWidth: 45,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  resumeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  videoInfo: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: COLORS.white,
    marginTop: 12,
    paddingBottom: 16,
  },
  videoTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
  },
  videoMarathi: {
    fontSize: 15,
    color: COLORS.primary,
    marginTop: 4,
  },
  description: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  otherSection: {
    paddingHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.white,
    paddingBottom: 16,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  otherVideoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
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
  otherVideoText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
});

export default VideoPlayerScreen;