import { supabase } from '@/lib/supabase';
import { PreregistroMinorista, PreregistroMayorista, Product } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO, getLocalDateISO } from '@/lib/utils';
import { productsService } from './products.service';
import { usersService } from './users.service';

export const preregistrosService = {
  // ============================================================================
  // PREREGISTROS MINORISTA
  // ============================================================================

  async getPreregistrosMinorista(idMinorista?: string): Promise<PreregistroMinorista[]> {
    // Usar JOINs de Supabase para obtener todos los datos en una sola query
    let query = supabase
      .from('preregistros_minorista')
      .select(`
        *,
        producto:productos!id_producto (
          id,
          nombre,
          codigo,
          precio_por_unidad,
          precio_por_mayor,
          stock_actual,
          estado
        ),
        minorista:usuarios!id_minorista (
          id,
          nombre,
          usuario,
          estado
        )
      `);

    if (idMinorista) {
      query = query.eq('id_minorista', idMinorista);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(handleSupabaseError(error));

    // Transformar los datos para que coincidan con el tipo PreregistroMinorista
    return (data || []).map((preregistro: any) => ({
      ...preregistro,
      producto: preregistro.producto || undefined,
      minorista: preregistro.minorista || undefined,
    })) as PreregistroMinorista[];
  },

  async createPreregistroMinorista(
    idMinorista: string,
    idProducto: string,
    cantidad: number
  ): Promise<PreregistroMinorista> {
    const createdAt = getLocalDateTimeISO();
    const updatedAt = getLocalDateTimeISO();

    // Verificar si ya existe un preregistro para este minorista y producto
    const { data: existing } = await supabase
      .from('preregistros_minorista')
      .select('id')
      .eq('id_minorista', idMinorista)
      .eq('id_producto', idProducto)
      .maybeSingle();

    if (existing) {
      // Actualizar cantidad existente
      const { data, error } = await supabase
        .from('preregistros_minorista')
        .update({
          cantidad,
          updated_at: updatedAt,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(handleSupabaseError(error));
      
      // Usar JOIN para obtener datos relacionados
      const { data: dataWithRelations, error: relationsError } = await supabase
        .from('preregistros_minorista')
        .select(`
          *,
          producto:productos!id_producto (
            id,
            nombre,
            codigo,
            precio_por_unidad,
            precio_por_mayor,
            stock_actual,
            estado
          ),
          minorista:usuarios!id_minorista (
            id,
            nombre,
            usuario,
            estado
          )
        `)
        .eq('id', data.id)
        .single();

      if (relationsError) throw new Error(handleSupabaseError(relationsError));
      
      return {
        ...dataWithRelations,
        producto: dataWithRelations?.producto || undefined,
        minorista: dataWithRelations?.minorista || undefined,
      } as PreregistroMinorista;
    }

    // Crear nuevo preregistro
    const { data, error } = await supabase
      .from('preregistros_minorista')
      .insert({
        id_minorista: idMinorista,
        id_producto: idProducto,
        cantidad,
        created_at: createdAt,
        updated_at: updatedAt,
      })
      .select(`
        *,
        producto:productos!id_producto (
          id,
          nombre,
          codigo,
          precio_por_unidad,
          precio_por_mayor,
          stock_actual,
          estado
        ),
        minorista:usuarios!id_minorista (
          id,
          nombre,
          usuario,
          estado
        )
      `)
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    return {
      ...data,
      producto: data.producto || undefined,
      minorista: data.minorista || undefined,
    } as PreregistroMinorista;
  },

  async updatePreregistroMinorista(
    id: string,
    updates: {
      id_producto?: string;
      cantidad?: number;
    }
  ): Promise<PreregistroMinorista> {
    const updatedAt = getLocalDateTimeISO();

    const { data, error } = await supabase
      .from('preregistros_minorista')
      .update({
        ...updates,
        updated_at: updatedAt,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    // Usar JOIN para obtener datos relacionados en una sola query
    const { data: dataWithRelations, error: relationsError } = await supabase
      .from('preregistros_minorista')
      .select(`
        *,
        producto:productos!id_producto (
          id,
          nombre,
          codigo,
          precio_por_unidad,
          precio_por_mayor,
          stock_actual,
          estado
        ),
        minorista:usuarios!id_minorista (
          id,
          nombre,
          usuario,
          estado
        )
      `)
      .eq('id', data.id)
      .single();

    if (relationsError) throw new Error(handleSupabaseError(relationsError));

    return {
      ...dataWithRelations,
      producto: dataWithRelations?.producto || undefined,
      minorista: dataWithRelations?.minorista || undefined,
    } as PreregistroMinorista;
  },

  // NOTA: La función updateAumentoMinorista fue eliminada.
  // Los aumentos ahora se registran en la tabla ventas_minoristas.

  async deletePreregistroMinorista(id: string): Promise<void> {
    const { error } = await supabase
      .from('preregistros_minorista')
      .delete()
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },

  // ============================================================================
  // PREREGISTROS MAYORISTA
  // ============================================================================

  async getPreregistrosMayorista(
    idMayorista?: string,
    fecha?: string
  ): Promise<PreregistroMayorista[]> {
    const fechaBusqueda = fecha || getLocalDateISO();
    
    // Usar JOINs de Supabase para obtener todos los datos en una sola query
    let query = supabase
      .from('preregistros_mayorista')
      .select(`
        *,
        producto:productos!id_producto (
          id,
          nombre,
          codigo,
          precio_por_unidad,
          precio_por_mayor,
          stock_actual,
          estado
        ),
        mayorista:usuarios!id_mayorista (
          id,
          nombre,
          usuario,
          estado
        )
      `)
      .eq('fecha', fechaBusqueda);

    if (idMayorista) {
      query = query.eq('id_mayorista', idMayorista);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(handleSupabaseError(error));

    // Transformar los datos para que coincidan con el tipo PreregistroMayorista
    return (data || []).map((preregistro: any) => ({
      ...preregistro,
      producto: preregistro.producto || undefined,
      mayorista: preregistro.mayorista || undefined,
    })) as PreregistroMayorista[];
  },

  async createPreregistroMayorista(
    idMayorista: string,
    idProducto: string,
    cantidad: number,
    fecha?: string
  ): Promise<PreregistroMayorista> {
    const fechaRegistro = fecha || getLocalDateISO();
    const createdAt = getLocalDateTimeISO();
    const updatedAt = getLocalDateTimeISO();

    // Verificar si ya existe un preregistro para este mayorista y producto en esta fecha
    const { data: existing } = await supabase
      .from('preregistros_mayorista')
      .select('id')
      .eq('id_mayorista', idMayorista)
      .eq('id_producto', idProducto)
      .eq('fecha', fechaRegistro)
      .maybeSingle();

    if (existing) {
      // Actualizar cantidad existente
      const { data, error } = await supabase
        .from('preregistros_mayorista')
        .update({
          cantidad,
          updated_at: updatedAt,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(handleSupabaseError(error));

      // Usar JOIN para obtener datos relacionados
      const { data: dataWithRelations, error: relationsError } = await supabase
        .from('preregistros_mayorista')
        .select(`
          *,
          producto:productos!id_producto (
            id,
            nombre,
            codigo,
            precio_por_unidad,
            precio_por_mayor,
            stock_actual,
            estado
          ),
          mayorista:usuarios!id_mayorista (
            id,
            nombre,
            usuario,
            estado
          )
        `)
        .eq('id', data.id)
        .single();

      if (relationsError) throw new Error(handleSupabaseError(relationsError));

      return {
        ...dataWithRelations,
        producto: dataWithRelations?.producto || undefined,
        mayorista: dataWithRelations?.mayorista || undefined,
      } as PreregistroMayorista;
    }

    // Crear nuevo preregistro
    const { data, error } = await supabase
      .from('preregistros_mayorista')
      .insert({
        id_mayorista: idMayorista,
        id_producto: idProducto,
        cantidad,
        fecha: fechaRegistro,
        created_at: createdAt,
        updated_at: updatedAt,
      })
      .select(`
        *,
        producto:productos!id_producto (
          id,
          nombre,
          codigo,
          precio_por_unidad,
          precio_por_mayor,
          stock_actual,
          estado
        ),
        mayorista:usuarios!id_mayorista (
          id,
          nombre,
          usuario,
          estado
        )
      `)
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    return {
      ...data,
      producto: data.producto || undefined,
      mayorista: data.mayorista || undefined,
    } as PreregistroMayorista;
  },

  async updatePreregistroMayorista(
    id: string,
    updates: {
      id_producto?: string;
      cantidad?: number;
    }
  ): Promise<PreregistroMayorista> {
    const updatedAt = getLocalDateTimeISO();

    const { data, error } = await supabase
      .from('preregistros_mayorista')
      .update({
        ...updates,
        updated_at: updatedAt,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    // Usar JOIN para obtener datos relacionados
    const { data: dataWithRelations, error: relationsError } = await supabase
      .from('preregistros_mayorista')
      .select(`
        *,
        producto:productos!id_producto (
          id,
          nombre,
          codigo,
          precio_por_unidad,
          precio_por_mayor,
          stock_actual,
          estado
        ),
        mayorista:usuarios!id_mayorista (
          id,
          nombre,
          usuario,
          estado
        )
      `)
      .eq('id', data.id)
      .single();

    if (relationsError) throw new Error(handleSupabaseError(relationsError));

    return {
      ...dataWithRelations,
      producto: dataWithRelations?.producto || undefined,
      mayorista: dataWithRelations?.mayorista || undefined,
    } as PreregistroMayorista;
  },

  // NOTA: La función updateAumentoMayorista fue eliminada.
  // Los aumentos ahora se registran en la tabla ventas_mayoristas.

  async deletePreregistroMayorista(id: string): Promise<void> {
    const { error } = await supabase
      .from('preregistros_mayorista')
      .delete()
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },
};

