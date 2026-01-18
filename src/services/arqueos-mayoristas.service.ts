import { supabase } from '@/lib/supabase';
import { ArqueoMayorista, CreateArqueoMayoristaData, User } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO, getLocalDateISO, getLocalTimeISO } from '@/lib/utils';
import { usersService } from './users.service';

export const arqueosMayoristasService = {
  // ============================================================================
  // OBTENER ARQUEOS
  // ============================================================================

  async getAll(filters?: {
    id_mayorista?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    estado?: 'abierto' | 'cerrado';
  }): Promise<ArqueoMayorista[]> {
    let query = supabase
      .from('arqueos_mayoristas')
      .select('*')
      .order('fecha_inicio', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.id_mayorista) {
      query = query.eq('id_mayorista', filters.id_mayorista);
    }
    if (filters?.fechaDesde) {
      query = query.gte('fecha_inicio', filters.fechaDesde);
    }
    if (filters?.fechaHasta) {
      query = query.lte('fecha_fin', filters.fechaHasta);
    }
    if (filters?.estado) {
      query = query.eq('estado', filters.estado);
    }

    const { data, error } = await query;

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos relacionados
    const arqueosCompletos = await Promise.all(
      (data || []).map(async (arqueo) => {
        const mayorista = await usersService.getById(arqueo.id_mayorista);
        return {
          ...arqueo,
          saldos_restantes: Array.isArray(arqueo.saldos_restantes) 
            ? arqueo.saldos_restantes 
            : (typeof arqueo.saldos_restantes === 'string' 
                ? JSON.parse(arqueo.saldos_restantes) 
                : []),
          mayorista: mayorista || undefined,
        } as ArqueoMayorista;
      })
    );

    return arqueosCompletos;
  },

  async getById(id: string): Promise<ArqueoMayorista | null> {
    const { data, error } = await supabase
      .from('arqueos_mayoristas')
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
      saldos_restantes: Array.isArray(data.saldos_restantes) 
        ? data.saldos_restantes 
        : (typeof data.saldos_restantes === 'string' 
            ? JSON.parse(data.saldos_restantes) 
            : []),
      mayorista: mayorista || undefined,
    } as ArqueoMayorista;
  },

  /**
   * Obtener arqueo abierto para un mayorista
   */
  async getArqueoAbierto(idMayorista: string): Promise<ArqueoMayorista | null> {
    const arqueos = await this.getAll({
      id_mayorista: idMayorista,
      estado: 'abierto',
    });
    return arqueos.length > 0 ? arqueos[0] : null;
  },

  /**
   * Obtener último arqueo cerrado para un mayorista
   */
  async getUltimoArqueoCerrado(idMayorista: string): Promise<ArqueoMayorista | null> {
    const arqueos = await this.getAll({
      id_mayorista: idMayorista,
      estado: 'cerrado',
    });
    return arqueos.length > 0 ? arqueos[0] : null;
  },

  // ============================================================================
  // CREAR ARQUEO
  // ============================================================================

  async create(arqueoData: CreateArqueoMayoristaData): Promise<ArqueoMayorista> {
    const createdAt = getLocalDateTimeISO();
    const updatedAt = getLocalDateTimeISO();

    const { data, error } = await supabase
      .from('arqueos_mayoristas')
      .insert({
        id_mayorista: arqueoData.id_mayorista,
        fecha_inicio: arqueoData.fecha_inicio,
        fecha_fin: arqueoData.fecha_fin,
        hora_apertura: arqueoData.hora_apertura || null,
        hora_cierre: arqueoData.hora_cierre || null,
        ventas_del_periodo: arqueoData.ventas_del_periodo,
        saldos_restantes: arqueoData.saldos_restantes as any, // JSONB
        efectivo_recibido: arqueoData.efectivo_recibido,
        observaciones: arqueoData.observaciones || null,
        estado: arqueoData.estado || 'abierto',
        created_at: createdAt,
        updated_at: updatedAt,
      })
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos relacionados
    const mayorista = await usersService.getById(data.id_mayorista);

    return {
      ...data,
      saldos_restantes: Array.isArray(data.saldos_restantes) 
        ? data.saldos_restantes 
        : (typeof data.saldos_restantes === 'string' 
            ? JSON.parse(data.saldos_restantes) 
            : []),
      mayorista: mayorista || undefined,
    } as ArqueoMayorista;
  },

  // ============================================================================
  // ACTUALIZAR ARQUEO
  // ============================================================================

  async update(id: string, updates: Partial<Omit<ArqueoMayorista, 'id' | 'created_at' | 'updated_at'>>): Promise<ArqueoMayorista> {
    const updatedAt = getLocalDateTimeISO();

    const updateData: any = {
      ...updates,
      updated_at: updatedAt,
    };

    // Convertir saldos_restantes a JSONB si es necesario
    if (updates.saldos_restantes !== undefined) {
      updateData.saldos_restantes = updates.saldos_restantes as any;
    }

    const { data, error } = await supabase
      .from('arqueos_mayoristas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos relacionados
    const mayorista = await usersService.getById(data.id_mayorista);

    return {
      ...data,
      saldos_restantes: Array.isArray(data.saldos_restantes) 
        ? data.saldos_restantes 
        : (typeof data.saldos_restantes === 'string' 
            ? JSON.parse(data.saldos_restantes) 
            : []),
      mayorista: mayorista || undefined,
    } as ArqueoMayorista;
  },

  // ============================================================================
  // CERRAR ARQUEO
  // ============================================================================

  async cerrar(id: string, efectivoRecibido: number, horaCierre?: string): Promise<ArqueoMayorista> {
    const horaCierreFinal = horaCierre || getLocalTimeISO();
    
    return this.update(id, {
      estado: 'cerrado',
      hora_cierre: horaCierreFinal,
      efectivo_recibido: efectivoRecibido,
    });
  },

  // ============================================================================
  // ELIMINAR ARQUEO
  // ============================================================================

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('arqueos_mayoristas')
      .delete()
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },
};
