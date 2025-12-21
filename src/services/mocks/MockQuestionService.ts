import type { QuestionService, CreateQuestionData, UpdateQuestionData } from '../QuestionService';
import type { Question } from '../../types';

// Mock in-memory storage
const mockQuestions: Question[] = [];

export class MockQuestionService implements QuestionService {
  async addQuestion(testId: string, data: CreateQuestionData): Promise<Question> {
    const existingQuestions = mockQuestions.filter(q => q.testId === testId);
    const orderNum = data.orderNum !== undefined ? data.orderNum : existingQuestions.length;
    
    const question: Question = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      testId,
      questionText: data.questionText,
      expectedAnswer: data.expectedAnswer,
      orderNum,
      createdAt: new Date().toISOString(),
    };
    
    mockQuestions.push(question);
    return question;
  }

  async getQuestions(testId: string): Promise<Question[]> {
    return mockQuestions
      .filter(q => q.testId === testId)
      .sort((a, b) => a.orderNum - b.orderNum);
  }

  async getQuestionById(questionId: string): Promise<Question | null> {
    return mockQuestions.find(q => q.id === questionId) || null;
  }

  async updateQuestion(questionId: string, data: UpdateQuestionData): Promise<Question> {
    const question = mockQuestions.find(q => q.id === questionId);
    if (!question) throw new Error('Question not found');
    
    if (data.questionText !== undefined) question.questionText = data.questionText;
    if (data.expectedAnswer !== undefined) question.expectedAnswer = data.expectedAnswer;
    if (data.orderNum !== undefined) question.orderNum = data.orderNum;
    
    return question;
  }

  async deleteQuestion(questionId: string): Promise<void> {
    const index = mockQuestions.findIndex(q => q.id === questionId);
    if (index === -1) throw new Error('Question not found');
    mockQuestions.splice(index, 1);
  }

  async reorderQuestions(testId: string, questionIds: string[]): Promise<void> {
    const questions = mockQuestions.filter(q => q.testId === testId);
    questionIds.forEach((id, index) => {
      const question = questions.find(q => q.id === id);
      if (question) {
        question.orderNum = index;
      }
    });
  }
}

