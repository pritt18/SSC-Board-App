export const migrations: string[] = [
  // Migration 1: Add indexes for performance
  `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
  `CREATE INDEX IF NOT EXISTS idx_users_class ON users(class_id)`,
  `CREATE INDEX IF NOT EXISTS idx_subjects_class ON subjects(class_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chapters_subject ON chapters(subject_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quizzes_chapter ON quizzes(chapter_id)`,
  `CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_progress_chapter ON progress(chapter_id)`,
  `CREATE INDEX IF NOT EXISTS idx_license_key ON licenses(license_key)`,
  `CREATE INDEX IF NOT EXISTS idx_license_user ON licenses(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`,

  // Migration 2: Add media metadata table for offline content
  `CREATE TABLE IF NOT EXISTS media_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER NOT NULL,
    media_type TEXT CHECK(media_type IN ('video', 'pdf', 'notes')),
    file_path TEXT NOT NULL,
    file_size INTEGER,
    checksum TEXT,
    downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_valid BOOLEAN DEFAULT 1,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id),
    UNIQUE(chapter_id, media_type)
  )`,

  // Migration 3: Add user preferences table
  `CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER NOT NULL,
    preferred_language TEXT CHECK(preferred_language IN ('english', 'marathi')),
    theme TEXT DEFAULT 'light',
    font_size TEXT DEFAULT 'medium',
    auto_play_video BOOLEAN DEFAULT 1,
    download_on_wifi BOOLEAN DEFAULT 1,
    notifications_enabled BOOLEAN DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    PRIMARY KEY (user_id)
  )`,
];