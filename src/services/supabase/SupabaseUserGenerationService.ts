import type { UserGenerationService } from '../UserGenerationService';
import type { TestType, TestSession } from '../../types';
import { supabase } from '../../lib/supabase';

export class SupabaseUserGenerationService implements UserGenerationService {
  async generateUsers(
    centerSlug: string,
    testType: TestType,
    testName: string,
    count: number
  ): Promise<TestSession[]> {
    const { data, error } = await supabase.functions.invoke('generate-students', {
      body: {
        center_slug: centerSlug,
        test_type: testType.toLowerCase(),
        test_name: testName,
        count,
      },
    });

    if (error) {
      throw new Error(error.message || 'Generation failed');
    }

    const users = (data?.users ?? []) as Array<{ login: string; password: string; expiresAt: string }>;
    const nowIso = new Date().toISOString();

    return users.map((u) => ({
      id: u.login, // placeholder; real id will be loaded from DB
      centerSlug: data.center_slug || centerSlug,
      testType,
      testName,
      login: u.login,
      password: u.password,
      startAt: nowIso,
      expiresAt: u.expiresAt,
      status: 'unused',
    }));
  }

  async getGeneratedUsers(centerSlug: string): Promise<TestSession[]> {
    // Get center ID
    const { data: center, error: centerError } = await supabase
      .from('centers')
      .select('id')
      .eq('slug', centerSlug)
      .single();

    if (centerError || !center) {
      return [];
    }

    // Get generated students for this center
    const { data: students, error } = await supabase
      .from('generated_students')
      .select(`
        id,
        login,
        exam,
        test_name,
        plain_password,
        status,
        created_at,
        student_access (
          expires_at
        )
      `)
      .eq('center_id', center.id)
      .order('created_at', { ascending: false });

    if (error || !students) {
      return [];
    }

    // Convert to TestSession format
    return students.map((student: any) => {
      const access = Array.isArray(student.student_access) 
        ? student.student_access[0] 
        : student.student_access;
      
      // Check if expired (6 hours after creation)
      const createdAt = new Date(student.created_at);
      const expiresAt = new Date(createdAt.getTime() + 6 * 60 * 60 * 1000);
      const now = new Date();
      const isExpired = now > expiresAt;

      return {
        id: student.id,
        centerSlug,
        testType: student.exam.toUpperCase() as TestType,
        testName: student.test_name || 'N/A',
        login: student.login,
        password: student.plain_password || undefined,
        startAt: student.created_at,
        expiresAt: access?.expires_at || expiresAt.toISOString(),
        status: isExpired ? 'expired' : (student.status as any),
      };
    });
  }
}

