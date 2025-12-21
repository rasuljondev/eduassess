import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TestSession } from '../types';

interface SessionState {
  currentSession: TestSession | null;
  setSession: (session: TestSession | null) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      currentSession: null,
      setSession: (session) => set({ currentSession: session }),
      clearSession: () => set({ currentSession: null }),
    }),
    {
      name: 'session-storage',
    }
  )
);

