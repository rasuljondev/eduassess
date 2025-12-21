// Supabase services
import { SupabaseAuthService } from './supabase/SupabaseAuthService';
import { SupabaseCenterService } from './supabase/SupabaseCenterService';
import { SupabaseUserGenerationService } from './supabase/SupabaseUserGenerationService';
import { SupabaseAnalyticsService } from './supabase/SupabaseAnalyticsService';
import { SupabaseSubmissionService } from './supabase/SupabaseSubmissionService';

// Mock services (for features not yet implemented with Supabase)
import { MockUserGenerationService } from './mocks/MockUserGenerationService';
import { MockSubmissionService } from './mocks/MockSubmissionService';
import { MockAnalyticsService } from './mocks/MockAnalyticsService';
import { MockNotificationService } from './mocks/MockNotificationService';
import { MockTestService } from './mocks/MockTestService';
import { MockQuestionService } from './mocks/MockQuestionService';

// Supabase Test and Question services
import { SupabaseTestService } from './supabase/SupabaseTestService';
import { SupabaseQuestionService } from './supabase/SupabaseQuestionService';
import { SupabaseScoreService } from './supabase/SupabaseScoreService';

// Use Supabase for auth, centers, and user generation; mocks for the rest
export const authService = new SupabaseAuthService();
export const centerService = new SupabaseCenterService();

// Use Supabase user generation if service role key is available, otherwise use mock
const useSupabaseUserGeneration = !!import.meta.env.VITE_SUPABASE_ROLE_KEY;
export const userGenerationService = useSupabaseUserGeneration
  ? new SupabaseUserGenerationService()
  : new MockUserGenerationService();

export const submissionService = new SupabaseSubmissionService();
export const analyticsService = new SupabaseAnalyticsService();
export const notificationService = new MockNotificationService();

// Test and Question services (using Supabase)
export const testService = new SupabaseTestService();
export const questionService = new SupabaseQuestionService();
export const scoreService = new SupabaseScoreService();

