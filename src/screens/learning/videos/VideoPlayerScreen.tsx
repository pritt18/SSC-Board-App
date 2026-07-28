import React, {
  useCallback,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AVPlaybackStatus,
  ResizeMode,
  Video,
} from 'expo-av';

import * as ScreenOrientation from 'expo-screen-orientation';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  COLORS,
} from '../../../constants/colors';

import {
  executeQuery,
} from '../../../database/database';

import {
  LearningStackParamList,
} from '../../../navigation/navigationTypes';

import {
  useAuth,
} from '../../../context/AuthContext';

import {
  videoAssets,
} from '../../../data/videoAssets';

import {
  subtitleAssets,
} from '../../../data/subtitleAssets';

import {
  parseSrt,
  SubtitleCue,
} from '../../../utils/subtitleParser';

type Props =
  NativeStackScreenProps<
    LearningStackParamList,
    'VideoPlayer'
  >;

interface VideoItem {
  id: number;
  subject_id: number;

  title_english: string;
  title_marathi:
    | string
    | null;

  description_english:
    | string
    | null;

  description_marathi:
    | string
    | null;

  video_url: string;

  subtitle_url:
    | string
    | null;

  video_duration:
    | number
    | null;

  sort_order: number;
}

interface WatchHistoryItem
  extends VideoItem {
  position_millis: number;
  duration_millis: number;
  is_completed: number;
}

const playbackRates = [
  0.5,
  1,
  1.5,
  2,
];

