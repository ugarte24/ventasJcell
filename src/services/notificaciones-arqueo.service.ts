import { supabase } from '@/lib/supabase';
import { NotificacionArqueo, User } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO } from '@/lib/utils';
import { usersService } from './users.service';

export const notificacionesArqueoService = {
  // ============================================================================
  // OBTENER NOTIFICACIONES
  // ============================================================================

  async getAll(filters?: {
    id_mayorista?: string;
    estado?: 'pendiente' | 'vista' | 'resuelta';
  }): Promise<NotificacionArqueo[]> {
    let query = supabase
      .from('notificaciones_arqueo')
      .select('*')
      .order('dias_sin_arqueo', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.id_mayorista) {
      query = query.eq('id_mayorista', filters.id_mayorista);
    }
    if (filters?.estado) {
      query = query.eq('estado', filters.estado);
    }

    const { data, error } = await query;

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos relacionados
    const notificacionesCompletas = await Promise.all(
      (data || []).map(async (notificacion) => {
        const mayorista = await usersService.getById(notificacion.id_mayorista);
        return {
          ...notificacion,
          mayorista: mayorista || undefined,
        } as NotificacionArqueo;
      })
    );

    return notificacionesCompletas;
  },

  async getById(id: string): Promise<NotificacionArqueo | null> {
    const { data, error } = await supabase
      .from('notificaciones_arqueo')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }

    if (!data) return null;

    // Cargar datos relacionados
    const mayorista = await usersService.getById(data.id_mayorista);

    return {
      ...data,
      mayorista: mayorista || undefined,
    } as NotificacionArqueo;
  },

  /**
   * Obtener notificaciones pendientes
   */
  async getPendientes(): Promise<NotificacionArqueo[]> {
    return this.getAll({ estado: 'pendiente' });
  },

  /**
   * Obtener notificaciones de un mayorista
   */
  async getByMayorista(idMayorista: string): Promise<NotificacionArqueo[]> {
    return this.getAll({ id_mayorista: idMayorista });
  },

  // ============================================================================
  // ACTUALIZAR NOTIFICACIÓN
  // ============================================================================

  async update(id: string, updates: Partial<Omit<NotificacionArqueo, 'id' | 'created_at' | 'updated_at'>>): Promise<NotificacionArqueo> {
    const updatedAt = getLocalDateTimeISO();

    const { data, error } = await supabase
      .from('notificaciones_arqueo')
      .update({
        ...updates,
        updated_at: updatedAt,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos relacionados
    const mayorista = await usersService.getById(data.id_mayorista);

    return {
      ...data,
      mayorista: mayorista || undefined,
    } as NotificacionArqueo;
  },

  /**
   * Marcar notificación como vista
   */
  async marcarComoVista(id: string): Promise<NotificacionArqueo> {
    return this.update(id, { estado: 'vista' });
  },

  /**
   * Marcar notificación como resuelta
   */
  async marcarComoResuelta(id: string): Promise<NotificacionArqueo> {
    return this.update(id, { estado: 'resuelta' });
  },

  // ============================================================================
  // ELIMINAR NOTIFICACIÓN
  // ============================================================================

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('notificaciones_arqueo')
      .delete()
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },

  /**
   * Eliminar notificaciones resueltas de un mayorista
   */
  async deleteResueltas(idMayorista: string): Promise<void> {
    const { error } = await supabase
      .from('notificaciones_arqueo')
      .delete()
      .eq('id_mayorista', idMayorista)
      .eq('estado', 'resuelta');

    if (error) throw new Error(handleSupabaseError(error));
  },
};
