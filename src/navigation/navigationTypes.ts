// src/navigation/navigationTypes.ts

// ============================================================
// ROOT STACK
// ============================================================

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Splash: undefined;
  LanguageSelection: undefined;

  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  LicenseActivation: undefined;

  Dashboard: undefined;

  ClassList: undefined;

  SubjectList: {
    classId: number;
  };

  LearningContent: {
    subjectId: number;
  };

  VideoPlayer: {
    subjectId: number;
  };

  PdfViewer: {
    subjectId: number;
  };

  Notes: {
    subjectId: number;
  };

  QuizList: {
    subjectId: number;
  };

  QuizScreen: {
    quizId: number;
  };

  QuizResult: {
    quizId: number;
    score: number;
    total: number;
  };

  Games: {
    subjectId: number;
  };

  Progress: undefined;

  Profile: undefined;

  Settings: undefined;

  TeacherDashboard: undefined;

  ParentDashboard: {
    studentId: number;
  };
};


// ============================================================
// AUTH STACK
// ============================================================

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  LicenseActivation: undefined;
};


// ============================================================
// STUDENT BOTTOM TAB
// ============================================================

export type StudentTabParamList = {
  Dashboard: undefined;
  Learning: undefined;
  Progress: undefined;
  Games: undefined;
  Profile: undefined;
};


// ============================================================
// PARENT BOTTOM TAB
// ============================================================

export type ParentTabParamList = {
  ParentDashboard: undefined;
  ParentProgress: undefined;
  ParentQuizResults: undefined;
  ParentStudyTime: undefined;
  ParentNotifications: undefined;
};


// ============================================================
// TEACHER BOTTOM TAB
// ============================================================

export type TeacherTabParamList = {
  TeacherDashboard: undefined;
  TeacherQuizzesStack: undefined;
  TeacherAssignmentsStack: undefined;
  TeacherReports: undefined;
  TeacherNotifications: undefined;
};


// ============================================================
// TEACHER QUIZZES STACK
// ============================================================

export type TeacherQuizzesStackParamList = {
  TeacherQuizzes: undefined;
  TeacherCreateQuiz: undefined;
};


// ============================================================
// TEACHER ASSIGNMENTS STACK
// ============================================================

export type TeacherAssignmentsStackParamList = {
  TeacherAssignments: undefined;
  TeacherCreateAssignment: undefined;
};


// ============================================================
// DASHBOARD STACK
// ============================================================

export type DashboardStackParamList = {
  Dashboard: undefined;
  StudentAssignments: undefined;
  StudentNotifications: undefined;
};


// ============================================================
// GAMES STACK
// ============================================================

export type GamesStackParamList = {
  GamesHome: undefined;

  MemoryMatch:
    | {
        gameId?: number;
      }
    | undefined;

  Sudoku:
    | {
        gameId?: number;
      }
    | undefined;

  Crossword:
    | {
        gameId?: number;
      }
    | undefined;

  WordSearch:
    | {
        gameId?: number;
      }
    | undefined;

  MathGame:
    | {
        gameId?: number;
      }
    | undefined;

  ScienceQuiz:
    | {
        gameId?: number;
      }
    | undefined;

  GeographyPuzzle:
    | {
        gameId?: number;
      }
    | undefined;

  MatchThePair:
    | {
        gameId?: number;
      }
    | undefined;

  DragDrop:
    | {
        gameId?: number;
      }
    | undefined;
};


// ============================================================
// LEARNING STACK
// ============================================================

export type LearningStackParamList = {
  ClassList: undefined;

  LicenseActivation: {
    classId: number;
  };

  SubjectList: {
    classId: number;
  };

  LearningContent: {
    subjectId: number;
  };

  VideoPlayer: {
    subjectId: number;
  };

  PdfViewer: {
    subjectId: number;
  };

  Notes: {
    subjectId: number;
  };

  QuizList: {
    subjectId: number;
  };

  QuizScreen: {
    quizId: number;
  };

  QuizResult: {
    quizId: number;
    score: number;
    total: number;
  };

  PdfDisplay: {
    pdfId: number;
    pdfUrl: string;
    title: string;
  };
};