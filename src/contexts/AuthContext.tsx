import { createContext } from 'react';
import { User } from '@/types';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (usuario: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  /** Recarga fila de `usuarios` (p. ej. tras cambiar permisos de edición en Nueva venta). */
  refreshUserProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
