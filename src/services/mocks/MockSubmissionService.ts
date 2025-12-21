import type { SubmissionService } from '../SubmissionService';
import type { Submission } from '../../types';
import { mockState } from './MockState';

export class MockSubmissionService implements SubmissionService {
  async submitTest(sessionId: string, fullName: string, answers: Record<string, any>): Promise<Submission> {
    const session = mockState.sessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Session not found');

    const submission: Submission = {
      id: Math.random().toString(36).substring(2),
      sessionId,
      fullName,
      answers,
      submittedAt: new Date().toISOString()
    };

    mockState.submissions.push(submission);
    session.status = 'submitted';
    session.submissionId = submission.id;

    return submission;
  }

  async getSubmissions(centerSlug: string): Promise<Submission[]> {
    const sessionIds = mockState.sessions
      .filter(s => s.centerSlug === centerSlug)
      .map(s => s.id);
    
    return mockState.submissions.filter(sub => sessionIds.includes(sub.sessionId));
  }
}

