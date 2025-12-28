import { useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import { AuthContext, AuthContextType } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Cargar sesión al iniciar
  useEffect(() => {
    let mounted = true;
    let loginResolve: ((session: any) => void) | null = null;

    const loadSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Error al obtener sesión:', error);
          setLoading(false);
          return;
        }

        if (session) {
          await loadUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error al cargar sesión:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSession();

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      // Ignorar el evento INITIAL_SESSION ya que lo manejamos en loadSession
      if (event === 'INITIAL_SESSION') {
        return;
      }
      
      // Ignorar TOKEN_REFRESHED - no necesitamos recargar el perfil
      if (event === 'TOKEN_REFRESHED') {
        return;
      }
      
      // Si estamos en proceso de login y se dispara SIGNED_IN, resolver la promesa del login
      if (event === 'SIGNED_IN' && session && isLoggingIn && loginResolve) {
        loginResolve(session);
        loginResolve = null;
        return; // No cargar perfil aquí, el login lo hará
      }
      
      // Si estamos en proceso de login, no hacer nada aquí (el login manejará el perfil)
      if (event === 'SIGNED_IN' && isLoggingIn) {
        return;
      }
      
      // Solo manejar SIGNED_OUT explícitamente
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Para otros eventos con sesión, solo recargar si no hay usuario cargado
      if (session && event === 'SIGNED_IN') {
        // Solo recargar si no tenemos usuario o si el ID cambió
        if (!user || user.id !== session.user.id) {
          try {
            await loadUserProfile(session.user.id, false);
          } catch (error) {
            // Silenciar errores durante carga automática de sesión
            // No cerrar sesión si hay un error al cargar el perfil
            console.error('Error al recargar perfil:', error);
          }
        }
      }
    });

    // Exponer loginResolve para que login pueda usarlo
    (window as any).__loginResolve = (resolve: (session: any) => void) => {
      loginResolve = resolve;
    };

    return () => {
      mounted = false;
      subscription.unsubscribe();
      (window as any).__loginResolve = null;
    };
  }, [isLoggingIn]);

  const loadUserProfile = async (userId: string, fromLogin = false) => {
    try {
      const queryPromise = supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();
      
      // Timeout de 15 segundos para la consulta (aumentado para conexiones lentas)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: La consulta tardó más de 15 segundos')), 15000);
      });
      
      const { data, error } = await Promise.race([
        queryPromise,
        timeoutPromise,
      ]) as any;

      if (error) {
        // Solo mostrar error si es un login activo, no durante carga automática
        if (fromLogin) {
          console.error('Error al cargar perfil:', error);
        }
        setUser(null);
        if (!fromLogin) {
          setLoading(false);
        }
        // Solo lanzar error si es un login activo
        if (fromLogin) {
          throw new Error('Error al cargar el perfil del usuario');
        }
        return;
      }

      if (!data) {
        // Solo mostrar error si es un login activo
        if (fromLogin) {
          console.error('No se encontraron datos del usuario');
        }
        setUser(null);
        if (!fromLogin) {
          setLoading(false);
        }
        // Solo lanzar error si es un login activo
        if (fromLogin) {
          throw new Error('No se encontraron datos del usuario');
        }
        return;
      }

      const userData = data as {
        id: string;
        nombre: string;
        usuario: string;
        rol: 'admin' | 'vendedor';
        estado: 'activo' | 'inactivo';
        fecha_creacion: string;
      };

      if (userData.estado === 'activo') {
        setUser({
          id: userData.id,
          nombre: userData.nombre,
          usuario: userData.usuario,
          rol: userData.rol as UserRole,
          estado: userData.estado as 'activo' | 'inactivo',
          fecha_creacion: userData.fecha_creacion,
        });
        if (!fromLogin) {
          setLoading(false);
        }
      } else {
        setUser(null);
        if (!fromLogin) {
          setLoading(false);
        }
        // Solo lanzar error si es un login activo
        if (fromLogin) {
          throw new Error('Tu cuenta está inactiva. Contacta al administrador.');
        }
      }
    } catch (error: any) {
      // Solo mostrar/loggear error si es un login activo
      if (fromLogin) {
        console.error('Error al cargar perfil:', error.message);
        setUser(null);
        throw error;
      } else {
        // Durante carga automática, solo silenciar el error
        setUser(null);
        setLoading(false);
      }
    }
  };

  const login = async (usuario: string, password: string): Promise<boolean> => {
    setLoading(true);
    setIsLoggingIn(true);
    
    try {
      let email = usuario;

      // Si no es un email, buscar el email por username
      if (!usuario.includes('@')) {
        const { data: userEmail, error: rpcError } = await (supabase.rpc as any)(
          'get_user_email_by_username',
          { username_param: usuario }
        );

        if (rpcError || !userEmail) {
          setLoading(false);
          setIsLoggingIn(false);
          throw new Error('Usuario no encontrado. Verifica tu nombre de usuario.');
        }

        email = userEmail;
      }

      // Verificar que el cliente esté listo
      if (!supabase) {
        throw new Error('Cliente de Supabase no inicializado');
      }

      // Crear una promesa que se resolverá cuando onAuthStateChange detecte SIGNED_IN
      const sessionPromise = new Promise<any>((resolve, reject) => {
        // Configurar el resolve en window para que onAuthStateChange pueda usarlo
        (window as any).__loginResolve = (session: any) => {
          resolve({ data: { session }, error: null });
        };
        
        // Timeout de 10 segundos
        setTimeout(() => {
          if ((window as any).__loginResolve) {
            (window as any).__loginResolve = null;
            reject(new Error('Timeout: La autenticación tardó más de 10 segundos'));
          }
        }, 10000);
      });
      
      // Llamar a signInWithPassword
      const signInPromise = supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      
      // Esperar a que onAuthStateChange resuelva O que signInWithPassword complete
      let authData: any;
      let authError: any;
      
      try {
        const result = await Promise.race([
          sessionPromise, // onAuthStateChange resolverá esto
          signInPromise,  // O signInWithPassword completará
        ]) as any;
        
        authData = result.data;
        authError = result.error;
        
        // Limpiar
        (window as any).__loginResolve = null;
      } catch (err: any) {
        // Limpiar
        (window as any).__loginResolve = null;
        
        // Intentar obtener sesión como último recurso
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          authData = { session };
          authError = null;
        } else {
          throw new Error(`Error de autenticación: ${err.message || 'No se pudo autenticar'}`);
        }
      }

      if (authError) {
        setLoading(false);
        setIsLoggingIn(false);
        
        if (authError.message.includes('Invalid login credentials') || authError.message.includes('Invalid credentials')) {
          throw new Error('Credenciales incorrectas. Verifica tu usuario y contraseña.');
        } else if (authError.message.includes('Email not confirmed')) {
          throw new Error('Por favor confirma tu email antes de iniciar sesión');
        } else {
          throw new Error(authError.message || 'Error al autenticarse');
        }
      }

      if (!authData?.session) {
        setLoading(false);
        setIsLoggingIn(false);
        throw new Error('No se pudo crear la sesión. Intenta nuevamente.');
      }
      
      // Cargar perfil del usuario
      try {
        await loadUserProfile(authData.session.user.id, true);
        setLoading(false);
        setIsLoggingIn(false);
        return true;
      } catch (profileError: any) {
        // Cerrar sesión si no se puede cargar el perfil
        await supabase.auth.signOut();
        setLoading(false);
        setIsLoggingIn(false);
        throw profileError;
      }
    } catch (error: any) {
      setLoading(false);
      setIsLoggingIn(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

