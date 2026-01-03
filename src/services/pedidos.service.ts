import { supabase } from '@/lib/supabase';
import { Pedido, DetallePedido, Product } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO, getLocalDateISO } from '@/lib/utils';
import { productsService } from './products.service';
import { usersService } from './users.service';
import { preregistrosService } from './preregistros.service';

export const pedidosService = {
  // ============================================================================
  // OBTENER PEDIDOS
  // ============================================================================

  async getAll(idUsuario?: string): Promise<Pedido[]> {
    let query = supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false });

    if (idUsuario) {
      query = query.eq('id_usuario', idUsuario);
    }

    const { data, error } = await query;

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos relacionados
    const pedidosCompletos = await Promise.all(
      (data || []).map(async (pedido) => {
        const [usuario, detalles] = await Promise.all([
          usersService.getById(pedido.id_usuario),
          this.getDetallesByPedidoId(pedido.id),
        ]);

        return {
          ...pedido,
          usuario: usuario || undefined,
          detalles: detalles || [],
        } as Pedido;
      })
    );

    return pedidosCompletos;
  },

  async getById(id: string): Promise<Pedido | null> {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }

    const [usuario, detalles] = await Promise.all([
      usersService.getById(data.id_usuario),
      this.getDetallesByPedidoId(data.id),
    ]);

    return {
      ...data,
      usuario: usuario || undefined,
      detalles: detalles || [],
    } as Pedido;
  },

  // ============================================================================
  // CREAR PEDIDO
  // ============================================================================

  async create(
    idUsuario: string,
    tipoUsuario: 'minorista' | 'mayorista',
    detalles: Array<{ id_producto: string; cantidad: number }>,
    observaciones?: string
  ): Promise<Pedido> {
    const createdAt = getLocalDateTimeISO();
    const updatedAt = getLocalDateTimeISO();
    const fechaPedido = getLocalDateISO();

    // Crear el pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        id_usuario: idUsuario,
        tipo_usuario: tipoUsuario,
        estado: 'pendiente',
        fecha_pedido: fechaPedido,
        observaciones,
        created_at: createdAt,
        updated_at: updatedAt,
      })
      .select()
      .single();

    if (pedidoError) throw new Error(handleSupabaseError(pedidoError));

    // Crear los detalles del pedido
    const detallesData = detalles.map(detalle => ({
      id_pedido: pedido.id,
      id_producto: detalle.id_producto,
      cantidad: detalle.cantidad,
      created_at: createdAt,
      updated_at: updatedAt,
    }));

    const { error: detallesError } = await supabase
      .from('detalle_pedidos')
      .insert(detallesData);

    if (detallesError) {
      // Si falla, eliminar el pedido creado
      await supabase.from('pedidos').delete().eq('id', pedido.id);
      throw new Error(handleSupabaseError(detallesError));
    }

    return await this.getById(pedido.id) as Pedido;
  },

  // ============================================================================
  // ACTUALIZAR PEDIDO
  // ============================================================================

  async update(
    id: string,
    updates: Partial<{
      estado: 'pendiente' | 'enviado' | 'entregado' | 'cancelado';
      fecha_entrega: string;
      observaciones: string;
    }>
  ): Promise<Pedido> {
    const updatedAt = getLocalDateTimeISO();
    const fechaEntrega = updates.estado === 'entregado' ? getLocalDateISO() : updates.fecha_entrega;

    // Si se está marcando como entregado, actualizar preregistros
    if (updates.estado === 'entregado') {
      const pedido = await this.getById(id);
      if (!pedido) {
        throw new Error('Pedido no encontrado');
      }

      // Obtener detalles del pedido
      const detalles = await this.getDetallesByPedidoId(id);
      
      // Actualizar preregistros según el tipo de usuario
      if (pedido.tipo_usuario === 'minorista') {
        // Para minoristas: actualizar campo aumento en preregistros_minorista
        for (const detalle of detalles) {
          const preregistros = await preregistrosService.getPreregistrosMinorista(pedido.id_usuario);
          const preregistroProducto = preregistros.find(p => p.id_producto === detalle.id_producto);
          
          if (preregistroProducto) {
            // Actualizar campo aumento sumando la cantidad del pedido
            await preregistrosService.updateAumentoMinorista(
              preregistroProducto.id,
              (preregistroProducto.aumento || 0) + detalle.cantidad
            );
          } else {
            // Si no existe preregistro, no se puede agregar aumento
            throw new Error(`No existe preregistro para el producto ${detalle.id_producto}. El pedido solo puede incluir productos con preregistro.`);
          }
        }
      } else if (pedido.tipo_usuario === 'mayorista') {
        // Para mayoristas: actualizar campo aumento en preregistros_mayorista
        const fecha = getLocalDateISO();
        for (const detalle of detalles) {
          const preregistros = await preregistrosService.getPreregistrosMayorista(pedido.id_usuario, fecha);
          const preregistroProducto = preregistros.find(p => p.id_producto === detalle.id_producto && p.fecha === fecha);
          
          if (preregistroProducto) {
            // Actualizar campo aumento sumando la cantidad del pedido
            await preregistrosService.updateAumentoMayorista(
              preregistroProducto.id,
              (preregistroProducto.aumento || 0) + detalle.cantidad
            );
          } else {
            // Si no existe preregistro, no se puede agregar aumento
            throw new Error(`No existe preregistro para el producto ${detalle.id_producto} en la fecha ${fecha}. El pedido solo puede incluir productos con preregistro.`);
          }
        }
      }
    }

    const { data, error } = await supabase
      .from('pedidos')
      .update({
        ...updates,
        fecha_entrega: fechaEntrega,
        updated_at: updatedAt,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    return await this.getById(data.id) as Pedido;
  },

  // ============================================================================
  // ELIMINAR PEDIDO
  // ============================================================================

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('pedidos')
      .delete()
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },

  // ============================================================================
  // DETALLES DE PEDIDO
  // ============================================================================

  async getDetallesByPedidoId(idPedido: string): Promise<DetallePedido[]> {
    const { data, error } = await supabase
      .from('detalle_pedidos')
      .select('*')
      .eq('id_pedido', idPedido);

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos de productos
    const detallesCompletos = await Promise.all(
      (data || []).map(async (detalle) => {
        const producto = await productsService.getById(detalle.id_producto);
        return {
          ...detalle,
          producto: producto || undefined,
        } as DetallePedido;
      })
    );

    return detallesCompletos;
  },

  async addDetalle(
    idPedido: string,
    idProducto: string,
    cantidad: number
  ): Promise<DetallePedido> {
    const createdAt = getLocalDateTimeISO();
    const updatedAt = getLocalDateTimeISO();

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('detalle_pedidos')
      .select('id')
      .eq('id_pedido', idPedido)
      .eq('id_producto', idProducto)
      .maybeSingle();

    if (existing) {
      // Actualizar cantidad
      const { data, error } = await supabase
        .from('detalle_pedidos')
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
      } as DetallePedido;
    }

    // Crear nuevo detalle
    const { data, error } = await supabase
      .from('detalle_pedidos')
      .insert({
        id_pedido: idPedido,
        id_producto: idProducto,
        cantidad,
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
    } as DetallePedido;
  },

  async updateDetalle(
    id: string,
    cantidad: number
  ): Promise<DetallePedido> {
    const updatedAt = getLocalDateTimeISO();

    const { data, error } = await supabase
      .from('detalle_pedidos')
      .update({
        cantidad,
        updated_at: updatedAt,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    const producto = await productsService.getById(data.id_producto);
    return {
      ...data,
      producto: producto || undefined,
    } as DetallePedido;
  },

  async deleteDetalle(id: string): Promise<void> {
    const { error } = await supabase
      .from('detalle_pedidos')
      .delete()
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },
};

