import { supabase } from '@/lib/supabase';
import { VentaMinorista, CreateVentaMinoristaData, Product, User } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO, getLocalDateISO, getLocalTimeISO } from '@/lib/utils';
import { productsService } from './products.service';
import { usersService } from './users.service';

export const ventasMinoristasService = {
  // ============================================================================
  // OBTENER VENTAS
  // ============================================================================

  async getAll(filters?: {
    id_minorista?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    id_producto?: string;
  }): Promise<VentaMinorista[]> {
    let query = supabase
      .from('ventas_minoristas')
      .select('*')
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false });

    if (filters?.id_minorista) {
      query = query.eq('id_minorista', filters.id_minorista);
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
        const [minorista, producto] = await Promise.all([
          usersService.getById(venta.id_minorista),
          productsService.getById(venta.id_producto),
        ]);
        return {
          ...venta,
          minorista: minorista || undefined,
          producto: producto || undefined,
        } as VentaMinorista;
      })
    );

    return ventasCompletas;
  },

  async getById(id: string): Promise<VentaMinorista | null> {
    const { data, error } = await supabase
      .from('ventas_minoristas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }

    if (!data) return null;

    // Cargar datos relacionados
    const [minorista, producto] = await Promise.all([
      usersService.getById(data.id_minorista),
      productsService.getById(data.id_producto),
    ]);

    return {
      ...data,
      minorista: minorista || undefined,
      producto: producto || undefined,
    } as VentaMinorista;
  },

  // ============================================================================
  // CREAR VENTA
  // ============================================================================

  async create(ventaData: CreateVentaMinoristaData): Promise<VentaMinorista> {
    const createdAt = getLocalDateTimeISO();
    const updatedAt = getLocalDateTimeISO();

    // Calcular total automáticamente (el trigger también lo hace, pero lo calculamos aquí para validación)
    const total = (ventaData.cantidad_vendida + ventaData.cantidad_aumento) * ventaData.precio_unitario;

    const { data, error } = await supabase
      .from('ventas_minoristas')
      .insert({
        id_minorista: ventaData.id_minorista,
        id_producto: ventaData.id_producto,
        cantidad_vendida: ventaData.cantidad_vendida,
        cantidad_aumento: ventaData.cantidad_aumento,
        precio_unitario: ventaData.precio_unitario,
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
    const [minorista, producto] = await Promise.all([
      usersService.getById(data.id_minorista),
      productsService.getById(data.id_producto),
    ]);

    return {
      ...data,
      minorista: minorista || undefined,
      producto: producto || undefined,
    } as VentaMinorista;
  },

  // ============================================================================
  // ACTUALIZAR VENTA
  // ============================================================================

  async update(id: string, updates: Partial<Omit<VentaMinorista, 'id' | 'created_at' | 'updated_at'>>): Promise<VentaMinorista> {
    const updatedAt = getLocalDateTimeISO();

    // Si se actualiza cantidad_vendida, cantidad_aumento o precio, recalcular total
    if (updates.cantidad_vendida !== undefined || updates.cantidad_aumento !== undefined || updates.precio_unitario !== undefined) {
      // Obtener venta actual
      const ventaActual = await this.getById(id);
      if (!ventaActual) {
        throw new Error('Venta no encontrada');
      }

      const cantidadVendida = updates.cantidad_vendida ?? ventaActual.cantidad_vendida;
      const cantidadAumento = updates.cantidad_aumento ?? ventaActual.cantidad_aumento;
      const precioUnitario = updates.precio_unitario ?? ventaActual.precio_unitario;
      
      updates.total = (cantidadVendida + cantidadAumento) * precioUnitario;
    }

    const { data, error } = await supabase
      .from('ventas_minoristas')
      .update({
        ...updates,
        updated_at: updatedAt,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos relacionados
    const [minorista, producto] = await Promise.all([
      usersService.getById(data.id_minorista),
      productsService.getById(data.id_producto),
    ]);

    return {
      ...data,
      minorista: minorista || undefined,
      producto: producto || undefined,
    } as VentaMinorista;
  },

  // ============================================================================
  // ELIMINAR VENTA
  // ============================================================================

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('ventas_minoristas')
      .delete()
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },

  // ============================================================================
  // FUNCIONES ESPECIALES
  // ============================================================================

  /**
   * Obtener ventas del día para un minorista
   */
  async getVentasDelDia(idMinorista: string, fecha?: string): Promise<VentaMinorista[]> {
    const fechaBusqueda = fecha || getLocalDateISO();
    return this.getAll({
      id_minorista: idMinorista,
      fechaDesde: fechaBusqueda,
      fechaHasta: fechaBusqueda,
    });
  },

  /**
   * Obtener aumentos del día para un minorista
   */
  async getAumentosDelDia(idMinorista: string, fecha?: string): Promise<VentaMinorista[]> {
    const fechaBusqueda = fecha || getLocalDateISO();
    const ventas = await this.getAll({
      id_minorista: idMinorista,
      fechaDesde: fechaBusqueda,
      fechaHasta: fechaBusqueda,
    });
    return ventas.filter(v => v.cantidad_aumento > 0);
  },

  /**
   * Obtener total de ventas del período
   */
  async getTotalVentas(filters?: {
    id_minorista?: string;
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
    id_minorista?: string;
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
    id_minorista?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<number> {
    const ventas = await this.getAll(filters);
    return ventas.reduce((sum, venta) => sum + (venta.cantidad_vendida * venta.precio_unitario), 0);
  },
};
