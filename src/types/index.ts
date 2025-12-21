export type TestType = 'IELTS' | 'SAT' | 'APTIS' | 'MULTI_LEVEL';

export type UserRole = 'STUDENT' | 'CENTER_ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  login: string;
  role: UserRole;
  centerSlug?: string;
  testType?: TestType;
  fullName?: string;
}

export interface TestSession {
  id: string;
  centerSlug: string;
  testType: TestType;
  testName?: string; // Optional test name/identifier
  login: string;
  password?: string; // Password for the test taker
  startAt: string; // ISO date
  expiresAt: string; // ISO date
  submissionId?: string;
  status: 'unused' | 'in-progress' | 'submitted' | 'expired';
}

export interface Center {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
}

export interface Submission {
  id: string;
  sessionId: string;
  fullName: string;
  answers: Record<string, any>;
  submittedAt: string;
}

export interface GenerationEvent {
  id: string;
  centerSlug: string;
  testType: TestType;
  timestamp: string;
  count: number;
}

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  centerName: string;
}

export interface CenterAnalytics {
  centerSlug: string;
  centerName: string;
  generatedToday: number;
  generatedTotal: number;
  takenToday?: number;
  takenTotal?: number;
  notUsedToday?: number; // expired without being taken
  notUsedTotal?: number;
  dailyHistory?: number[]; // generated last 7 days
  totalHistory?: number[]; // generated cumulative last 7 days
  takenDailyHistory?: number[]; // taken last 7 days
  takenTotalHistory?: number[]; // taken cumulative last 7 days
  notUsedDailyHistory?: number[]; // not used (expired) last 7 days
  notUsedTotalHistory?: number[]; // not used cumulative last 7 days
}

export interface CenterAdmin {
  id: string;
  email: string;
  fullName?: string;
  centerId: string;
}

export interface Test {
  id: string;
  centerId: string;
  name: string;
  examType: TestType;
  description?: string;
  durationMinutes: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  testId: string;
  questionText: string;
  expectedAnswer: string;
  orderNum: number;
  createdAt?: string;
}

export interface SubmissionWithDetails extends Submission {
  phoneNumber?: string;
  testId?: string;
  testName?: string;
  isGraded: boolean;
  gradedAt?: string;
  gradedBy?: string;
}

export interface Score {
  submissionId: string;
  centerId: string;
  exam: TestType;
  autoScore?: Record<string, any>;
  manualScore?: Record<string, any>;
  finalScore: Record<string, any>;
  isPublished: boolean;
  publishedAt?: string;
  updatedAt: string;
}
