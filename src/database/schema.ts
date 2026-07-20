export const schema: string[] = [
  // Users Table
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'parent', 'student', 'distributor')),
    medium TEXT CHECK(medium IN ('marathi', 'english')),
    class_id INTEGER,
    device_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (class_id) REFERENCES classes(id)
  )`,

  // Classes Table
  `CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_number INTEGER UNIQUE NOT NULL CHECK(class_number BETWEEN 1 AND 10),
    name_english TEXT NOT NULL,
    name_marathi TEXT NOT NULL,
    description_english TEXT,
    description_marathi TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Subjects Table
  `CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    name_english TEXT NOT NULL,
    name_marathi TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    UNIQUE(class_id, name_english)
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
    video_url TEXT,
    video_duration INTEGER,
    pdf_url TEXT,
    notes_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    UNIQUE(subject_id, chapter_number)
  )`,

  // Quizzes Table
  `CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER NOT NULL,
    title_english TEXT NOT NULL,
    title_marathi TEXT NOT NULL,
    description_english TEXT,
    description_marathi TEXT,
    type TEXT CHECK(type IN ('chapter_quiz', 'practice_mcq', 'mock_test', 'previous_paper')),
    total_questions INTEGER DEFAULT 0,
    time_limit INTEGER,
    passing_percentage INTEGER DEFAULT 40,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
  )`,

  // Progress Table
  `CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    chapter_id INTEGER NOT NULL,
    video_watched BOOLEAN DEFAULT 0,
    video_watch_time INTEGER DEFAULT 0, -- in seconds
    pdf_viewed BOOLEAN DEFAULT 0,
    quiz_completed BOOLEAN DEFAULT 0,
    quiz_score INTEGER DEFAULT 0,
    quiz_attempts INTEGER DEFAULT 0,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id),
    UNIQUE(user_id, chapter_id)
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
    time_taken INTEGER, -- in seconds
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
  )`,

  // Licenses Table
  `CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_key TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    class_id INTEGER NOT NULL,
    device_id TEXT,
    activated_at DATETIME,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (class_id) REFERENCES classes(id)
  )`,

  // Bookmarks Table
  `CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    chapter_id INTEGER NOT NULL,
    content_type TEXT CHECK(content_type IN ('video', 'pdf', 'quiz', 'game')),
    timestamp INTEGER, -- for video bookmarks in seconds
    page_number INTEGER, -- for PDF bookmarks
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id),
    UNIQUE(user_id, chapter_id, content_type)
  )`,

  // Games Table
  `CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER NOT NULL,
    title_english TEXT NOT NULL,
    title_marathi TEXT NOT NULL,
    type TEXT CHECK(type IN ('crossword', 'memory_match', 'word_search', 'sudoku', 'math_game', 'science_quiz', 'geography_puzzle', 'drag_drop', 'match_pair')),
    config TEXT, -- JSON configuration
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id)
  )`,

  // Notifications Table
  `CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title_english TEXT NOT NULL,
    title_marathi TEXT NOT NULL,
    message_english TEXT NOT NULL,
    message_marathi TEXT NOT NULL,
    type TEXT CHECK(type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`
];