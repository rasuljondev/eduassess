import type { Test, TestType } from '../types';

export interface CreateTestData {
  name: string;
  examType: TestType;
  description?: string;
  durationMinutes: number;
}

export interface UpdateTestData {
  name?: string;
  description?: string;
  durationMinutes?: number;
}

export interface TestService {
  createTest(centerId: string, data: CreateTestData): Promise<Test>;
  getTests(centerId: string, examType?: TestType): Promise<Test[]>;
  getTestById(testId: string): Promise<Test | null>;
  updateTest(testId: string, data: UpdateTestData): Promise<Test>;
  deleteTest(testId: string): Promise<void>;
}

