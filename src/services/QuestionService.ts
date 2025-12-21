import type { Question } from '../types';

export interface CreateQuestionData {
  questionText: string;
  expectedAnswer: string;
  orderNum?: number;
}

export interface UpdateQuestionData {
  questionText?: string;
  expectedAnswer?: string;
  orderNum?: number;
}

export interface QuestionService {
  addQuestion(testId: string, data: CreateQuestionData): Promise<Question>;
  getQuestions(testId: string): Promise<Question[]>;
  getQuestionById(questionId: string): Promise<Question | null>;
  updateQuestion(questionId: string, data: UpdateQuestionData): Promise<Question>;
  deleteQuestion(questionId: string): Promise<void>;
  reorderQuestions(testId: string, questionIds: string[]): Promise<void>;
}

