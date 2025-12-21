import type { Submission, SubmissionWithDetails } from '../types';

export interface SubmitTestData {
  testId?: string;
  answers: Record<string, any>;
  phoneNumber?: string;
}

export interface SubmissionService {
  submitTest(sessionId: string, fullName: string, data: SubmitTestData): Promise<Submission>;
  getSubmissions(centerSlug: string): Promise<Submission[]>;
  markSubmissionAsGraded(submissionId: string): Promise<void>;
  getSubmissionsWithDetails(centerId: string): Promise<SubmissionWithDetails[]>;
}

