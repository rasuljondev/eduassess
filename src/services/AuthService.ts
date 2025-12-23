import type { User } from '../types';

export interface AuthService {
  // Login with login (password optional - uses fixed password if not provided)
  login(login: string, password?: string): Promise<User>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
}

