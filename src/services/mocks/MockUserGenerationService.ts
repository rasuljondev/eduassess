import type { UserGenerationService } from '../UserGenerationService';
import type { TestType, TestSession } from '../../types';
import { mockState } from './MockState';

export class MockUserGenerationService implements UserGenerationService {
  async generateUsers(centerSlug: string, testType: TestType, testName: string, count: number): Promise<TestSession[]> {
    const newSessions: TestSession[] = [];
    const center = mockState.centers.find(c => c.slug === centerSlug);

    for (let i = 0; i < count; i++) {
      const login = `${centerSlug}_${testType.toLowerCase()}_${Math.random().toString(36).substring(2, 7)}`;
      // Generate a simple password (8 characters, alphanumeric)
      const password = Math.random().toString(36).substring(2, 10);
      const session: TestSession = {
        id: Math.random().toString(36).substring(2),
        centerSlug,
        testType,
        testName,
        login,
        password,
        startAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        status: 'unused'
      };
      newSessions.push(session);
      mockState.sessions.push(session);
    }

    // Trigger notification
    mockState.addNotification({
      id: Math.random().toString(36).substring(2),
      centerName: center?.name || centerSlug,
      message: `Generated ${count} ${testType} users for ${testName}`,
      timestamp: new Date().toISOString()
    });

    return newSessions;
  }

  async getGeneratedUsers(centerSlug: string): Promise<TestSession[]> {
    return mockState.sessions.filter(s => s.centerSlug === centerSlug);
  }
}

