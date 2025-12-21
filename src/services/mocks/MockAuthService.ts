import type { AuthService } from '../AuthService';
import type { User } from '../../types';
import { mockState } from './MockState';

export class MockAuthService implements AuthService {
  async login(login: string, password: string): Promise<User> {
    // Check if it's a generated student session
    const session = mockState.sessions.find(s => s.login === login);
    if (session) {
      if (session.status === 'expired') {
        throw new Error('Session expired');
      }
      
      // Update session to in-progress if unused
      if (session.status === 'unused') {
        session.status = 'in-progress';
      }

      return {
        id: session.id,
        login: session.login,
        role: 'STUDENT',
        centerSlug: session.centerSlug,
        testType: session.testType
      };
    }

    // Check predefined users
    const user = mockState.users.find(u => u.login === login);
    if (user && password === 'admin') { // Hardcoded password for mock admins
      return user;
    }

    throw new Error('Invalid credentials');
  }

  async logout(): Promise<void> {
    return Promise.resolve();
  }

  async getCurrentUser(): Promise<User | null> {
    return null;
  }
}

