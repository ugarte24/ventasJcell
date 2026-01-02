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

  async getPreregistrosMinorista(fecha?: string): Promise<PreregistroMinorista[]> {
    const fechaBusqueda = fecha || getLocalDateISO();
    
    const { data, error } = await supabase
      .from('preregistros_minorista')
      .select('*')
      .eq('fecha', fechaBusqueda)
      .order('created_at', { ascending: false });

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos de productos
    const preregistrosConProductos = await Promise.all(
      (data || []).map(async (preregistro) => {
        const producto = await productsService.getById(preregistro.id_producto);
        return {
          ...preregistro,
          producto: producto || undefined,
        } as PreregistroMinorista;
      })
    );

    return preregistrosConProductos;
  },

  async createPreregistroMinorista(
    idProducto: string,
    cantidad: number,
    fecha?: string
  ): Promise<PreregistroMinorista> {
    const fechaRegistro = fecha || getLocalDateISO();
    const createdAt = getLocalDateTimeISO();
    const updatedAt = getLocalDateTimeISO();

    // Verificar si ya existe un preregistro para este producto en esta fecha
    const { data: existing } = await supabase
      .from('preregistros_minorista')
      .select('id')
      .eq('id_producto', idProducto)
      .eq('fecha', fechaRegistro)
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
      
      const producto = await productsService.getById(idProducto);
      return {
        ...data,
        producto: producto || undefined,
      } as PreregistroMinorista;
    }

    // Crear nuevo preregistro
    const { data, error } = await supabase
      .from('preregistros_minorista')
      .insert({
        id_producto: idProducto,
        cantidad,
        fecha: fechaRegistro,
        created_at: createdAt,
        updated_at: updatedAt,
      })
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    const producto = await productsService.getById(idProducto);
    return {
      ...data,
      producto: producto || undefined,
    } as PreregistroMinorista;
  },

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
    
    let query = supabase
      .from('preregistros_mayorista')
      .select('*')
      .eq('fecha', fechaBusqueda);

    if (idMayorista) {
      query = query.eq('id_mayorista', idMayorista);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos de productos y mayoristas
    const preregistrosCompletos = await Promise.all(
      (data || []).map(async (preregistro) => {
        const [producto, mayorista] = await Promise.all([
          productsService.getById(preregistro.id_producto),
          usersService.getById(preregistro.id_mayorista),
        ]);

        return {
          ...preregistro,
          producto: producto || undefined,
          mayorista: mayorista || undefined,
        } as PreregistroMayorista;
      })
    );

    return preregistrosCompletos;
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

      const [producto, mayorista] = await Promise.all([
        productsService.getById(idProducto),
        usersService.getById(idMayorista),
      ]);

      return {
        ...data,
        producto: producto || undefined,
        mayorista: mayorista || undefined,
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
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    const [producto, mayorista] = await Promise.all([
      productsService.getById(idProducto),
      usersService.getById(idMayorista),
    ]);

    return {
      ...data,
      producto: producto || undefined,
      mayorista: mayorista || undefined,
    } as PreregistroMayorista;
  },

  async deletePreregistroMayorista(id: string): Promise<void> {
    const { error } = await supabase
      .from('preregistros_mayorista')
      .delete()
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },
};

