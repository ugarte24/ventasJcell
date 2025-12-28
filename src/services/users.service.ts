import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO } from '@/lib/utils';

export interface CreateUserData {
  nombre: string;
  usuario: string;
  email: string;
  password: string;
  rol: 'admin' | 'vendedor';
  estado?: 'activo' | 'inactivo';
}

export interface UpdateUserData {
  nombre?: string;
  usuario?: string;
  email?: string;
  rol?: 'admin' | 'vendedor';
  estado?: 'activo' | 'inactivo';
}

export const usersService = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (error) throw new Error(handleSupabaseError(error));
    
    // Nota: Los emails están en auth.users y requieren Admin API para obtenerlos
    // Por ahora retornamos los usuarios sin email, el email se puede obtener
    // individualmente cuando se necesita editar un usuario específico
    return data as User[];
  },

  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }
    
    // Intentar obtener email
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Si es el usuario actual, obtener su email de la sesión
      if (currentUser && currentUser.id === id && currentUser.email) {
        return { ...data, email: currentUser.email } as User;
      }
      
      // Si el usuario actual es admin, intentar obtener email usando Edge Function
      if (currentUser) {
        const { data: currentUserData } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', currentUser.id)
          .single();
        
        if (currentUserData?.rol === 'admin') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            try {
              const { data: functionData, error: functionError } = await supabase.functions.invoke('get-user-email', {
                body: { userId: id },
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              });
              
              if (!functionError && functionData?.email) {
                return { ...data, email: functionData.email } as User;
              }
            } catch (err) {
              // Si la Edge Function no existe o falla, continuar sin email
              console.warn(`No se pudo obtener email para usuario ${id}:`, err);
            }
          }
        }
      }
    } catch (err) {
      // Si no se puede obtener el email, continuar sin él
      console.warn(`No se pudo obtener email para usuario ${id}:`, err);
    }
    
    return data as User;
  },

  async search(query: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .or(`nombre.ilike.%${query}%,usuario.ilike.%${query}%`)
      .order('nombre');

    if (error) throw new Error(handleSupabaseError(error));
    return data as User[];
  },

  async create(userData: CreateUserData): Promise<User> {
    try {
      // Verificar que el usuario actual sea administrador
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('No estás autenticado. Por favor inicia sesión.');
      }

      // Verificar el rol del usuario actual usando limit(1) para evitar errores 406
      const { data: currentUserData, error: roleError } = await supabase
        .from('usuarios')
        .select('rol, estado')
        .eq('id', currentUser.id)
        .limit(1);

      if (roleError) {
        console.error('❌ Error al verificar rol:', roleError);
        throw new Error(`No se pudo verificar tu rol: ${roleError.message}`);
      }

      if (!currentUserData || currentUserData.length === 0) {
        throw new Error('Usuario no encontrado en el sistema. Por favor inicia sesión nuevamente.');
      }

      const currentUserInfo = currentUserData[0];
      if (currentUserInfo.estado !== 'activo' || currentUserInfo.rol !== 'admin') {
        throw new Error('Solo los administradores activos pueden crear usuarios.');
      }

      // Verificar que el usuario no exista
      const { data: existingUser, error: checkError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('usuario', userData.usuario)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error al verificar usuario existente:', checkError);
        throw new Error(`Error al verificar usuario: ${handleSupabaseError(checkError)}`);
      }

      if (existingUser) {
        throw new Error('El nombre de usuario ya existe');
      }

      // Usar Edge Function para crear el usuario (usa Admin API)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No tienes una sesión activa. Por favor inicia sesión nuevamente.');
      }

      // Obtener fecha y hora local del cliente
      const fechaCreacion = getLocalDateTimeISO();
      
      // Llamar a la Edge Function
      const { data: functionData, error: functionError } = await supabase.functions.invoke('create-user', {
        body: {
          nombre: userData.nombre,
          usuario: userData.usuario,
          email: userData.email,
          password: userData.password,
          rol: userData.rol,
          estado: userData.estado || 'activo',
          fecha_creacion: fechaCreacion, // Fecha explícita en hora local
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (functionError) {
        console.error('❌ Error al llamar Edge Function:', functionError);
        throw new Error(functionError.message || 'Error al crear usuario');
      }

      if (!functionData || !functionData.success) {
        const errorMessage = functionData?.error || 'No se pudo crear el usuario';
        throw new Error(errorMessage);
      }

      return functionData.user as User;
    } catch (error: any) {
      console.error('Error completo en create user:', error);
      throw error;
    }
  },

  async update(id: string, updates: UpdateUserData): Promise<User> {
    // Obtener timestamp de actualización en hora local
    const updatedAt = getLocalDateTimeISO();
    
    // Separar email de otros campos (el email se actualiza en auth.users)
    const { email, ...otherUpdates } = updates;
    
    // Verificar que el usuario actual tenga permisos
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      throw new Error('No estás autenticado. Por favor inicia sesión.');
    }

    // Obtener rol del usuario actual
    const { data: currentUserData } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', currentUser.id)
      .single();

    const isAdmin = currentUserData?.rol === 'admin';
    const isOwnUser = currentUser.id === id;

    // Actualizar tabla usuarios
    const { data, error } = await supabase
      .from('usuarios')
      .update({
        ...otherUpdates,
        updated_at: updatedAt, // Timestamp explícito en hora local
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    // Si hay email para actualizar
    if (email && email.trim() !== '') {
      try {
        // Si es el usuario actual, usar auth.updateUser directamente
        if (isOwnUser) {
          const { error: authError } = await supabase.auth.updateUser({ email: email.trim() });
          if (authError) {
            throw new Error(`Error al actualizar email: ${authError.message}`);
          }
        }
        // Si es admin, usar Edge Function para actualizar email de cualquier usuario
        else if (isAdmin) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data: functionData, error: functionError } = await supabase.functions.invoke('update-user-email', {
              body: {
                userId: id,
                email: email.trim(),
              },
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });

            if (functionError) {
              throw new Error(`Error al actualizar email: ${functionError.message || 'La Edge Function update-user-email no está disponible'}`);
            }
          } else {
            throw new Error('No tienes una sesión activa. Por favor inicia sesión nuevamente.');
          }
        }
        // Si no es admin ni el usuario actual, no permitir actualizar email
        else {
          throw new Error('No tienes permisos para actualizar el email de otro usuario. Solo los administradores pueden hacerlo.');
        }
      } catch (err: any) {
        // Si el error es sobre permisos, lanzarlo
        if (err.message?.includes('permisos') || err.message?.includes('permissions')) {
          throw err;
        }
        // Para otros errores, solo mostrar warning pero no bloquear la actualización de otros campos
        console.warn('Error al actualizar email:', err);
        throw new Error(`Error al actualizar email: ${err.message || 'Error desconocido'}`);
      }
    }

    return data as User;
  },

  async updatePassword(id: string, newPassword: string): Promise<void> {
    // Nota: Actualizar contraseña de otro usuario requiere Admin API
    // Por ahora, solo permitimos actualizar la contraseña del usuario actual
    // Para actualizar otros usuarios, necesitas usar Edge Functions o Admin API
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id !== id) {
      throw new Error('Solo puedes actualizar tu propia contraseña. Para actualizar otros usuarios, usa el dashboard de Supabase.');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(`Error al actualizar contraseña: ${error.message}`);
    }
  },

  async toggleStatus(id: string): Promise<User> {
    // Obtener el estado actual
    const current = await this.getById(id);
    if (!current) {
      throw new Error('Usuario no encontrado');
    }

    const newStatus = current.estado === 'activo' ? 'inactivo' : 'activo';
    return this.update(id, { estado: newStatus });
  },

  async delete(id: string): Promise<void> {
    // Eliminar de la tabla usuarios (soft delete cambiando estado a inactivo)
    // La eliminación completa de Auth.users debe hacerse desde el dashboard de Supabase
    // o usando Admin API
    
    // Obtener timestamp de actualización en hora local
    const updatedAt = getLocalDateTimeISO();
    
    const { error: deleteError } = await supabase
      .from('usuarios')
      .update({ 
        estado: 'inactivo',
        updated_at: updatedAt, // Timestamp explícito en hora local
      })
      .eq('id', id);

    if (deleteError) throw new Error(handleSupabaseError(deleteError));

    // Nota: Para eliminar completamente de Auth, usa el dashboard de Supabase
    // o crea una Edge Function con permisos de servicio
  },
};

