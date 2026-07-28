export const migrations: string[] = [
  // -----------------------------------------
  // PERFORMANCE INDEXES
  // -----------------------------------------

  `CREATE INDEX IF NOT EXISTS idx_users_role
   ON users(role)`,

  `CREATE INDEX IF NOT EXISTS idx_users_class
   ON users(class_id)`,

  `CREATE INDEX IF NOT EXISTS idx_subjects_class
   ON subjects(class_id)`,

  `CREATE INDEX IF NOT EXISTS idx_videos_subject
   ON videos(subject_id)`,

  `CREATE INDEX IF NOT EXISTS idx_pdfs_subject
   ON pdfs(subject_id)`,

  `CREATE INDEX IF NOT EXISTS idx_notes_subject
   ON notes(subject_id)`,

  `CREATE INDEX IF NOT EXISTS idx_quizzes_subject
   ON quizzes(subject_id)`,

  `CREATE INDEX IF NOT EXISTS idx_progress_user
   ON progress(user_id)`,

  `CREATE INDEX IF NOT EXISTS idx_progress_subject
   ON progress(subject_id)`,

  `CREATE INDEX IF NOT EXISTS idx_video_progress_user
   ON video_progress(user_id)`,

  `CREATE INDEX IF NOT EXISTS idx_video_progress_video
   ON video_progress(video_id)`,

  `CREATE INDEX IF NOT EXISTS idx_video_progress_last_watched
   ON video_progress(last_watched_at)`,

  `CREATE INDEX IF NOT EXISTS idx_license_key
   ON licenses(license_key)`,

  `CREATE INDEX IF NOT EXISTS idx_license_user
   ON licenses(user_id)`,

  `CREATE INDEX IF NOT EXISTS idx_bookmarks_user
   ON bookmarks(user_id)`,

  `CREATE INDEX IF NOT EXISTS idx_bookmarks_subject
   ON bookmarks(subject_id)`,

  `CREATE INDEX IF NOT EXISTS idx_bookmarks_content
   ON bookmarks(content_type, content_id)`,

  `CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user
   ON quiz_attempts(user_id)`,

  `CREATE INDEX IF NOT EXISTS idx_notifications_user
   ON notifications(user_id)`,

  // -----------------------------------------
  // OFFLINE MEDIA CACHE
  // -----------------------------------------

  `CREATE TABLE IF NOT EXISTS media_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    content_id INTEGER NOT NULL,

    media_type TEXT NOT NULL
      CHECK(
        media_type IN (
          'video',
          'pdf',
          'notes',
          'subtitle'
        )
      ),

    file_path TEXT NOT NULL,
    file_size INTEGER,
    checksum TEXT,

    downloaded_at DATETIME
      DEFAULT CURRENT_TIMESTAMP,

    is_valid BOOLEAN DEFAULT 1,

    FOREIGN KEY (subject_id)
      REFERENCES subjects(id),

    UNIQUE(
      content_id,
      media_type
    )
  )`,

  `CREATE INDEX IF NOT EXISTS idx_media_cache_subject
   ON media_cache(subject_id)`,

  `CREATE INDEX IF NOT EXISTS idx_media_cache_content
   ON media_cache(content_id, media_type)`,

  // -----------------------------------------
  // USER PREFERENCES
  // -----------------------------------------

  `CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER NOT NULL,

    preferred_language TEXT
      CHECK(
        preferred_language IN (
          'english',
          'marathi'
        )
      ),

    theme TEXT DEFAULT 'light',

    font_size TEXT DEFAULT 'medium',

    auto_play_video BOOLEAN DEFAULT 1,

    download_on_wifi BOOLEAN DEFAULT 1,

    notifications_enabled BOOLEAN DEFAULT 1,

    updated_at DATETIME
      DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
      REFERENCES users(id),

    PRIMARY KEY (user_id)
  )`,
];