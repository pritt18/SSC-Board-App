export const schema: string[] = [
  // Classes Table
  `CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_number INTEGER UNIQUE NOT NULL
      CHECK(class_number BETWEEN 1 AND 10),
    name_english TEXT NOT NULL,
    name_marathi TEXT NOT NULL,
    description_english TEXT,
    description_marathi TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Users Table
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL
      CHECK(role IN (
        'admin',
        'teacher',
        'parent',
        'student',
        'distributor'
      )),
    medium TEXT
      CHECK(medium IN ('marathi', 'english')),
    class_id INTEGER,
    device_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (class_id) REFERENCES classes(id)
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

  // Videos Table
`CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL,
  title_english TEXT NOT NULL,
  title_marathi TEXT,
  description_english TEXT,
  description_marathi TEXT,
  video_url TEXT NOT NULL,
  subtitle_url TEXT,
  video_duration INTEGER,
  sort_order INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
)`,

  // Video Progress Table
  // Used for Resume Playback,
  // Continue Watching and Watch History
  `CREATE TABLE IF NOT EXISTS video_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    video_id INTEGER NOT NULL,
    position_millis INTEGER DEFAULT 0,
    duration_millis INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT 0,
    last_watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (video_id) REFERENCES videos(id),
    UNIQUE(user_id, video_id)
  )`,

  // PDFs Table
  `CREATE TABLE IF NOT EXISTS pdfs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    title_english TEXT NOT NULL,
    title_marathi TEXT,
    description_english TEXT,
    description_marathi TEXT,
    pdf_url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
  )`,

  // Notes Table
  `CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    title_english TEXT NOT NULL,
    title_marathi TEXT,
    content_english TEXT,
    content_marathi TEXT,
    sort_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
  )`,

  // Quizzes Table
  `CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    title_english TEXT NOT NULL,
    title_marathi TEXT NOT NULL,
    description_english TEXT,
    description_marathi TEXT,
    type TEXT CHECK(type IN (
      'chapter_quiz',
      'practice_mcq',
      'mock_test',
      'previous_paper'
    )),
    total_questions INTEGER DEFAULT 0,
    time_limit INTEGER,
    passing_percentage INTEGER DEFAULT 40,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
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
    correct_answer TEXT NOT NULL
      CHECK(correct_answer IN ('a', 'b', 'c', 'd')),
    explanation_english TEXT,
    explanation_marathi TEXT,
    difficulty TEXT
      CHECK(difficulty IN ('easy', 'medium', 'hard')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
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
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    UNIQUE(user_id, subject_id)
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
    subject_id INTEGER NOT NULL,
    content_type TEXT CHECK(content_type IN (
      'video',
      'pdf',
      'quiz',
      'game',
      'note',
      'puzzle',
      'assignment'
    )),
    content_id INTEGER,
    timestamp INTEGER,
    page_number INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
  )`,

  // Games Table
  `CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    title_english TEXT NOT NULL,
    title_marathi TEXT NOT NULL,
    type TEXT CHECK(type IN (
      'crossword',
      'memory_match',
      'word_search',
      'sudoku',
      'math_game',
      'science_quiz',
      'geography_puzzle',
      'drag_drop',
      'match_pair'
    )),
    config TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
  )`,

  // Puzzles Table
  `CREATE TABLE IF NOT EXISTS puzzles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    title_english TEXT NOT NULL,
    title_marathi TEXT,
    type TEXT NOT NULL,
    config TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
  )`,

  // Assignments Table
  `CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    title_english TEXT NOT NULL,
    title_marathi TEXT,
    description_english TEXT,
    description_marathi TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
  )`,

  // Notifications Table
  `CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title_english TEXT NOT NULL,
    title_marathi TEXT NOT NULL,
    message_english TEXT NOT NULL,
    message_marathi TEXT NOT NULL,
    type TEXT CHECK(type IN (
      'info',
      'success',
      'warning',
      'error'
    )),
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
];