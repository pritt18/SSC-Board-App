// src/database/migrations.ts
export const migrations: string[] = [
  // ============================================
  // NOTE: This file previously force-DROPped and recreated the users,
  // pdfs, videos, quizzes, chapters, games, questions, video_progress,
  // quiz_attempts, bookmarks, and progress tables on EVERY app launch.
  // That wiped all admin-created content and all student progress every
  // time the app was fully restarted. It has been removed — the
  // CREATE TABLE IF NOT EXISTS statements below are safe no-ops for
  // tables that already exist. Any new columns are added via the
  // defensive ALTER TABLE statements near the end of this file.
  // ============================================

  // ============================================
  // RECREATE TABLES WITH CORRECT SCHEMA
  // ============================================
  
  // Users Table (with permissions column)
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'parent', 'student', 'distributor')),
    medium TEXT CHECK(medium IN ('marathi', 'english')),
    class_id INTEGER,
    parent_id INTEGER,
    device_id TEXT,
    permissions TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    is_approved BOOLEAN DEFAULT 1,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (parent_id) REFERENCES users(id)
  )`,

  // Chapters Table
  `CREATE TABLE IF NOT EXISTS chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    chapter_number INTEGER NOT NULL,
    name_english TEXT NOT NULL,
    name_marathi TEXT NOT NULL,
    description_english TEXT,
    description_marathi TEXT,
    notes_url TEXT,
    sort_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
  )`,

  // Videos Table (with chapter_id)
  `CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    chapter_id INTEGER,
    title_english TEXT NOT NULL,
    title_marathi TEXT,
    description_english TEXT,
    description_marathi TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    subtitle_url TEXT,
    video_duration INTEGER,
    sort_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id)
  )`,

  // PDFs Table (with chapter_id and total_pages)
  `CREATE TABLE IF NOT EXISTS pdfs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    chapter_id INTEGER,
    title_english TEXT NOT NULL,
    title_marathi TEXT,
    description_english TEXT,
    description_marathi TEXT,
    pdf_url TEXT NOT NULL,
    thumbnail_url TEXT,
    medium TEXT DEFAULT 'both',
    total_pages INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id)
  )`,

  // Quizzes Table (with chapter_id)
  `CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    chapter_id INTEGER,
    title_english TEXT NOT NULL,
    title_marathi TEXT NOT NULL,
    description_english TEXT,
    description_marathi TEXT,
    type TEXT CHECK(type IN ('chapter_quiz', 'practice_mcq', 'mock_test', 'previous_paper')),
    total_questions INTEGER DEFAULT 0,
    time_limit INTEGER DEFAULT 5,
    passing_percentage INTEGER DEFAULT 40,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id)
  )`,

  // Questions Table
  `CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    question_text_english TEXT NOT NULL,
    question_text_marathi TEXT NOT NULL,
    option_a_english TEXT NOT NULL,
    option_a_marathi TEXT NOT NULL,
    option_b_english TEXT NOT NULL,
    option_b_marathi TEXT NOT NULL,
    option_c_english TEXT,
    option_c_marathi TEXT,
    option_d_english TEXT,
    option_d_marathi TEXT,
    correct_answer TEXT NOT NULL CHECK(correct_answer IN ('a', 'b', 'c', 'd')),
    explanation_english TEXT,
    explanation_marathi TEXT,
    difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')),
    sort_order INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
  )`,

  // Video Progress Table
  `CREATE TABLE IF NOT EXISTS video_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    video_id INTEGER NOT NULL,
    position_millis INTEGER DEFAULT 0,
    duration_millis INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT 0,
    last_watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    UNIQUE(user_id, video_id)
  )`,

  // Quiz Attempts Table
  `CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    quiz_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    wrong_answers INTEGER NOT NULL,
    time_taken INTEGER,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
  )`,

  // Progress Table
  `CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    video_watched BOOLEAN DEFAULT 0,
    video_watch_time INTEGER DEFAULT 0,
    pdf_viewed BOOLEAN DEFAULT 0,
    quiz_completed BOOLEAN DEFAULT 0,
    quiz_score INTEGER DEFAULT 0,
    quiz_attempts INTEGER DEFAULT 0,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    UNIQUE(user_id, subject_id)
  )`,

  // Bookmarks Table
  `CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    content_type TEXT CHECK(content_type IN ('video', 'pdf', 'quiz', 'chapter')),
    content_id INTEGER,
    timestamp INTEGER,
    page_number INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
  )`,

  // Games Table
  `CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    chapter_id INTEGER,
    title_english TEXT NOT NULL,
    title_marathi TEXT NOT NULL,
    type TEXT CHECK(type IN ('crossword', 'memory_match', 'word_search', 'math_game', 'sudoku')),
    config TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id)
  )`,

  // Performance Indexes
  `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
  `CREATE INDEX IF NOT EXISTS idx_users_class ON users(class_id)`,
  `CREATE INDEX IF NOT EXISTS idx_subjects_class ON subjects(class_id)`,
  `CREATE INDEX IF NOT EXISTS idx_videos_subject ON videos(subject_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pdfs_subject ON pdfs(subject_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON quizzes(subject_id)`,
  `CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_progress_subject ON progress(subject_id)`,
  `CREATE INDEX IF NOT EXISTS idx_video_progress_user ON video_progress(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_video_progress_video ON video_progress(video_id)`,
  `CREATE INDEX IF NOT EXISTS idx_license_key ON licenses(license_key)`,
  `CREATE INDEX IF NOT EXISTS idx_license_user ON licenses(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookmarks_subject ON bookmarks(subject_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id)`,
  `CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_id)`,

  // Defensive: ensure parent_id exists even if a future change stops
  // dropping/recreating the users table above.
  `ALTER TABLE users ADD COLUMN parent_id INTEGER REFERENCES users(id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_parent ON users(parent_id)`,

  // Defensive: ensure medium exists on pdfs even if a future change stops
  // dropping/recreating the pdfs table above.
  `ALTER TABLE pdfs ADD COLUMN medium TEXT DEFAULT 'both'`,
  `CREATE INDEX IF NOT EXISTS idx_pdfs_medium ON pdfs(medium)`,

  // Defensive: ensure medium exists on videos
  `ALTER TABLE videos ADD COLUMN medium TEXT DEFAULT 'both'`,
  `CREATE INDEX IF NOT EXISTS idx_videos_medium ON videos(medium)`,


  // ============================================
  // DEFENSIVE / SELF-HEALING COLUMN CHECKS
  // ============================================
  // On some platforms (specifically the experimental web/WASM SQLite
  // build) a "users" table can already exist in persisted browser
  // storage from an early test run, created BEFORE some of the columns
  // above existed. Because CREATE TABLE IF NOT EXISTS is a no-op on an
  // existing table, that stale table never picks up new columns on its
  // own. These ALTER TABLE statements each safely fail (and are
  // skipped) if the column is already present, so they're safe to run
  // on every launch, on every platform.
  `ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT 'user'`,
  `ALTER TABLE users ADD COLUMN device_id TEXT`,
  `ALTER TABLE users ADD COLUMN medium TEXT`,
  `ALTER TABLE users ADD COLUMN class_id INTEGER`,
  `ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1`,
  `ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT 1`,
  `ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`,
];
