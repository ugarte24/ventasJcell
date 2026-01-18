import { supabase } from '@/lib/supabase';
import { ArqueoMinorista, CreateArqueoMinoristaData, User } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO, getLocalDateISO, getLocalTimeISO } from '@/lib/utils';
import { usersService } from './users.service';

export const arqueosMinoristasService = {
  // ============================================================================
  // OBTENER ARQUEOS
  // ============================================================================

  async getAll(filters?: {
    id_minorista?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    estado?: 'abierto' | 'cerrado';
  }): Promise<ArqueoMinorista[]> {
    let query = supabase
      .from('arqueos_minoristas')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.id_minorista) {
      query = query.eq('id_minorista', filters.id_minorista);
    }
    if (filters?.fechaDesde) {
      query = query.gte('fecha', filters.fechaDesde);
    }
    if (filters?.fechaHasta) {
      query = query.lte('fecha', filters.fechaHasta);
    }
    if (filters?.estado) {
      query = query.eq('estado', filters.estado);
    }

    const { data, error } = await query;

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos relacionados
    const arqueosCompletos = await Promise.all(
      (data || []).map(async (arqueo) => {
        const minorista = await usersService.getById(arqueo.id_minorista);
        return {
          ...arqueo,
          saldos_restantes: Array.isArray(arqueo.saldos_restantes) 
            ? arqueo.saldos_restantes 
            : (typeof arqueo.saldos_restantes === 'string' 
                ? JSON.parse(arqueo.saldos_restantes) 
                : []),
          minorista: minorista || undefined,
        } as ArqueoMinorista;
      })
    );

    return arqueosCompletos;
  },

  async getById(id: string): Promise<ArqueoMinorista | null> {
    const { data, error } = await supabase
      .from('arqueos_minoristas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }

    if (!data) return null;

    // Cargar datos relacionados
    const minorista = await usersService.getById(data.id_minorista);

    return {
      ...data,
      saldos_restantes: Array.isArray(data.saldos_restantes) 
        ? data.saldos_restantes 
        : (typeof data.saldos_restantes === 'string' 
            ? JSON.parse(data.saldos_restantes) 
            : []),
      minorista: minorista || undefined,
    } as ArqueoMinorista;
  },

  /**
   * Obtener arqueo abierto del día para un minorista
   */
  async getArqueoAbiertoDelDia(idMinorista: string, fecha?: string): Promise<ArqueoMinorista | null> {
    const fechaBusqueda = fecha || getLocalDateISO();
    const arqueos = await this.getAll({
      id_minorista: idMinorista,
      fechaDesde: fechaBusqueda,
      fechaHasta: fechaBusqueda,
      estado: 'abierto',
    });
    return arqueos.length > 0 ? arqueos[0] : null;
  },

  // ============================================================================
  // CREAR ARQUEO
  // ============================================================================

  async create(arqueoData: CreateArqueoMinoristaData): Promise<ArqueoMinorista> {
    const createdAt = getLocalDateTimeISO();
    const updatedAt = getLocalDateTimeISO();

    const { data, error } = await supabase
      .from('arqueos_minoristas')
      .insert({
        id_minorista: arqueoData.id_minorista,
        fecha: arqueoData.fecha,
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
    const minorista = await usersService.getById(data.id_minorista);

    return {
      ...data,
      saldos_restantes: Array.isArray(data.saldos_restantes) 
        ? data.saldos_restantes 
        : (typeof data.saldos_restantes === 'string' 
            ? JSON.parse(data.saldos_restantes) 
            : []),
      minorista: minorista || undefined,
    } as ArqueoMinorista;
  },

  // ============================================================================
  // ACTUALIZAR ARQUEO
  // ============================================================================

  async update(id: string, updates: Partial<Omit<ArqueoMinorista, 'id' | 'created_at' | 'updated_at'>>): Promise<ArqueoMinorista> {
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
      .from('arqueos_minoristas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos relacionados
    const minorista = await usersService.getById(data.id_minorista);

    return {
      ...data,
      saldos_restantes: Array.isArray(data.saldos_restantes) 
        ? data.saldos_restantes 
        : (typeof data.saldos_restantes === 'string' 
            ? JSON.parse(data.saldos_restantes) 
            : []),
      minorista: minorista || undefined,
    } as ArqueoMinorista;
  },

  // ============================================================================
  // CERRAR ARQUEO
  // ============================================================================

  async cerrar(id: string, efectivoRecibido: number, horaCierre?: string): Promise<ArqueoMinorista> {
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
      .from('arqueos_minoristas')
      .delete()
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },
};
