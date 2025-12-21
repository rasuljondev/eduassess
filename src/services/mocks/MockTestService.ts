import type { TestService, CreateTestData, UpdateTestData } from '../TestService';
import type { Test } from '../../types';

// Mock in-memory storage
const mockTests: Test[] = [];

export class MockTestService implements TestService {
  async createTest(centerId: string, data: CreateTestData): Promise<Test> {
    const test: Test = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      centerId,
      name: data.name,
      examType: data.examType,
      description: data.description,
      durationMinutes: data.durationMinutes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    mockTests.push(test);
    return test;
  }

  async getTests(centerId: string, examType?: string): Promise<Test[]> {
    let filtered = mockTests.filter(t => t.centerId === centerId);
    if (examType) {
      filtered = filtered.filter(t => t.examType === examType);
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getTestById(testId: string): Promise<Test | null> {
    return mockTests.find(t => t.id === testId) || null;
  }

  async updateTest(testId: string, data: UpdateTestData): Promise<Test> {
    const test = mockTests.find(t => t.id === testId);
    if (!test) throw new Error('Test not found');
    
    if (data.name !== undefined) test.name = data.name;
    if (data.description !== undefined) test.description = data.description;
    if (data.durationMinutes !== undefined) test.durationMinutes = data.durationMinutes;
    test.updatedAt = new Date().toISOString();
    
    return test;
  }

  async deleteTest(testId: string): Promise<void> {
    const index = mockTests.findIndex(t => t.id === testId);
    if (index === -1) throw new Error('Test not found');
    mockTests.splice(index, 1);
  }
}

