import { supabase } from '@/lib/supabase';
import { Sale, SaleDetail } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO } from '@/lib/utils';

export interface CreateSaleData {
  total: number;
  metodo_pago: 'efectivo' | 'qr' | 'transferencia' | 'credito';
  id_cliente?: string;
  id_vendedor: string;
  meses_credito?: number; // Cantidad de cuotas para el crédito (solo para créditos)
  tasa_interes?: number; // Tasa de interés mensual en porcentaje (solo para créditos)
  cuota_inicial?: number; // Cuota inicial pagada al momento de la venta (solo para créditos)
  items: Array<{
    id_producto: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
}

export const salesService = {
  async getAll(filters?: {
    fechaDesde?: string;
    fechaHasta?: string;
    id_vendedor?: string;
  }): Promise<Sale[]> {
    let query = supabase
      .from('ventas')
      .select(`
        *,
        detalle_venta (
          id,
          id_producto,
          cantidad,
          precio_unitario,
          subtotal,
          productos (
            nombre
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.fechaDesde) {
      query = query.gte('fecha', filters.fechaDesde);
    }
    if (filters?.fechaHasta) {
      query = query.lte('fecha', filters.fechaHasta);
    }
    if (filters?.id_vendedor) {
      query = query.eq('id_vendedor', filters.id_vendedor);
    }

    const { data, error } = await query;

    if (error) throw new Error(handleSupabaseError(error));
    
    // Calcular saldo_pendiente para ventas a crédito
    const salesWithBalance = (data as any[]).map(sale => {
      if (sale.metodo_pago === 'credito' && sale.monto_pagado !== null) {
        sale.saldo_pendiente = parseFloat(sale.total) - parseFloat(sale.monto_pagado || 0);
      }
      return sale;
    });
    
    return salesWithBalance;
  },

  async getCreditSales(filters?: {
    estado_credito?: 'pendiente' | 'pagado' | 'parcial' | 'vencido';
    id_cliente?: string;
  }): Promise<Sale[]> {
    let query = supabase
      .from('ventas')
      .select(`
        *,
        detalle_venta (
          id,
          id_producto,
          cantidad,
          precio_unitario,
          subtotal,
          productos (
            nombre
          )
        ),
        clientes (
          id,
          nombre,
          ci_nit,
          telefono
        )
      `)
      .eq('metodo_pago', 'credito')
      .eq('estado', 'completada')
      .order('created_at', { ascending: false });

    if (filters?.estado_credito) {
      query = query.eq('estado_credito', filters.estado_credito);
    }
    if (filters?.id_cliente) {
      query = query.eq('id_cliente', filters.id_cliente);
    }

    const { data, error } = await query;

    if (error) throw new Error(handleSupabaseError(error));
    
    // Para cada venta, obtener los pagos registrados para recalcular monto_pagado correctamente
    const ventaIds = (data as any[]).map(sale => sale.id);
    const { data: todosLosPagos } = await supabase
      .from('pagos_credito')
      .select('id_venta, monto_pagado')
      .in('id_venta', ventaIds);
    
    // Agrupar pagos por id_venta
    const pagosPorVenta = (todosLosPagos || []).reduce((acc: Record<string, number>, pago: any) => {
      if (!acc[pago.id_venta]) {
        acc[pago.id_venta] = 0;
      }
      acc[pago.id_venta] += parseFloat(pago.monto_pagado.toString());
      return acc;
    }, {});
    
    // Recalcular intereses y saldo_pendiente para cada venta
    // Esto asegura que el interés esté actualizado incluso si no se ha actualizado la venta
    const salesWithBalance = (data as any[]).map((sale) => {
      // Si es crédito y tiene tasa de interés, recalcular el interés dinámicamente
      if (sale.metodo_pago === 'credito' && sale.tasa_interes && sale.tasa_interes > 0 && !sale.interes_eximido) {
        // Calcular meses transcurridos desde la fecha de la venta
        const fechaVenta = new Date(sale.fecha + 'T00:00:00');
        const fechaActual = new Date();
        fechaActual.setHours(0, 0, 0, 0);
        fechaVenta.setHours(0, 0, 0, 0);
        const diasTranscurridos = Math.ceil((fechaActual.getTime() - fechaVenta.getTime()) / (1000 * 60 * 60 * 24));
        let mesesTranscurridos = Math.ceil(diasTranscurridos / 30.0);
        
        // El interés se calcula desde el primer mes (mínimo 1 mes)
        if (mesesTranscurridos <= 0) {
          mesesTranscurridos = 1;
        }
        
        // Calcular el total base sobre el cual se calcula el interés (total - cuota_inicial)
        const cuotaInicial = parseFloat((sale.cuota_inicial || 0).toString());
        const totalBase = parseFloat(sale.total.toString()) - cuotaInicial;
        
        // Si el total base es 0 o negativo, no hay interés
        let interesRecalculado = 0;
        if (totalBase > 0) {
          // Recalcular interés: (Total - Cuota Inicial) * (tasa / 100) * meses_transcurridos
          interesRecalculado = totalBase * (parseFloat(sale.tasa_interes.toString()) / 100.0) * mesesTranscurridos;
        }
        
        sale.monto_interes = Math.round(interesRecalculado * 100) / 100;
        // El interés se suma a cada cuota, por lo que total_con_interes = total + (interés × cuotas)
        const cuotas = sale.meses_credito || 1;
        sale.total_con_interes = parseFloat(sale.total.toString()) + (sale.monto_interes * cuotas);
      } else if (sale.metodo_pago === 'credito') {
        // Si no hay interés o está eximido, usar valores existentes
        sale.monto_interes = sale.monto_interes || 0;
        sale.total_con_interes = sale.total_con_interes || sale.total;
      }
      
      // Recalcular monto_pagado correctamente: cuota_inicial + suma de pagos registrados
      const cuotaInicial = parseFloat((sale.cuota_inicial || 0).toString());
      const sumaPagos = pagosPorVenta[sale.id] || 0;
      sale.monto_pagado = cuotaInicial + sumaPagos;
      
      // Calcular saldo pendiente
      const totalConInteres = sale.total_con_interes || sale.total;
      sale.saldo_pendiente = parseFloat(totalConInteres.toString()) - sale.monto_pagado;
      
      // Recalcular estado_credito basado en el monto pagado actualizado
      if (sale.monto_pagado >= parseFloat(totalConInteres.toString()) - 0.01) {
        sale.estado_credito = 'pagado';
      } else if (sale.monto_pagado > cuotaInicial) {
        sale.estado_credito = 'parcial';
      } else {
        sale.estado_credito = 'pendiente';
      }
      
      return sale;
    });
    
    return salesWithBalance;
  },

  async getById(id: string): Promise<Sale | null> {
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }
    return data as Sale;
  },

  async getDetails(id_venta: string): Promise<SaleDetail[]> {
    const { data, error } = await supabase
      .from('detalle_venta')
      .select('*, productos(*)')
      .eq('id_venta', id_venta)
      .order('created_at');

    if (error) throw new Error(handleSupabaseError(error));
    return data as SaleDetail[];
  },

  async create(saleData: CreateSaleData): Promise<Sale> {
    // Validar que si es crédito, tenga cliente y meses de crédito
    if (saleData.metodo_pago === 'credito') {
      if (!saleData.id_cliente) {
        throw new Error('Para ventas a crédito es obligatorio seleccionar un cliente');
      }
      if (!saleData.meses_credito || saleData.meses_credito <= 0) {
        throw new Error('Para ventas a crédito es obligatorio establecer la cantidad de cuotas');
      }
      if (saleData.meses_credito > 120) {
        throw new Error('La cantidad de cuotas no puede ser mayor a 120');
      }
    }

    // Validar stock antes de crear la venta
    for (const item of saleData.items) {
      const { data: product, error: productError } = await supabase
        .from('productos')
        .select('stock_actual, nombre, estado')
        .eq('id', item.id_producto)
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

      if (product.stock_actual < item.cantidad) {
        throw new Error(
          `Stock insuficiente para "${product.nombre}". Stock disponible: ${product.stock_actual}, solicitado: ${item.cantidad}`
        );
      }
    }

    // Crear la venta
    // Usar fecha y hora del cliente (navegador) en hora local
    const ahora = new Date();
    // Obtener fecha en hora local (no UTC)
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const fechaCliente = `${año}-${mes}-${dia}`; // YYYY-MM-DD en hora local
    const horaCliente = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`; // HH:mm en hora local
    
    // Validar que la fecha no sea null o undefined
    if (!fechaCliente || fechaCliente === 'Invalid Date' || fechaCliente.includes('NaN')) {
      throw new Error('Error al calcular la fecha de la venta');
    }
    
    // Obtener timestamp de creación en hora local
    const createdAt = getLocalDateTimeISO();
    const updatedAt = getLocalDateTimeISO(); // updated_at debe ser igual a created_at al crear
    
    // Preparar datos de la venta
    const ventaData: any = {
      total: saleData.total,
      metodo_pago: saleData.metodo_pago,
      id_cliente: saleData.id_cliente || null,
      id_vendedor: saleData.id_vendedor,
      estado: 'completada',
      fecha: fechaCliente,
      hora: horaCliente,
      created_at: createdAt,
      updated_at: updatedAt, // Establecer updated_at al crear
    };

    // Si es crédito, agregar campos de crédito
    if (saleData.metodo_pago === 'credito') {
      // Calcular fecha de vencimiento sumando meses a la fecha de la venta
      const fechaVenta = new Date(fechaCliente);
      fechaVenta.setMonth(fechaVenta.getMonth() + (saleData.meses_credito || 0));
      const añoVenc = fechaVenta.getFullYear();
      const mesVenc = String(fechaVenta.getMonth() + 1).padStart(2, '0');
      const diaVenc = String(fechaVenta.getDate()).padStart(2, '0');
      const fechaVencimiento = `${añoVenc}-${mesVenc}-${diaVenc}`;
      
      ventaData.meses_credito = saleData.meses_credito;
      ventaData.fecha_vencimiento = fechaVencimiento; // Calculado automáticamente
      ventaData.cuota_inicial = saleData.cuota_inicial || 0;
      ventaData.monto_pagado = saleData.cuota_inicial || 0; // La cuota inicial se registra como primer pago
      ventaData.estado_credito = saleData.cuota_inicial && saleData.cuota_inicial > 0 ? 'parcial' : 'pendiente';
      ventaData.tasa_interes = saleData.tasa_interes || 0;
      ventaData.interes_eximido = false;
      // El trigger calculará monto_interes y total_con_interes automáticamente
      // NOTA: El cálculo de interés debe hacerse sobre (total - cuota_inicial)
    }
    
    const { data: venta, error: ventaError } = await supabase
      .from('ventas')
      .insert(ventaData)
      .select()
      .single();

    if (ventaError) throw new Error(handleSupabaseError(ventaError));

    // Crear los detalles de la venta
    // Asegurarse de que los valores numéricos sean números con el formato correcto
    const detalles = saleData.items.map((item) => {
      // Convertir a números y asegurar formato decimal correcto para numeric(10,2)
      // Usar Math.round para evitar problemas de precisión de punto flotante
      const precioUnitario = Math.round(parseFloat(String(item.precio_unitario)) * 100) / 100;
      const subtotal = Math.round(parseFloat(String(item.subtotal)) * 100) / 100;
      const cantidad = parseInt(String(item.cantidad), 10);
      
      // Validar que todos los valores sean válidos
      if (isNaN(cantidad) || cantidad <= 0) {
        throw new Error(`Cantidad inválida para el producto: ${cantidad}`);
      }
      if (isNaN(precioUnitario) || precioUnitario < 0) {
        throw new Error(`Precio unitario inválido: ${precioUnitario}`);
      }
      if (isNaN(subtotal) || subtotal < 0) {
        throw new Error(`Subtotal inválido: ${subtotal}`);
      }
      
      return {
        id_venta: venta.id,
        id_producto: item.id_producto,
        cantidad: cantidad,
        precio_unitario: precioUnitario,
        subtotal: subtotal,
      };
    });

    // Obtener timestamp de creación en hora local para los detalles
    const detallesCreatedAt = getLocalDateTimeISO();
    
    // Agregar created_at a cada detalle
    const detallesConFecha = detalles.map(detalle => ({
      ...detalle,
      created_at: detallesCreatedAt,
    }));
    
    // Insertar todos los detalles a la vez (más eficiente)
    const { error: detallesError } = await supabase
      .from('detalle_venta')
      .insert(detallesConFecha);
    
    if (detallesError) {
      // Si falla, eliminar la venta creada
      await supabase.from('ventas').delete().eq('id', venta.id);
      throw new Error(`Error al crear detalles de venta: ${handleSupabaseError(detallesError)}`);
    }

    // El stock y los movimientos de inventario se actualizan automáticamente
    // mediante el trigger 'trigger_actualizar_stock_venta' que se ejecuta
    // cuando se inserta en detalle_venta. No es necesario hacerlo manualmente.

    return venta as Sale;
  },

  async cancel(id: string, idUsuarioAnulacion?: string, motivoAnulacion?: string): Promise<void> {
    // 1. VALIDACIONES ADICIONALES
    // Verificar que la venta existe y no esté ya anulada
    const { data: venta, error: ventaError } = await supabase
      .from('ventas')
      .select('*')
      .eq('id', id)
      .single();

    if (ventaError) {
      if (ventaError.code === 'PGRST116') {
        throw new Error('Venta no encontrada');
      }
      throw new Error(handleSupabaseError(ventaError));
    }

    if (!venta) {
      throw new Error('Venta no encontrada');
    }

    if (venta.estado === 'anulada') {
      throw new Error('La venta ya está anulada');
    }

    // Validar que la venta sea del mismo día (solo se pueden anular ventas recientes)
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const fechaHoy = `${año}-${mes}-${dia}`;

    if (venta.fecha !== fechaHoy) {
      throw new Error('Solo se pueden anular ventas del día actual');
    }

    // 2. OBTENER DETALLES DE LA VENTA PARA REVERTIR STOCK
    const { data: detalles, error: detallesError } = await supabase
      .from('detalle_venta')
      .select('*')
      .eq('id_venta', id);

    if (detallesError) {
      throw new Error(`Error al obtener detalles de la venta: ${handleSupabaseError(detallesError)}`);
    }

    // 3. CREAR MOVIMIENTOS DE INVENTARIO DE ENTRADA Y REVERTIR STOCK
    if (detalles && detalles.length > 0) {
      const fechaLocal = fechaHoy;
      const createdAt = getLocalDateTimeISO();

      // Construir observación con información de auditoría
      const observacionMovimiento = motivoAnulacion 
        ? `Devolución por anulación de venta ${id.substring(0, 8)}. Motivo: ${motivoAnulacion}. Anulado por: ${idUsuarioAnulacion || 'Sistema'}`
        : `Devolución por anulación de venta ${id.substring(0, 8)}. Anulado por: ${idUsuarioAnulacion || 'Sistema'}`;

      // Revertir stock de productos y crear movimientos de inventario
      for (const detalle of detalles) {
        // Obtener stock actual del producto
        const { data: producto, error: productoError } = await supabase
          .from('productos')
          .select('stock_actual')
          .eq('id', detalle.id_producto)
          .single();

        if (productoError) {
          throw new Error(`Error al obtener producto: ${handleSupabaseError(productoError)}`);
        }

        if (!producto) {
          throw new Error(`Producto no encontrado: ${detalle.id_producto}`);
        }

        // Actualizar stock (incrementar)
        const nuevoStock = producto.stock_actual + detalle.cantidad;
        const { error: stockError } = await supabase
          .from('productos')
          .update({ stock_actual: nuevoStock })
          .eq('id', detalle.id_producto);

        if (stockError) {
          throw new Error(`Error al actualizar stock: ${handleSupabaseError(stockError)}`);
        }

        // Crear movimiento de inventario de entrada (devolución)
        const { error: movimientoError } = await supabase
          .from('movimientos_inventario')
          .insert({
            id_producto: detalle.id_producto,
            tipo_movimiento: 'entrada',
            cantidad: detalle.cantidad,
            motivo: 'devolución',
            fecha: fechaLocal,
            id_usuario: idUsuarioAnulacion || venta.id_vendedor, // Usuario que anuló
            observacion: observacionMovimiento,
            created_at: createdAt,
          });

        if (movimientoError) {
          // Si falla el movimiento, revertir el stock
          await supabase
            .from('productos')
            .update({ stock_actual: producto.stock_actual })
            .eq('id', detalle.id_producto);
          throw new Error(`Error al crear movimiento de inventario: ${handleSupabaseError(movimientoError)}`);
        }
      }
    }

    // 4. ACTUALIZAR ESTADO DE LA VENTA
    const updatedAt = getLocalDateTimeISO();
    
    const { error: updateError } = await supabase
      .from('ventas')
      .update({ 
        estado: 'anulada',
        updated_at: updatedAt, // Timestamp explícito en hora local (fecha/hora de anulación)
      })
      .eq('id', id);

    if (updateError) {
      throw new Error(handleSupabaseError(updateError));
    }

    // 5. ACTUALIZAR EL TOTAL DE VENTAS DEL ARQUEO DE CAJA
    // Solo actualizar si la venta NO es a crédito (las ventas a crédito no se suman al arqueo)
    if (venta.metodo_pago !== 'credito') {
      // Buscar arqueo abierto del día de la venta
      const { data: arqueoAbierto, error: arqueoError } = await supabase
        .from('arqueos_caja')
        .select('*')
        .eq('fecha', venta.fecha)
        .eq('estado', 'abierto')
        .maybeSingle();

      if (arqueoError && arqueoError.code !== 'PGRST116') {
        // Si hay un error real (no es "no encontrado"), lanzar excepción
        throw new Error(`Error al buscar arqueo de caja: ${handleSupabaseError(arqueoError)}`);
      }

      // Si existe un arqueo abierto, actualizar su total_ventas
      if (arqueoAbierto) {
        // Calcular nuevo total restando el total de la venta anulada
        const nuevoTotalVentas = Math.max(0, arqueoAbierto.total_ventas - venta.total);
        
        const { error: updateArqueoError } = await supabase
          .from('arqueos_caja')
          .update({
            total_ventas: nuevoTotalVentas,
            updated_at: updatedAt,
          })
          .eq('id', arqueoAbierto.id);

        if (updateArqueoError) {
          // No lanzar error aquí para no revertir la anulación, solo loguear
          console.error('Error al actualizar arqueo de caja:', updateArqueoError);
        }
      }
    }
  },

  async getTodaySales(): Promise<Sale[]> {
    // Obtener fecha local (no UTC) para evitar problemas de zona horaria
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('ventas')
      .select(`
        *,
        detalle_venta (
          id,
          id_producto,
          cantidad,
          precio_unitario,
          subtotal,
          productos (
            nombre
          )
        )
      `)
      .eq('fecha', today)
      .eq('estado', 'completada')
      .order('created_at', { ascending: false });

    if (error) throw new Error(handleSupabaseError(error));
    return data as any[];
  },

  async getSalesByDateRange(fechaDesde: string, fechaHasta: string): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)
      .eq('estado', 'completada')
      .order('fecha', { ascending: false });

    if (error) throw new Error(handleSupabaseError(error));
    return data as Sale[];
  },

