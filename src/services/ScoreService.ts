import type { Score } from '../types';

export interface ScoreData {
  manualScore?: Record<string, any>;
  finalScore: Record<string, any>;
  isPublished?: boolean;
}

export interface ScoreService {
  saveScore(submissionId: string, scoreData: ScoreData): Promise<Score>;
  getScore(submissionId: string): Promise<Score | null>;
  getScoreByLogin(login: string): Promise<Score | null>;
}

