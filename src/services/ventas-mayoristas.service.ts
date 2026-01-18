import { supabase } from '@/lib/supabase';
import { VentaMayorista, CreateVentaMayoristaData, Product, User } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO, getLocalDateISO, getLocalTimeISO } from '@/lib/utils';
import { productsService } from './products.service';
import { usersService } from './users.service';

export const ventasMayoristasService = {
  // ============================================================================
  // OBTENER VENTAS
  // ============================================================================

  async getAll(filters?: {
    id_mayorista?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    id_producto?: string;
  }): Promise<VentaMayorista[]> {
    let query = supabase
      .from('ventas_mayoristas')
      .select('*')
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false });

    if (filters?.id_mayorista) {
      query = query.eq('id_mayorista', filters.id_mayorista);
    }
    if (filters?.fechaDesde) {
      query = query.gte('fecha', filters.fechaDesde);
    }
    if (filters?.fechaHasta) {
      query = query.lte('fecha', filters.fechaHasta);
    }
    if (filters?.id_producto) {
      query = query.eq('id_producto', filters.id_producto);
    }

    const { data, error } = await query;

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos relacionados
    const ventasCompletas = await Promise.all(
      (data || []).map(async (venta) => {
        const [mayorista, producto] = await Promise.all([
          usersService.getById(venta.id_mayorista),
          productsService.getById(venta.id_producto),
        ]);
        return {
          ...venta,
          mayorista: mayorista || undefined,
          producto: producto || undefined,
        } as VentaMayorista;
      })
    );

    return ventasCompletas;
  },

  async getById(id: string): Promise<VentaMayorista | null> {
    const { data, error } = await supabase
      .from('ventas_mayoristas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }

    if (!data) return null;

    // Cargar datos relacionados
    const [mayorista, producto] = await Promise.all([
      usersService.getById(data.id_mayorista),
      productsService.getById(data.id_producto),
    ]);

    return {
      ...data,
      mayorista: mayorista || undefined,
      producto: producto || undefined,
    } as VentaMayorista;
  },

  // ============================================================================
  // CREAR VENTA
  // ============================================================================

  async create(ventaData: CreateVentaMayoristaData): Promise<VentaMayorista> {
    const createdAt = getLocalDateTimeISO();
    const updatedAt = getLocalDateTimeISO();

    // Calcular total automáticamente (el trigger también lo hace, pero lo calculamos aquí para validación)
    const total = (ventaData.cantidad_vendida + ventaData.cantidad_aumento) * ventaData.precio_por_mayor;

    const { data, error } = await supabase
      .from('ventas_mayoristas')
      .insert({
        id_mayorista: ventaData.id_mayorista,
        id_producto: ventaData.id_producto,
        cantidad_vendida: ventaData.cantidad_vendida,
        cantidad_aumento: ventaData.cantidad_aumento,
        precio_por_mayor: ventaData.precio_por_mayor,
        total: total,
        fecha: ventaData.fecha,
        hora: ventaData.hora,
        id_pedido: ventaData.id_pedido || null,
        observaciones: ventaData.observaciones || null,
        created_at: createdAt,
        updated_at: updatedAt,
      })
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos relacionados
    const [mayorista, producto] = await Promise.all([
      usersService.getById(data.id_mayorista),
      productsService.getById(data.id_producto),
    ]);

    return {
      ...data,
      mayorista: mayorista || undefined,
      producto: producto || undefined,
    } as VentaMayorista;
  },

  // ============================================================================
  // ACTUALIZAR VENTA
  // ============================================================================

  async update(id: string, updates: Partial<Omit<VentaMayorista, 'id' | 'created_at' | 'updated_at'>>): Promise<VentaMayorista> {
    const updatedAt = getLocalDateTimeISO();

    // Si se actualiza cantidad_vendida, cantidad_aumento o precio, recalcular total
    if (updates.cantidad_vendida !== undefined || updates.cantidad_aumento !== undefined || updates.precio_por_mayor !== undefined) {
      // Obtener venta actual
      const ventaActual = await this.getById(id);
      if (!ventaActual) {
        throw new Error('Venta no encontrada');
      }

      const cantidadVendida = updates.cantidad_vendida ?? ventaActual.cantidad_vendida;
      const cantidadAumento = updates.cantidad_aumento ?? ventaActual.cantidad_aumento;
      const precioPorMayor = updates.precio_por_mayor ?? ventaActual.precio_por_mayor;
      
      updates.total = (cantidadVendida + cantidadAumento) * precioPorMayor;
    }

    const { data, error } = await supabase
      .from('ventas_mayoristas')
      .update({
        ...updates,
        updated_at: updatedAt,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos relacionados
    const [mayorista, producto] = await Promise.all([
      usersService.getById(data.id_mayorista),
      productsService.getById(data.id_producto),
    ]);

    return {
      ...data,
      mayorista: mayorista || undefined,
      producto: producto || undefined,
    } as VentaMayorista;
  },

  // ============================================================================
  // ELIMINAR VENTA
  // ============================================================================

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('ventas_mayoristas')
      .delete()
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },

  // ============================================================================
  // FUNCIONES ESPECIALES
  // ============================================================================

  /**
   * Obtener ventas del período para un mayorista
   */
  async getVentasDelPeriodo(idMayorista: string, fechaDesde: string, fechaHasta: string): Promise<VentaMayorista[]> {
    return this.getAll({
      id_mayorista: idMayorista,
      fechaDesde: fechaDesde,
      fechaHasta: fechaHasta,
    });
  },

  /**
   * Obtener aumentos del período para un mayorista
   */
  async getAumentosDelPeriodo(idMayorista: string, fechaDesde: string, fechaHasta: string): Promise<VentaMayorista[]> {
    const ventas = await this.getAll({
      id_mayorista: idMayorista,
      fechaDesde: fechaDesde,
      fechaHasta: fechaHasta,
    });
    return ventas.filter(v => v.cantidad_aumento > 0);
  },

  /**
   * Obtener total de ventas del período
   */
  async getTotalVentas(filters?: {
    id_mayorista?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<number> {
    const ventas = await this.getAll(filters);
    return ventas.reduce((sum, venta) => sum + venta.cantidad_vendida, 0);
  },

  /**
   * Obtener total de aumentos del período
   */
  async getTotalAumentos(filters?: {
    id_mayorista?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<number> {
    const ventas = await this.getAll(filters);
    return ventas.reduce((sum, venta) => sum + venta.cantidad_aumento, 0);
  },

  /**
   * Obtener monto total de ventas del período
   */
  async getMontoTotalVentas(filters?: {
    id_mayorista?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<number> {
    const ventas = await this.getAll(filters);
    return ventas.reduce((sum, venta) => sum + (venta.cantidad_vendida * venta.precio_por_mayor), 0);
  },
};