  async getProductSalesStats(fechaDesde?: string, fechaHasta?: string): Promise<Array<{
    id_producto: string;
    nombre: string;
    codigo: string;
    cantidad_total: number;
    total_ventas: number;
  }>> {
    // Obtener todas las ventas en el rango
    let query = supabase
      .from('ventas')
      .select('id')
      .eq('estado', 'completada');

    if (fechaDesde) {
      query = query.gte('fecha', fechaDesde);
    }
    if (fechaHasta) {
      query = query.lte('fecha', fechaHasta);
    }

    const { data: ventas, error: ventasError } = await query;

    if (ventasError) throw new Error(handleSupabaseError(ventasError));
    if (!ventas || ventas.length === 0) return [];

    const ventaIds = ventas.map(v => v.id);

    // Obtener detalles de venta
    const { data: detalles, error: detallesError } = await supabase
      .from('detalle_venta')
      .select('id_producto, cantidad, subtotal')
      .in('id_venta', ventaIds);

    if (detallesError) throw new Error(handleSupabaseError(detallesError));
    if (!detalles || detalles.length === 0) return [];

    // Agrupar por producto
    const productosMap = new Map<string, { cantidad: number; total: number }>();

    for (const detalle of detalles) {
      const existing = productosMap.get(detalle.id_producto) || { cantidad: 0, total: 0 };
      productosMap.set(detalle.id_producto, {
        cantidad: existing.cantidad + detalle.cantidad,
        total: existing.total + detalle.subtotal,
      });
    }

    // Obtener información de productos
    const productoIds = Array.from(productosMap.keys());
    const { data: productos, error: productosError } = await supabase
      .from('productos')
      .select('id, nombre, codigo')
      .in('id', productoIds);

    if (productosError) throw new Error(handleSupabaseError(productosError));

    // Combinar datos
    return Array.from(productosMap.entries())
      .map(([id_producto, stats]) => {
        const producto = productos?.find(p => p.id === id_producto);
        return {
          id_producto,
          nombre: producto?.nombre || 'Producto desconocido',
          codigo: producto?.codigo || 'N/A',
          cantidad_total: stats.cantidad,
          total_ventas: stats.total,
        };
      })
      .sort((a, b) => b.cantidad_total - a.cantidad_total);
  },

  async eximirInteres(id: string, eximir: boolean): Promise<Sale> {
    const updatedAt = getLocalDateTimeISO();
    
    const { data, error } = await supabase
      .from('ventas')
      .update({
        interes_eximido: eximir,
        updated_at: updatedAt,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    // El trigger recalculará automáticamente el interés
    return data as Sale;
  },
};


