import type { GlobalUser, ExamAttempt } from '../types';

export interface GlobalUserService {
  // Register new user (via website)
  register(data: {
    surname: string;
    name: string;
    phone_number: string;
  }): Promise<{ login: string; password: string }>;

  // Get current user info
  getCurrentUser(): Promise<GlobalUser | null>;

  // Get user's exam history (all attempts across all centers)
  getUserExamHistory(userId: string): Promise<ExamAttempt[]>;
  
  // Get user by auth_user_id
  getUserByAuthId(authUserId: string): Promise<GlobalUser | null>;
  
  // Admin: List all users (for superadmin)
  listAllUsers(limit?: number, offset?: number): Promise<{ users: GlobalUser[]; total: number }>;
  
  // Admin: Delete user (cascades to related data)
  deleteUser(userId: string): Promise<void>;
}

