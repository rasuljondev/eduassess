import type { TestType, TestSession } from '../types';

export interface UserGenerationService {
  generateUsers(centerSlug: string, testType: TestType, testName: string, count: number): Promise<TestSession[]>;
  getGeneratedUsers(centerSlug: string): Promise<TestSession[]>;
}

