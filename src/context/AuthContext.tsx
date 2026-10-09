import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Student, Staff, Driver, UserRole, PortalType } from '@/lib/types';

interface AuthState {
  role: UserRole | null;
  student: Student | null;
  staff: Staff | null;
  driver: Driver | null;
  portal: PortalType | null;
  hostelAuthenticated: boolean;
  transportAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  loginStudent: (student: Student) => void;
  loginStaff: (staff: Staff) => void;
  loginDriver: (driver: Driver) => void;
  setPortal: (portal: PortalType) => void;
  setHostelAuth: (value: boolean) => void;
  setTransportAuth: (value: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'shtms_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    role: null,
    student: null,
    staff: null,
    driver: null,
    portal: null,
    hostelAuthenticated: false,
    transportAuthenticated: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setState(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const updateState = (newState: Partial<AuthState>) => {
    setState(prev => {
      const merged = { ...prev, ...newState };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  const loginStudent = (student: Student) => {
    updateState({ role: 'student', student, staff: null, driver: null });
  };

  const loginStaff = (staff: Staff) => {
    updateState({ role: 'staff', staff, student: null, driver: null });
  };

  const loginDriver = (driver: Driver) => {
    updateState({ role: 'driver', driver, student: null, staff: null, portal: 'transport', transportAuthenticated: true });
  };

  const setPortal = (portal: PortalType) => {
    updateState({ portal });
  };

  const setHostelAuth = (value: boolean) => {
    updateState({ hostelAuthenticated: value });
  };

  const setTransportAuth = (value: boolean) => {
    updateState({ transportAuthenticated: value });
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      role: null,
      student: null,
      staff: null,
      driver: null,
      portal: null,
      hostelAuthenticated: false,
      transportAuthenticated: false,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        loginStudent,
        loginStaff,
        loginDriver,
        setPortal,
        setHostelAuth,
        setTransportAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
