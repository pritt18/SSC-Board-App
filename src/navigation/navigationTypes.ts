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

export type ParentTabParamList = {
  ParentDashboard: undefined;
  ParentProgress: undefined;
  ParentQuizResults: undefined;
  ParentStudyTime: undefined;
  ParentNotifications: undefined;
};

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

  PdfDisplay: { pdfId: number; pdfUrl: string; title: string };

  
};