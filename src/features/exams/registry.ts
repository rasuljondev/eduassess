import React from 'react';
import type { TestType } from '../../types';

export interface ExamDefinition {
  id: TestType;
  name: string;
  renderTestShell: () => React.ReactNode;
}

const exams: Record<TestType, ExamDefinition> = {
  IELTS: {
    id: 'IELTS',
    name: 'IELTS (International English Language Testing System)',
    renderTestShell: () => null, // Placeholder
  },
  SAT: {
    id: 'SAT',
    name: 'SAT (Scholastic Aptitude Test)',
    renderTestShell: () => null, // Placeholder
  },
  APTIS: {
    id: 'APTIS',
    name: 'APTIS English Test',
    renderTestShell: () => null, // Placeholder
  },
  MULTI_LEVEL: {
    id: 'MULTI_LEVEL',
    name: 'CEFR Multi-level English Test',
    renderTestShell: () => null, // Placeholder
  },
};

export const getExamById = (id: TestType) => exams[id];
export const getAllExams = () => Object.values(exams);