const VideoPlayerScreen:
React.FC<Props> = ({
  navigation,
  route,
}) => {
  const {
    subjectId,
  } = route.params;

  const {
    user,
  } = useAuth();

  const videoRef =
    useRef<Video>(
      null,
    );

  const lastSavedPosition =
    useRef(0);

  const [
    videos,
    setVideos,
  ] =
    useState<
      VideoItem[]
    >([]);

  const [
    selectedVideo,
    setSelectedVideo,
  ] =
    useState<
      VideoItem | null
    >(null);

  const [
    watchHistory,
    setWatchHistory,
  ] =
    useState<
      WatchHistoryItem[]
    >([]);

  const [
    resumePosition,
    setResumePosition,
  ] =
    useState(0);

  const [
    currentPosition,
    setCurrentPosition,
  ] =
    useState(0);

  const [
    currentDuration,
    setCurrentDuration,
  ] =
    useState(0);

  const [
    playbackRate,
    setPlaybackRate,
  ] =
    useState(1);

  const [
    showSpeedOptions,
    setShowSpeedOptions,
  ] =
    useState(false);

  const [
    subtitles,
    setSubtitles,
  ] =
    useState<
      SubtitleCue[]
    >([]);

  const [
    subtitlesEnabled,
    setSubtitlesEnabled,
  ] =
    useState(false);

  const [
    currentSubtitle,
    setCurrentSubtitle,
  ] =
    useState('');

  const [
    isBookmarked,
    setIsBookmarked,
  ] =
    useState(false);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  // =========================================
  // FORMAT TIME
  // =========================================

  const formatTime = (
    milliseconds: number,
  ) => {
    if (
      !milliseconds
    ) {
      return '00:00';
    }

    const totalSeconds =
      Math.floor(
        milliseconds /
          1000,
      );

    const minutes =
      Math.floor(
        totalSeconds /
          60,
      );

    const seconds =
      totalSeconds %
      60;

    return `${String(
      minutes,
    ).padStart(
      2,
      '0',
    )}:${String(
      seconds,
    ).padStart(
      2,
      '0',
    )}`;
  };

  // =========================================
  // GET OFFLINE VIDEO SOURCE
  // =========================================

  const getVideoSource = (
    videoUrl: string,
  ) => {
    const bundledVideo =
      videoAssets[
        videoUrl
      ];

    if (
      bundledVideo
    ) {
      return bundledVideo;
    }

    /*
     * Supports file:// paths
     * if local media is added
     * dynamically in the future.
     */
    return {
      uri: videoUrl,
    };
  };

  // =========================================
  // LOAD DYNAMIC OFFLINE SUBTITLE
  // =========================================

  const loadOfflineSubtitles =
    async (
      subtitleUrl:
        | string
        | null,
    ) => {
      setSubtitles(
        [],
      );

      setCurrentSubtitle(
        '',
      );

      setSubtitlesEnabled(
        false,
      );

      if (
        !subtitleUrl
      ) {
        console.log(
          'No subtitle configured for video',
        );

        return;
      }

      try {
        const subtitleModule =
          subtitleAssets[
            subtitleUrl
          ];

        /*
         * Bundled subtitle
         */
        if (
          subtitleModule
        ) {
          const asset =
            Asset.fromModule(
              subtitleModule,
            );

          await asset
            .downloadAsync();

          const uri =
            asset.localUri ||
            asset.uri;

          if (
            !uri
          ) {
            throw new Error(
              'Subtitle URI not available',
            );
          }

          const content =
            await FileSystem
              .readAsStringAsync(
                uri,
              );

          const parsed =
            parseSrt(
              content,
            );

          setSubtitles(
            parsed,
          );

          console.log(
            'Subtitle loaded:',
            subtitleUrl,
            parsed.length,
          );

          return;
        }

        /*
         * Future dynamic local
         * file:// subtitle support.
         */
        if (
          subtitleUrl.startsWith(
            'file://',
          )
        ) {
          const content =
            await FileSystem
              .readAsStringAsync(
                subtitleUrl,
              );

          const parsed =
            parseSrt(
              content,
            );

          setSubtitles(
            parsed,
          );

          return;
        }

        console.log(
          'Subtitle asset not found:',
          subtitleUrl,
        );
      } catch (
        error
      ) {
        console.error(
          'Subtitle loading error:',
          error,
        );

        setSubtitles(
          [],
        );

        setCurrentSubtitle(
          '',
        );

        setSubtitlesEnabled(
          false,
        );
      }
    };

  // =========================================
  // LOAD VIDEO PROGRESS
  // =========================================

  const loadVideoProgress =
    async (
      videoId: number,
    ) => {
      if (
        !user?.id
      ) {
        return 0;
      }

      try {
        const result =
          await executeQuery(
            `
            SELECT
              position_millis,
              duration_millis,
              is_completed

            FROM video_progress

            WHERE
              user_id = ?

              AND
              video_id = ?

            LIMIT 1
            `,
            [
              user.id,
              videoId,
            ],
          );

        if (
          result.length >
          0
        ) {
          const completed =
            Number(
              result[0]
                .is_completed,
            );

          if (
            completed ===
            1
          ) {
            return 0;
          }

          return (
            Number(
              result[0]
                .position_millis,
            ) || 0
          );
        }

        return 0;
      } catch (
        error
      ) {
        console.error(
          'Load video progress error:',
          error,
        );

        return 0;
      }
    };

  // =========================================
  // SAVE VIDEO PROGRESS
  // =========================================

  const saveVideoProgress =
    async (
      videoId: number,
      positionMillis: number,
      durationMillis: number,
      completed = false,
    ) => {
      if (
        !user?.id
      ) {
        return;
      }

      try {
        const isCompleted =
          completed ||
          (
            durationMillis >
              0 &&
            positionMillis >=
              durationMillis *
                0.95
          )
            ? 1
            : 0;

        await executeQuery(
          `
          INSERT INTO video_progress (
            user_id,
            video_id,
            position_millis,
            duration_millis,
            is_completed,
            last_watched_at
          )

          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            CURRENT_TIMESTAMP
          )

          ON CONFLICT (
            user_id,
            video_id
          )

          DO UPDATE SET

            position_millis =
              excluded.position_millis,

            duration_millis =
              excluded.duration_millis,

            is_completed =
              excluded.is_completed,

            last_watched_at =
              CURRENT_TIMESTAMP
          `,
          [
            user.id,
            videoId,
            positionMillis,
            durationMillis,
            isCompleted,
          ],
        );
      } catch (
        error
      ) {
        console.error(
          'Save video progress error:',
          error,
        );
      }
    };

  // =========================================
  // LOAD WATCH HISTORY
  // =========================================

  const loadWatchHistory =
    async () => {
      if (
        !user?.id
      ) {
        setWatchHistory(
          [],
        );

        return;
      }

      try {
        const result =
          await executeQuery(
            `
            SELECT

              v.id,
              v.subject_id,

              v.title_english,
              v.title_marathi,

              v.description_english,
              v.description_marathi,

              v.video_url,
              v.subtitle_url,

              v.video_duration,
              v.sort_order,

              vp.position_millis,
              vp.duration_millis,
              vp.is_completed

            FROM video_progress vp

            INNER JOIN videos v

              ON v.id =
                vp.video_id

            WHERE

              vp.user_id = ?

              AND

              v.subject_id = ?

            ORDER BY

              vp.last_watched_at
              DESC

            LIMIT 5
            `,
            [
              user.id,
              subjectId,
            ],
          );

        setWatchHistory(
          result as
            WatchHistoryItem[],
        );
      } catch (
        error
      ) {
        console.error(
          'Load watch history error:',
          error,
        );

        setWatchHistory(
          [],
        );
      }
    };

  // =========================================
  // LOAD BOOKMARK
  // =========================================

  const loadBookmark =
    async (
      videoId: number,
    ) => {
      if (
        !user?.id
      ) {
        setIsBookmarked(
          false,
        );

        return;
      }

      try {
        const result =
          await executeQuery(
            `
            SELECT id

            FROM bookmarks

            WHERE

              user_id = ?

              AND

              subject_id = ?

              AND

              content_type = 'video'

              AND

              content_id = ?

            LIMIT 1
            `,
            [
              user.id,
              subjectId,
              videoId,
            ],
          );

        setIsBookmarked(
          result.length >
            0,
        );
      } catch (
        error
      ) {
        console.error(
          'Load bookmark error:',
          error,
        );

        setIsBookmarked(
          false,
        );
      }
    };

  // =========================================
  // TOGGLE BOOKMARK
  // =========================================

  const toggleBookmark =
    async () => {
      if (
        !user?.id ||
        !selectedVideo
      ) {
        Alert.alert(
          'Login Required',
          'Please login to save bookmarks.',
        );

        return;
      }

      try {
        if (
          isBookmarked
        ) {
          await executeQuery(
            `
            DELETE FROM bookmarks

            WHERE

              user_id = ?

              AND

              subject_id = ?

              AND

              content_type = 'video'

              AND

              content_id = ?
            `,
            [
              user.id,
              subjectId,
              selectedVideo.id,
            ],
          );

          setIsBookmarked(
            false,
          );

          return;
        }

        await executeQuery(
          `
          INSERT INTO bookmarks (
            user_id,
            subject_id,
            content_type,
            content_id,
            timestamp
          )

          VALUES (
            ?,
            ?,
            'video',
            ?,
            ?
          )
          `,
          [
            user.id,
            subjectId,
            selectedVideo.id,
            currentPosition,
          ],
        );

        setIsBookmarked(
          true,
        );
      } catch (
        error
      ) {
        console.error(
          'Bookmark update error:',
          error,
        );

        Alert.alert(
          'Bookmark',
          'Unable to update bookmark.',
        );
      }
    };

  // =========================================
  // PREPARE SELECTED VIDEO
  // =========================================

  const prepareVideo =
    async (
      video: VideoItem,
    ) => {
      const savedPosition =
        await loadVideoProgress(
          video.id,
        );

      lastSavedPosition.current =
        savedPosition;

      setSelectedVideo(
        video,
      );

      setResumePosition(
        savedPosition,
      );

      setCurrentPosition(
        savedPosition,
      );

      setCurrentDuration(
        0,
      );

      setPlaybackRate(
        1,
      );

      setShowSpeedOptions(
        false,
      );

      await loadOfflineSubtitles(
        video.subtitle_url,
      );

      await loadBookmark(
        video.id,
      );
    };

  // =========================================
  // SELECT ANOTHER VIDEO
  // =========================================

  const handleVideoSelect =
    async (
      video: VideoItem,
    ) => {
      /*
       * Save current video before
       * switching to another one.
       */
      if (
        selectedVideo &&
        currentDuration >
          0
      ) {
        await saveVideoProgress(
          selectedVideo.id,
          currentPosition,
          currentDuration,
        );
      }

      await prepareVideo(
        video,
      );
    };

  // =========================================
  // LOAD VIDEOS
  // =========================================

  const loadVideos =
    async () => {
      try {
        setIsLoading(
          true,
        );

        const result =
          await executeQuery(
            `
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

            WHERE

              subject_id = ?

              AND

              is_active = 1

              AND

              video_url IS NOT NULL

              AND

              video_url != ''

            ORDER BY

              sort_order ASC,

              id ASC
            `,
            [
              subjectId,
            ],
          );

        const videoData =
          result as
            VideoItem[];

        setVideos(
          videoData,
        );

        if (
          videoData.length ===
          0
        ) {
          setSelectedVideo(
            null,
          );

          setWatchHistory(
            [],
          );

          return;
        }

        await prepareVideo(
          videoData[0],
        );

        await loadWatchHistory();
      } catch (
        error
      ) {
        console.error(
          'Load videos error:',
          error,
        );

        setVideos(
          [],
        );

        setSelectedVideo(
          null,
        );
      } finally {
        setIsLoading(
          false,
        );
      }
    };

  // =========================================
  // SCREEN FOCUS
  // =========================================

  useFocusEffect(
    useCallback(
      () => {
        loadVideos();

        return () => {
          ScreenOrientation
            .lockAsync(
              ScreenOrientation
                .OrientationLock
                .PORTRAIT_UP,
            )
            .catch(
              () => {},
            );
        };
      },
      [
        subjectId,
        user?.id,
      ],
    ),
  );

  // =========================================
  // PLAYBACK STATUS
  // =========================================

  const handlePlaybackStatusUpdate =
    (
      status:
        AVPlaybackStatus,
    ) => {
      if (
        !status.isLoaded ||
        !selectedVideo
      ) {
        return;
      }

      const position =
        status.positionMillis;

      const duration =
        status.durationMillis ||
        0;

      setCurrentPosition(
        position,
      );

      setCurrentDuration(
        duration,
      );

      // =====================================
      // SUBTITLE SYNC
      // =====================================

      if (
        subtitlesEnabled
      ) {
        const activeCue =
          subtitles.find(
            cue =>
              position >=
                cue.startTime &&
              position <
                cue.endTime,
          );

        setCurrentSubtitle(
          activeCue?.text ||
            '',
        );
      } else if (
        currentSubtitle
      ) {
        setCurrentSubtitle(
          '',
        );
      }

      // =====================================
      // VIDEO COMPLETED
      // =====================================

      if (
        status.didJustFinish
      ) {
        lastSavedPosition.current =
          duration;

        setResumePosition(
          0,
        );

        setCurrentSubtitle(
          '',
        );

        saveVideoProgress(
          selectedVideo.id,
          duration,
          duration,
          true,
        ).then(
          () =>
            loadWatchHistory(),
        );

        return;
      }

      // =====================================
      // AUTO SAVE EVERY 10 SECONDS
      // =====================================

      const difference =
        Math.abs(
          position -
            lastSavedPosition.current,
        );

      if (
        difference >=
        10000
      ) {
        lastSavedPosition.current =
          position;

        saveVideoProgress(
          selectedVideo.id,
          position,
          duration,
        );
      }
    };

  // =========================================
  // RESUME PLAYBACK
  // =========================================

  const resumePlayback =
    async () => {
      try {
        if (
          !videoRef.current
        ) {
          return;
        }

        await videoRef.current
          .setPositionAsync(
            resumePosition,
          );

        await videoRef.current
          .playAsync();
      } catch (
        error
      ) {
        console.error(
          'Resume playback error:',
          error,
        );
      }
    };

  // =========================================
  // PLAYBACK SPEED
  // =========================================

  const changePlaybackRate =
    async (
      rate: number,
    ) => {
      try {
        setPlaybackRate(
          rate,
        );

        setShowSpeedOptions(
          false,
        );

        await videoRef.current
          ?.setRateAsync(
            rate,
            true,
          );
      } catch (
        error
      ) {
        console.error(
          'Playback speed error:',
          error,
        );
      }
    };

  // =========================================
  // LANDSCAPE / FULLSCREEN
  // =========================================

      const openLandscape = async () => {
      try {
        setShowSpeedOptions(false);

        await ScreenOrientation.lockAsync(
          ScreenOrientation
            .OrientationLock
            .LANDSCAPE,
        );

        await videoRef.current
          ?.presentFullscreenPlayer();
      } catch (error) {
        console.error(
          'Landscape error:',
          error,
        );

        try {
          await ScreenOrientation.lockAsync(
            ScreenOrientation
              .OrientationLock
              .PORTRAIT_UP,
          );
        } catch (
          orientationError
        ) {
          console.error(
            'Orientation reset error:',
            orientationError,
          );
        }
      }
    };

  // =========================================
  // SUBTITLE
  // =========================================

  const toggleSubtitle =
    () => {
      if (
        subtitles.length ===
        0
      ) {
        Alert.alert(
          'Subtitle',
          'Subtitles are not available for this video.',
        );

        return;
      }

      setSubtitlesEnabled(
        previous => {
          const enabled =
            !previous;

          if (
            !enabled
          ) {
            setCurrentSubtitle(
              '',
            );
          }

          return enabled;
        },
      );
    };

  // =========================================
  // LOADING UI
  // =========================================

  if (
    isLoading
  ) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color={
            COLORS.primary
          }
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading video...
        </Text>
      </SafeAreaView>
    );
  }

  // =========================================
  // EMPTY UI
  // =========================================

  if (
    !selectedVideo
  ) {
    return (
      <SafeAreaView
        style={
          styles.emptyContainer
        }
      >
        <Text
          style={
            styles.emptyIcon
          }
        >
          🎬
        </Text>

        <Text
          style={
            styles.emptyTitle
          }
        >
          No Videos Available
        </Text>

        <Text
          style={
            styles.emptyText
          }
        >
          No video lessons have been added for this subject.
        </Text>

        <Pressable
          style={
            styles.backButton
          }
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            Go Back
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={
        styles.container
      }
      edges={[
        'top',
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        {/* ============================= */}
        {/* VIDEO */}
        {/* ============================= */}

        <View
          style={
            styles.videoContainer
          }
        >
          <Video
          ref={videoRef}
          key={selectedVideo.id}
          source={getVideoSource(
            selectedVideo.video_url,
          )}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
          shouldPlay={false}
          positionMillis={resumePosition}
          rate={playbackRate}
          shouldCorrectPitch
          progressUpdateIntervalMillis={500}
          onPlaybackStatusUpdate={
            handlePlaybackStatusUpdate
          }
          onFullscreenUpdate={async ({
            fullscreenUpdate,
          }) => {
            // 3 = fullscreen पूर्ण dismiss झाला
            if (fullscreenUpdate === 3) {
              try {
                await ScreenOrientation.lockAsync(
                  ScreenOrientation
                    .OrientationLock
                    .PORTRAIT_UP,
                );
              } catch (error) {
                console.error(
                  'Portrait orientation error:',
                  error,
                );
              }
            }
          }}
        />

          {/* SUBTITLE */}

          {subtitlesEnabled &&
            currentSubtitle !==
              '' && (
              <View
                pointerEvents="none"
                style={
                  styles.subtitleOverlay
                }
              >
                <Text
                  style={
                    styles.subtitleText
                  }
                >
                  {
                    currentSubtitle
                  }
                </Text>
              </View>
            )}
        </View>

        {/* ============================= */}
        {/* VIDEO CONTROLS */}
        {/* ============================= */}

        <View style={styles.toolbar}>
        {/* SPEED */}
        <View style={styles.toolItem}>
          <Pressable
            style={styles.toolButton}
            onPress={() =>
              setShowSpeedOptions(
                !showSpeedOptions,
              )
            }
          >
            <Text style={styles.speedText}>
              {playbackRate}x
            </Text>

            <Text
              style={styles.toolLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Speed
            </Text>
          </Pressable>

          {showSpeedOptions && (
            <View style={styles.speedMenu}>
              {[0.5, 1, 1.5, 2].map(
                speed => (
                  <Pressable
                    key={speed}
                    style={
                      styles.speedOption
                    }
                    onPress={() =>
                      changePlaybackRate(
                        speed,
                      )
                    }
                  >
                    <Text
                      style={
                        styles.speedOptionText
                      }
                    >
                      {speed}x
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
          )}
        </View>

        {/* SUBTITLE */}
        <View style={styles.toolItem}>
          <Pressable
            style={styles.toolButton}
            onPress={toggleSubtitle}
          >
            <Text
              style={[
                styles.toolIcon,
                subtitlesEnabled &&
                  styles.activeToolIcon,
              ]}
            >
              CC
            </Text>

            <Text
              style={styles.toolLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Subtitle
            </Text>
          </Pressable>
        </View>

        {/* LANDSCAPE */}
        <View style={styles.toolItem}>
          <Pressable
            style={styles.toolButton}
            onPress={openLandscape}
          >
            <Text style={styles.toolIcon}>
              ▣
            </Text>

            <Text
              style={styles.toolLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Landscape
            </Text>
          </Pressable>
        </View>

        {/* BOOKMARK */}
        <View style={styles.toolItem}>
          <Pressable
            style={styles.toolButton}
            onPress={toggleBookmark}
          >
            <Text
              style={[
                styles.toolIcon,
                isBookmarked &&
                  styles.bookmarkActive,
              ]}
            >
              ★
            </Text>

            <Text
              style={styles.toolLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Bookmark
            </Text>
          </Pressable>
        </View>
      </View>

        {/* ============================= */}
        {/* VIDEO DETAILS */}
        {/* ============================= */}

        <View
          style={
            styles.videoInformation
          }
        >
          <Text
            style={
              styles.videoTitle
            }
          >
            {
              selectedVideo
                .title_english
            }
          </Text>

          <View
            style={
              styles.metaRow
            }
          >
            {/*<Text style={styles.metaText}>
            ◷{' '}
            {formatTime(
              currentDuration > 0
                ? currentDuration
                : selectedVideo.video_duration
                  ? selectedVideo.video_duration * 1000
                  : 0,
            )}
          </Text>*/}

            <Text
              style={
                styles.offlineText
              }
            >
              ● Offline
            </Text>

            {currentDuration >
              0 &&
              currentPosition >=
                currentDuration *
                  0.95 && (
                <Text
                  style={
                    styles.completedText
                  }
                >
                  ✓ Completed
                </Text>
              )}
          </View>

          {selectedVideo
            .description_english && (
            <Text
              style={
                styles.description
              }
            >
              {
                selectedVideo
                  .description_english
              }
            </Text>
          )}
        </View>

        {/* ============================= */}
        {/* CONTINUE WATCHING */}
        {/* ============================= */}

        {resumePosition >
          0 && (
          <View
            style={
              styles.resumeCard
            }
          >
            <View
              style={
                styles.resumeInformation
              }
            >
              <Text
                style={
                  styles.resumeTitle
                }
              >
                Continue Watching
              </Text>

              <Text
                style={
                  styles.resumeDescription
                }
              >
                Continue from{' '}
                {formatTime(
                  resumePosition,
                )}
              </Text>
            </View>

            <Pressable
              style={
                styles.resumeButton
              }
              onPress={
                resumePlayback
              }
            >
              <Text
                style={
                  styles.resumeButtonText
                }
              >
                ▶ Resume
              </Text>
            </Pressable>
          </View>
        )}

        {/* ============================= */}
        {/* WATCH HISTORY */}
        {/* ============================= */}

        <View
          style={
            styles.historySection
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Watch History
          </Text>

          {watchHistory.length >
          0 ? (
            watchHistory.map(
              history => {
                const percentage =
                  history
                    .duration_millis >
                  0
                    ? Math.min(
                        100,
                        Math.round(
                          (
                            history
                              .position_millis /
                            history
                              .duration_millis
                          ) *
                            100,
                        ),
                      )
                    : 0;

                return (
                  <Pressable
                    key={
                      history.id
                    }
                    style={
                      styles.historyItem
                    }
                    onPress={() =>
                      handleVideoSelect(
                        history,
                      )
                    }
                  >
                    <View
                      style={
                        styles.historyThumbnail
                      }
                    >
                      <Text
                        style={
                          styles.historyPlayIcon
                        }
                      >
                        ▶
                      </Text>
                    </View>

                    <View
                      style={
                        styles.historyInfo
                      }
                    >
                      <Text
                        style={
                          styles.historyTitle
                        }
                        numberOfLines={
                          1
                        }
                      >
                        {
                          history
                            .title_english
                        }
                      </Text>

                      <Text
                        style={
                          styles.historyDuration
                        }
                      >
                        {formatTime(
                          history
                            .duration_millis,
                        )}
                      </Text>

                      <View
                        style={
                          styles.progressRow
                        }
                      >
                        <View
                          style={
                            styles.progressBackground
                          }
                        >
                          <View
                            style={[
                              styles.progressFill,

                              {
                                width:
                                  `${percentage}%`,
                              },
                            ]}
                          />
                        </View>

                        <Text
                          style={
                            styles.percentageText
                          }
                        >
                          {percentage}%
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              },
            )
          ) : (
            <Text
              style={
                styles.emptyHistory
              }
            >
              Start watching videos to see your history.
            </Text>
          )}
        </View>

        {/* ============================= */}
        {/* MORE VIDEOS */}
        {/* ============================= */}

        {videos.length >
          1 && (
          <View
            style={
              styles.otherSection
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              More Videos
            </Text>

            {videos
              .filter(
                video =>
                  video.id !==
                  selectedVideo.id,
              )
              .map(
                video => (
                  <Pressable
                    key={
                      video.id
                    }
                    style={
                      styles.otherVideoCard
                    }
                    onPress={() =>
                      handleVideoSelect(
                        video,
                      )
                    }
                  >
                    <View
                      style={
                        styles.smallPlayIcon
                      }
                    >
                      <Text>
                        ▶
                      </Text>
                    </View>

                    <View
                      style={
                        styles.otherVideoInfo
                      }
                    >
                      <Text
                        style={
                          styles.otherVideoTitle
                        }
                      >
                        {
                          video
                            .title_english
                        }
                      </Text>

                      <Text
                        style={
                          styles.otherVideoText
                        }
                        numberOfLines={
                          1
                        }
                      >
                        {video
                          .description_english ||
                          'Offline video lesson'}
                      </Text>
                    </View>
                  </Pressable>
                ),
              )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default VideoPlayerScreen;

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#FFFFFF',
    },

    content: {
      paddingBottom: 40,
    },

    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        '#FFFFFF',
    },

    loadingText: {
      marginTop: 12,
      color:
        COLORS.textSecondary,
    },

    videoContainer: {
      width: '100%',
      backgroundColor:
        '#000000',
      position: 'relative',
    },

    video: {
      width: '100%',
      height: 245,
      backgroundColor:
        '#000000',
    },

    subtitleOverlay: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 55,
      alignItems: 'center',
    },

    subtitleText: {
      backgroundColor:
        'rgba(77, 24, 24, 0.82)',
      color: '#FFFFFF',
      fontSize: 15,
      lineHeight: 21,
      textAlign: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 5,
    },

    toolbar: {
      flexDirection: 'row',
      width: '100%',
      backgroundColor: '#111111',
      paddingVertical: 12,
      paddingHorizontal: 4,
      alignItems: 'center',
    },

    toolItem: {
      width: '25%',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },

    toolButton: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 1,
    },

    toolIcon: {
      color: '#FFFFFF',
      fontSize: 28,
      fontWeight: '700',
      height: 34,
      textAlign: 'center',
    },

    activeToolIcon: {
      color: '#35D878',
    },

    bookmarkActive: {
      color: '#FFD21E',
    },

    speedText: {
      color: '#35D878',
      fontSize: 22,
      fontWeight: '700',
      height: 34,
      textAlign: 'center',
    },

    toolLabel: {
      width: '100%',
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
      textAlign: 'center',
    },

    speedMenu: {
      position: 'absolute',
      bottom: 65,
      left: 10,
      right: 10,
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      paddingVertical: 5,
      elevation: 10,
      zIndex: 999,
    },

    speedOption: {
      paddingVertical: 10,
      alignItems: 'center',
    },

    speedOptionText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#111827',
    },

    videoInformation: {
      paddingHorizontal: 16,
      paddingTop: 18,
    },

    videoTitle: {
      fontSize: 19,
      fontWeight: '700',
      color: '#111827',
    },

    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: 10,
      gap: 12,
    },

    metaText: {
      color: '#64748B',
      fontSize: 12,
    },

    offlineText: {
      color: '#2563EB',
      fontSize: 11,
      fontWeight: '600',
    },

    completedText: {
      color: '#16A34A',
      backgroundColor:
        '#DCFCE7',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      fontSize: 10,
      fontWeight: '600',
    },

    description: {
      color: '#475569',
      fontSize: 13,
      lineHeight: 20,
      marginTop: 15,
    },

    resumeCard: {
      marginHorizontal: 16,
      marginTop: 20,
      padding: 15,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        '#E2E8F0',
      backgroundColor:
        '#F8FAFC',
      flexDirection: 'row',
      alignItems: 'center',
    },

    resumeInformation: {
      flex: 1,
    },

    resumeTitle: {
      color: '#0F172A',
      fontSize: 13,
      fontWeight: '700',
    },

    resumeDescription: {
      color: '#64748B',
      fontSize: 11,
      marginTop: 4,
    },

    resumeButton: {
      backgroundColor:
        '#2563EB',
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 7,
    },

    resumeButtonText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },

    historySection: {
      paddingHorizontal: 16,
      marginTop: 28,
    },

    sectionTitle: {
      color: '#0F172A',
      fontSize: 17,
      fontWeight: '700',
      marginBottom: 14,
    },

    historyItem: {
      flexDirection: 'row',
      marginBottom: 15,
    },

    historyThumbnail: {
      width: 72,
      height: 48,
      backgroundColor:
        '#1E293B',
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },

    historyPlayIcon: {
      color: '#FFFFFF',
      fontSize: 17,
    },

    historyInfo: {
      flex: 1,
      marginLeft: 11,
    },

    historyTitle: {
      color: '#0F172A',
      fontSize: 12,
      fontWeight: '700',
    },

    historyDuration: {
      color: '#64748B',
      fontSize: 10,
      marginTop: 3,
    },

    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 7,
    },

    progressBackground: {
      flex: 1,
      height: 3,
      backgroundColor:
        '#E2E8F0',
      borderRadius: 3,
      overflow: 'hidden',
    },

    progressFill: {
      height: '100%',
      backgroundColor:
        '#2563EB',
    },

    percentageText: {
      width: 38,
      textAlign: 'right',
      color: '#64748B',
      fontSize: 9,
    },

    emptyHistory: {
      color: '#94A3B8',
      fontSize: 12,
      textAlign: 'center',
      paddingVertical: 20,
    },

    otherSection: {
      paddingHorizontal: 16,
      marginTop: 20,
    },

    otherVideoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor:
        '#E2E8F0',
      borderRadius: 12,
      padding: 10,
      marginTop: 12,
    },

    smallPlayIcon: {
      width: 45,
      height: 45,
      borderRadius: 10,
      backgroundColor:
        '#EFF6FF',
      alignItems: 'center',
      justifyContent: 'center',
    },

    otherVideoInfo: {
      flex: 1,
      marginLeft: 12,
    },

    otherVideoTitle: {
      color: '#0F172A',
      fontSize: 13,
      fontWeight: '700',
    },

    otherVideoText: {
      color: '#64748B',
      fontSize: 11,
      marginTop: 4,
    },

    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 30,
      backgroundColor:
        '#FFFFFF',
    },

    emptyIcon: {
      fontSize: 50,
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
      backgroundColor:
        '#2563EB',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
    },

    backButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
  });