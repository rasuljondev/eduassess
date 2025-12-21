import type { User } from '../types';

export interface AuthService {
  login(login: string, password: string): Promise<User>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
}

