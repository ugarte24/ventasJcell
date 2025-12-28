import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO } from '@/lib/utils';

export interface InventoryMovement {
  id: string;
  id_producto: string;
  tipo_movimiento: 'entrada' | 'salida';
  cantidad: number;
  motivo: 'venta' | 'ajuste' | 'compra' | 'devolución';
  fecha: string;
  id_usuario: string | null;
  observacion: string | null;
  estado?: 'activo' | 'anulado';
  created_at: string;
  producto?: {
    nombre: string;
    codigo: string;
  };
  usuario?: {
    nombre: string;
  };
}

export interface CreateInventoryMovementData {
  id_producto: string;
  tipo_movimiento: 'entrada' | 'salida';
  cantidad: number;
  motivo: 'venta' | 'ajuste' | 'compra' | 'devolución';
  fecha?: string;
  id_usuario?: string | null;
  observacion?: string | null;
}

export const inventoryMovementsService = {
  async getAll(filters?: {
    fechaDesde?: string;
    fechaHasta?: string;
    id_producto?: string;
    tipo_movimiento?: 'entrada' | 'salida';
    motivo?: 'venta' | 'ajuste' | 'compra' | 'devolución';
  }): Promise<InventoryMovement[]> {
    let query = supabase
      .from('movimientos_inventario')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.fechaDesde) {
      query = query.gte('fecha', filters.fechaDesde);
    }
    if (filters?.fechaHasta) {
      query = query.lte('fecha', filters.fechaHasta);
    }
    if (filters?.id_producto) {
      query = query.eq('id_producto', filters.id_producto);
    }
    if (filters?.tipo_movimiento) {
      query = query.eq('tipo_movimiento', filters.tipo_movimiento);
    }
    if (filters?.motivo) {
      query = query.eq('motivo', filters.motivo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener movimientos de inventario:', error);
      throw new Error(handleSupabaseError(error));
    }
    
    if (!data || data.length === 0) return [];

    // Obtener productos y usuarios relacionados
    const productIds = [...new Set(data.map((item: any) => item.id_producto))];
    const userIds = [...new Set(data.map((item: any) => item.id_usuario).filter(Boolean))];

    const productsMap = new Map();
    const usersMap = new Map();

    if (productIds.length > 0) {
      try {
        const { data: products, error: productsError } = await supabase
          .from('productos')
          .select('id, nombre, codigo')
          .in('id', productIds);
        
        if (productsError) {
          console.error('Error al obtener productos:', productsError);
        } else if (products) {
          products.forEach((p: any) => {
            productsMap.set(p.id, { nombre: p.nombre, codigo: p.codigo });
          });
        }
      } catch (error) {
        console.error('Error al obtener productos:', error);
      }
    }

    if (userIds.length > 0) {
      try {
        const { data: users, error: usersError } = await supabase
          .from('usuarios')
          .select('id, nombre')
          .in('id', userIds);
        
        if (usersError) {
          console.error('Error al obtener usuarios:', usersError);
        } else if (users) {
          users.forEach((u: any) => {
            usersMap.set(u.id, { nombre: u.nombre });
          });
        }
      } catch (error) {
        console.error('Error al obtener usuarios:', error);
      }
    }

    // Transformar los datos agregando las relaciones
    return data.map((item: any) => ({
      ...item,
      producto: productsMap.get(item.id_producto),
      usuario: item.id_usuario ? usersMap.get(item.id_usuario) : undefined,
    })) as InventoryMovement[];
  },

  async getById(id: string): Promise<InventoryMovement | null> {
    const { data, error } = await supabase
      .from('movimientos_inventario')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }
    
    if (!data) return null;

    // Obtener producto y usuario relacionados
    let producto;
    let usuario;

    if (data.id_producto) {
      const { data: product } = await supabase
        .from('productos')
        .select('id, nombre, codigo')
        .eq('id', data.id_producto)
        .single();
      
      if (product) {
        producto = { nombre: product.nombre, codigo: product.codigo };
      }
    }

    if (data.id_usuario) {
      const { data: user } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .eq('id', data.id_usuario)
        .single();
      
      if (user) {
        usuario = { nombre: user.nombre };
      }
    }
    
    return {
      ...data,
      producto,
      usuario,
    } as InventoryMovement;
  },

  async create(movementData: CreateInventoryMovementData): Promise<InventoryMovement> {
    // Validar stock si es una salida
    if (movementData.tipo_movimiento === 'salida') {
      const { data: product, error: productError } = await supabase
        .from('productos')
        .select('stock_actual, nombre, estado')
        .eq('id', movementData.id_producto)
        .single();

      if (productError) {
        throw new Error(`Error al verificar producto: ${handleSupabaseError(productError)}`);
      }

      if (!product) {
        throw new Error('Producto no encontrado');
      }

      if (product.estado !== 'activo') {
        throw new Error(`El producto "${product.nombre}" está inactivo`);
      }

      if (product.stock_actual < movementData.cantidad) {
        throw new Error(
          `Stock insuficiente para "${product.nombre}". Stock disponible: ${product.stock_actual}, solicitado: ${movementData.cantidad}`
        );
      }
    }

    // Usar fecha del cliente (navegador) si no se proporciona
    let fecha: string | null = null;
    
    if (movementData.fecha) {
      fecha = movementData.fecha;
    } else {
      // Si no se proporciona fecha, usar la fecha actual del cliente en hora local
      const ahora = new Date();
      const año = ahora.getFullYear();
      const mes = String(ahora.getMonth() + 1).padStart(2, '0');
      const dia = String(ahora.getDate()).padStart(2, '0');
      fecha = `${año}-${mes}-${dia}`; // YYYY-MM-DD en hora local
    }

    // Obtener timestamp de creación en hora local
    const createdAt = getLocalDateTimeISO();
    
    // Crear el movimiento
    const { data, error } = await supabase
      .from('movimientos_inventario')
      .insert({
        id_producto: movementData.id_producto,
        tipo_movimiento: movementData.tipo_movimiento,
        cantidad: movementData.cantidad,
        motivo: movementData.motivo,
        fecha: fecha,
        id_usuario: movementData.id_usuario || null,
        observacion: movementData.observacion || null,
        estado: 'activo',
        created_at: createdAt, // Timestamp explícito en hora local
      })
      .select('*')
      .single();

    if (error) throw new Error(handleSupabaseError(error));
    
    if (!data) throw new Error('Error al crear el movimiento');

    // Actualizar stock del producto
    const { data: currentProduct, error: getStockError } = await supabase
      .from('productos')
      .select('stock_actual')
      .eq('id', movementData.id_producto)
      .single();

    if (getStockError || !currentProduct) {
      // Si falla, intentar eliminar el movimiento creado
      await supabase.from('movimientos_inventario').delete().eq('id', data.id);
      throw new Error(`Error al obtener stock: ${handleSupabaseError(getStockError)}`);
    }

    const nuevoStock = movementData.tipo_movimiento === 'entrada'
      ? currentProduct.stock_actual + movementData.cantidad
      : currentProduct.stock_actual - movementData.cantidad;

    const { error: stockError } = await supabase
      .from('productos')
      .update({ stock_actual: nuevoStock })
      .eq('id', movementData.id_producto);

    if (stockError) {
      // Si falla, intentar eliminar el movimiento creado
      await supabase.from('movimientos_inventario').delete().eq('id', data.id);
      throw new Error(`Error al actualizar stock: ${handleSupabaseError(stockError)}`);
    }

    // Obtener producto y usuario relacionados
    let producto;
    let usuario;

    if (data.id_producto) {
      const { data: product } = await supabase
        .from('productos')
        .select('id, nombre, codigo')
        .eq('id', data.id_producto)
        .single();
      
      if (product) {
        producto = { nombre: product.nombre, codigo: product.codigo };
      }
    }

    if (data.id_usuario) {
      const { data: user } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .eq('id', data.id_usuario)
        .single();
      
      if (user) {
        usuario = { nombre: user.nombre };
      }
    }
    
    return {
      ...data,
      producto,
      usuario,
    } as InventoryMovement;
  },

  async update(id: string, updates: Partial<CreateInventoryMovementData>): Promise<InventoryMovement> {
    // Obtener el movimiento actual
    const { data: currentMovement, error: getError } = await supabase
      .from('movimientos_inventario')
      .select('*')
      .eq('id', id)
      .single();

    if (getError) {
      throw new Error(`Error al obtener el movimiento: ${handleSupabaseError(getError)}`);
    }

    if (!currentMovement) {
      throw new Error('Movimiento no encontrado');
    }

    // Si se cambia el tipo de movimiento o la cantidad, necesitamos revertir el stock anterior y aplicar el nuevo
    const tipoCambio = updates.tipo_movimiento !== undefined && updates.tipo_movimiento !== currentMovement.tipo_movimiento;
    const cantidadCambio = updates.cantidad !== undefined && updates.cantidad !== currentMovement.cantidad;
    const productoCambio = updates.id_producto !== undefined && updates.id_producto !== currentMovement.id_producto;

    // Si cambia el producto, necesitamos revertir el stock del producto anterior y aplicar al nuevo
    if (productoCambio) {
      // Revertir stock del producto anterior
      const { data: oldProduct, error: oldProductError } = await supabase
        .from('productos')
        .select('stock_actual')
        .eq('id', currentMovement.id_producto)
        .single();

      if (oldProductError || !oldProduct) {
        throw new Error(`Error al obtener producto anterior: ${handleSupabaseError(oldProductError)}`);
      }

      const stockAnteriorRevertido = currentMovement.tipo_movimiento === 'entrada'
        ? oldProduct.stock_actual - currentMovement.cantidad
        : oldProduct.stock_actual + currentMovement.cantidad;

      const { error: revertError } = await supabase
        .from('productos')
        .update({ stock_actual: stockAnteriorRevertido })
        .eq('id', currentMovement.id_producto);

      if (revertError) {
        throw new Error(`Error al revertir stock del producto anterior: ${handleSupabaseError(revertError)}`);
      }

      // Validar stock del nuevo producto si es salida
      if (updates.tipo_movimiento === 'salida' || (!updates.tipo_movimiento && currentMovement.tipo_movimiento === 'salida')) {
        const cantidadFinal = updates.cantidad !== undefined ? updates.cantidad : currentMovement.cantidad;
        const { data: newProduct, error: newProductError } = await supabase
          .from('productos')
          .select('stock_actual, nombre, estado')
          .eq('id', updates.id_producto!)
          .single();

        if (newProductError || !newProduct) {
          // Revertir el cambio anterior
          await supabase
            .from('productos')
            .update({ stock_actual: oldProduct.stock_actual })
            .eq('id', currentMovement.id_producto);
          throw new Error(`Error al verificar nuevo producto: ${handleSupabaseError(newProductError)}`);
        }

        if (newProduct.estado !== 'activo') {
          // Revertir el cambio anterior
          await supabase
            .from('productos')
            .update({ stock_actual: oldProduct.stock_actual })
            .eq('id', currentMovement.id_producto);
          throw new Error(`El producto "${newProduct.nombre}" está inactivo`);
        }

        if (newProduct.stock_actual < cantidadFinal) {
          // Revertir el cambio anterior
          await supabase
            .from('productos')
            .update({ stock_actual: oldProduct.stock_actual })
            .eq('id', currentMovement.id_producto);
          throw new Error(
            `Stock insuficiente para "${newProduct.nombre}". Stock disponible: ${newProduct.stock_actual}, solicitado: ${cantidadFinal}`
          );
        }
      }
    } else if (tipoCambio || cantidadCambio) {
      // Si solo cambia el tipo o cantidad del mismo producto, revertir el stock anterior y aplicar el nuevo
      const { data: product, error: productError } = await supabase
        .from('productos')
        .select('stock_actual')
        .eq('id', currentMovement.id_producto)
        .single();

      if (productError || !product) {
        throw new Error(`Error al obtener producto: ${handleSupabaseError(productError)}`);
      }

      // Obtener valores finales
      const tipoFinal = updates.tipo_movimiento !== undefined ? updates.tipo_movimiento : currentMovement.tipo_movimiento;
      const cantidadFinal = updates.cantidad !== undefined ? updates.cantidad : currentMovement.cantidad;

      // Si solo cambia el tipo (no la cantidad), calcular el efecto neto directamente
      let nuevoStock: number;
      
      if (tipoCambio && !cantidadCambio && currentMovement.cantidad === cantidadFinal) {
        // Cambio de tipo sin cambio de cantidad: revertir el movimiento anterior y aplicar el nuevo
        // Revertir el movimiento anterior para obtener el stock antes del movimiento
        const stockAntesMovimiento = currentMovement.tipo_movimiento === 'entrada'
          ? product.stock_actual - currentMovement.cantidad
          : product.stock_actual + currentMovement.cantidad;
        
        // Aplicar el nuevo movimiento desde el stock antes del movimiento original
        nuevoStock = tipoFinal === 'entrada'
          ? stockAntesMovimiento + cantidadFinal
          : stockAntesMovimiento - cantidadFinal;
        
        // Validar stock si es salida
        if (tipoFinal === 'salida' && nuevoStock < 0) {
          throw new Error(
            `Stock insuficiente. Stock disponible después del cambio: ${nuevoStock}, no puede ser negativo`
          );
        }
      } else {
        // Cambio de cantidad o ambos: revertir y aplicar normalmente
        // Revertir el movimiento anterior
        const stockRevertido = currentMovement.tipo_movimiento === 'entrada'
          ? product.stock_actual - currentMovement.cantidad
          : product.stock_actual + currentMovement.cantidad;

        // Validar stock si es salida
        if (tipoFinal === 'salida' && stockRevertido < cantidadFinal) {
          throw new Error(
            `Stock insuficiente. Stock disponible después de revertir: ${stockRevertido}, solicitado: ${cantidadFinal}`
          );
        }

        nuevoStock = tipoFinal === 'entrada'
          ? stockRevertido + cantidadFinal
          : stockRevertido - cantidadFinal;
      }

      const { error: stockError } = await supabase
        .from('productos')
        .update({ stock_actual: nuevoStock })
        .eq('id', currentMovement.id_producto);

      if (stockError) {
        throw new Error(`Error al actualizar stock: ${handleSupabaseError(stockError)}`);
      }
    }

    // Actualizar el movimiento
    const { data: updatedMovement, error: updateError } = await supabase
      .from('movimientos_inventario')
      .update({
        ...updates,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      // Si falla la actualización, intentar revertir los cambios de stock
      if (tipoCambio || cantidadCambio || productoCambio) {
        // Aquí deberíamos revertir los cambios de stock, pero por simplicidad, lanzamos el error
        // En producción, se podría implementar un rollback más robusto
      }
      throw new Error(`Error al actualizar el movimiento: ${handleSupabaseError(updateError)}`);
    }

    if (!updatedMovement) {
      throw new Error('Error al actualizar el movimiento');
    }

    // Obtener producto y usuario relacionados
    let producto;
    let usuario;

    const productoId = updates.id_producto !== undefined ? updates.id_producto : currentMovement.id_producto;

    if (productoId) {
      const { data: product } = await supabase
        .from('productos')
        .select('id, nombre, codigo')
        .eq('id', productoId)
        .single();
      
      if (product) {
        producto = { nombre: product.nombre, codigo: product.codigo };
      }
    }

    if (updatedMovement.id_usuario) {
      const { data: user } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .eq('id', updatedMovement.id_usuario)
        .single();
      
      if (user) {
        usuario = { nombre: user.nombre };
      }
    }
    
    return {
      ...updatedMovement,
      producto,
      usuario,
    } as InventoryMovement;
  },

  async cancel(id: string, idUsuarioAnulacion?: string, motivoAnulacion?: string): Promise<InventoryMovement> {
    // Obtener el movimiento actual
    const { data: currentMovement, error: getError } = await supabase
      .from('movimientos_inventario')
      .select('*')
      .eq('id', id)
      .single();

    if (getError) {
      throw new Error(`Error al obtener el movimiento: ${handleSupabaseError(getError)}`);
    }

    if (!currentMovement) {
      throw new Error('Movimiento no encontrado');
    }

    // Validar que el movimiento no esté ya anulado
    if (currentMovement.estado === 'anulado') {
      throw new Error('El movimiento ya está anulado');
    }

    // Validar que no sea un movimiento generado por una venta (motivo 'venta')
    // Los movimientos de venta solo se pueden anular anulando la venta completa
    if (currentMovement.motivo === 'venta') {
      throw new Error('No se puede anular un movimiento generado por una venta. Anula la venta completa en su lugar.');
    }

    // Obtener el producto para revertir el stock
    const { data: product, error: productError } = await supabase
      .from('productos')
      .select('stock_actual, nombre, estado')
      .eq('id', currentMovement.id_producto)
      .single();

    if (productError || !product) {
      throw new Error(`Error al obtener producto: ${handleSupabaseError(productError)}`);
    }

    if (product.estado !== 'activo') {
      throw new Error(`El producto "${product.nombre}" está inactivo`);
    }

    // Revertir el stock del producto
    // Si era entrada, restar; si era salida, sumar
    const nuevoStock = currentMovement.tipo_movimiento === 'entrada'
      ? product.stock_actual - currentMovement.cantidad
      : product.stock_actual + currentMovement.cantidad;

    // Validar que el stock no sea negativo después de revertir
    if (nuevoStock < 0) {
      throw new Error(
        `No se puede anular el movimiento. El stock quedaría negativo (${nuevoStock}). Stock actual: ${product.stock_actual}`
      );
    }

    // Actualizar el stock del producto
    const { error: stockError } = await supabase
      .from('productos')
      .update({ stock_actual: nuevoStock })
      .eq('id', currentMovement.id_producto);

    if (stockError) {
      throw new Error(`Error al revertir stock: ${handleSupabaseError(stockError)}`);
    }

    // Construir observación de anulación
    const observacionAnulacion = motivoAnulacion
      ? `${currentMovement.observacion || ''}\n[ANULADO] Motivo: ${motivoAnulacion}. Anulado por: ${idUsuarioAnulacion || 'Sistema'}`.trim()
      : `${currentMovement.observacion || ''}\n[ANULADO] Anulado por: ${idUsuarioAnulacion || 'Sistema'}`.trim();

    // Marcar el movimiento como anulado
    const { data: updatedMovement, error: updateError } = await supabase
      .from('movimientos_inventario')
      .update({
        estado: 'anulado',
        observacion: observacionAnulacion,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      // Si falla la actualización, intentar revertir el stock
      await supabase
        .from('productos')
        .update({ stock_actual: product.stock_actual })
        .eq('id', currentMovement.id_producto);
      throw new Error(`Error al anular el movimiento: ${handleSupabaseError(updateError)}`);
    }

    if (!updatedMovement) {
      // Si falla, intentar revertir el stock
      await supabase
        .from('productos')
        .update({ stock_actual: product.stock_actual })
        .eq('id', currentMovement.id_producto);
      throw new Error('Error al anular el movimiento');
    }

    // Obtener producto y usuario relacionados
    let producto;
    let usuario;

    if (updatedMovement.id_producto) {
      const { data: productData } = await supabase
        .from('productos')
        .select('id, nombre, codigo')
        .eq('id', updatedMovement.id_producto)
        .single();
      
      if (productData) {
        producto = { nombre: productData.nombre, codigo: productData.codigo };
      }
    }

    if (updatedMovement.id_usuario) {
      const { data: user } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .eq('id', updatedMovement.id_usuario)
        .single();
      
      if (user) {
        usuario = { nombre: user.nombre };
      }
    }
    
    return {
      ...updatedMovement,
      producto,
      usuario,
    } as InventoryMovement;
  },
};

