import type { ExamAttempt, Submission } from '../types';

export interface ExamAttemptService {
  // Get user's attempts for a center
  getUserAttempts(centerId: string): Promise<ExamAttempt[]>;
  
  // Get all user's attempts (global)
  getAllUserAttempts(): Promise<ExamAttempt[]>;

  // Get specific attempt by ID
  getAttempt(attemptId: string): Promise<ExamAttempt | null>;
  
  // Get user's active attempt for a specific exam
  getActiveAttempt(centerId: string, examType: string): Promise<ExamAttempt | null>;

  // Start exam (begins 6-hour timer)
  startAttempt(attemptId: string): Promise<ExamAttempt>;

  // Submit exam answers
  submitAttempt(attemptId: string, answers: any, fullName: string): Promise<Submission>;
}

