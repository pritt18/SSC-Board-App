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
  SubjectList: { classId: number };
  ChapterList: { subjectId: number };
  ChapterDetail: { chapterId: number };
  VideoPlayer: { chapterId: number };
  PdfViewer: { chapterId: number };
  QuizList: { chapterId: number };
  QuizScreen: { quizId: number };
  QuizResult: { quizId: number; score: number; total: number };
  Games: { chapterId: number };
  Progress: undefined;
  Profile: undefined;
  Settings: undefined;
  TeacherDashboard: undefined;
  ParentDashboard: { studentId: number };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  LicenseActivation: undefined;
};

export type StudentTabParamList = {
  Dashboard: undefined;
  Learning: undefined;
  Progress: undefined;
  Games: undefined;
  Profile: undefined;
};

export type LearningStackParamList = {
  ClassList: undefined;
  SubjectList: { classId: number };
  ChapterList: { subjectId: number };
  ChapterDetail: { chapterId: number };
  VideoPlayer: { chapterId: number };
  PdfViewer: { chapterId: number };
  QuizList: { chapterId: number };
  QuizScreen: { quizId: number };
  QuizResult: { quizId: number; score: number; total: number };
};