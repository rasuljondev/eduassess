import type { TestService, CreateTestData, UpdateTestData } from '../TestService';
import type { Test, TestType } from '../../types';
import { supabase } from '../../lib/supabase';

export class SupabaseTestService implements TestService {
  async createTest(centerId: string, data: CreateTestData): Promise<Test> {
    // Get center ID by slug (centerId is actually centerSlug in current implementation)
    const { data: center, error: centerErr } = await supabase
      .from('centers')
      .select('id')
      .eq('slug', centerId)
      .single();

    if (centerErr || !center) {
      throw new Error('Center not found');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: inserted, error: insertErr } = await supabase
      .from('tests')
      .insert({
        center_id: center.id,
        name: data.name,
        exam_type: data.examType.toLowerCase(),
        description: data.description,
        duration_minutes: data.durationMinutes,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (insertErr || !inserted) {
      throw new Error(insertErr?.message || 'Failed to create test');
    }

    return this.mapToTest(inserted, centerId);
  }

  async getTests(centerId: string, examType?: TestType): Promise<Test[]> {
    // Get center ID by slug
    const { data: center, error: centerErr } = await supabase
      .from('centers')
      .select('id')
      .eq('slug', centerId)
      .single();

    if (centerErr || !center) {
      return [];
    }

    let query = supabase
      .from('tests')
      .select('*')
      .eq('center_id', center.id)
      .order('created_at', { ascending: false });

    if (examType) {
      const normalizedType = examType.toLowerCase();
      query = query.eq('exam_type', normalizedType);
    }

    const { data: tests, error } = await query;

    if (error || !tests || tests.length === 0) {
      return [];
    }

    return tests.map(t => this.mapToTest(t, centerId));
  }

  async getTestById(testId: string): Promise<Test | null> {
    const { data: test, error } = await supabase
      .from('tests')
      .select('*, centers(slug)')
      .eq('id', testId)
      .single();

    if (error || !test) {
      return null;
    }

    const centerSlug = (test as any).centers?.slug || '';
    return this.mapToTest(test, centerSlug);
  }

  async updateTest(testId: string, data: UpdateTestData): Promise<Test> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.durationMinutes !== undefined) updateData.duration_minutes = data.durationMinutes;

    const { data: updated, error } = await supabase
      .from('tests')
      .update(updateData)
      .eq('id', testId)
      .select('*, centers(slug)')
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to update test');
    }

    const centerSlug = (updated as any).centers?.slug || '';
    return this.mapToTest(updated, centerSlug);
  }

  async deleteTest(testId: string): Promise<void> {
    const { error } = await supabase
      .from('tests')
      .delete()
      .eq('id', testId);

    if (error) {
      throw new Error(error.message || 'Failed to delete test');
    }
  }

  private mapToTest(row: any, centerSlug: string): Test {
    return {
      id: row.id,
      centerId: centerSlug,
      name: row.name,
      examType: row.exam_type.toUpperCase() as TestType,
      description: row.description,
      durationMinutes: row.duration_minutes,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

