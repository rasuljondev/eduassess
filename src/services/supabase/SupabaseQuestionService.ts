import type { QuestionService, CreateQuestionData, UpdateQuestionData } from '../QuestionService';
import type { Question } from '../../types';
import { supabase } from '../../lib/supabase';

export class SupabaseQuestionService implements QuestionService {
  async addQuestion(testId: string, data: CreateQuestionData): Promise<Question> {
    // If orderNum not provided, get the count of existing questions
    let orderNum = data.orderNum;
    if (orderNum === undefined) {
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', testId);
      
      orderNum = count || 0;
    }

    const { data: inserted, error } = await supabase
      .from('questions')
      .insert({
        test_id: testId,
        question_text: data.questionText,
        expected_answer: data.expectedAnswer,
        order_num: orderNum,
      })
      .select('*')
      .single();

    if (error || !inserted) {
      throw new Error(error?.message || 'Failed to add question');
    }

    return this.mapToQuestion(inserted);
  }

  async getQuestions(testId: string): Promise<Question[]> {
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', testId)
      .order('order_num', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Failed to load questions');
    }

    return (questions || []).map(q => this.mapToQuestion(q));
  }

  async getQuestionById(questionId: string): Promise<Question | null> {
    const { data: question, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (error || !question) {
      return null;
    }

    return this.mapToQuestion(question);
  }

  async updateQuestion(questionId: string, data: UpdateQuestionData): Promise<Question> {
    const updateData: any = {};

    if (data.questionText !== undefined) updateData.question_text = data.questionText;
    if (data.expectedAnswer !== undefined) updateData.expected_answer = data.expectedAnswer;
    if (data.orderNum !== undefined) updateData.order_num = data.orderNum;

    const { data: updated, error } = await supabase
      .from('questions')
      .update(updateData)
      .eq('id', questionId)
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to update question');
    }

    return this.mapToQuestion(updated);
  }

  async deleteQuestion(questionId: string): Promise<void> {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      throw new Error(error.message || 'Failed to delete question');
    }
  }

  async reorderQuestions(testId: string, questionIds: string[]): Promise<void> {
    // Update order_num for each question
    const updates = questionIds.map((id, index) => ({
      id,
      order_num: index,
    }));

    for (const update of updates) {
      await supabase
        .from('questions')
        .update({ order_num: update.order_num })
        .eq('id', update.id);
    }
  }

  private mapToQuestion(row: any): Question {
    return {
      id: row.id,
      testId: row.test_id,
      questionText: row.question_text,
      expectedAnswer: row.expected_answer,
      orderNum: row.order_num,
      createdAt: row.created_at,
    };
  }
}

