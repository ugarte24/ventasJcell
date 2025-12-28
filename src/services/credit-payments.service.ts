import { supabase } from '@/lib/supabase';
import { CreditPayment, Sale } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO } from '@/lib/utils';

export interface CreateCreditPaymentData {
  id_venta: string;
  monto_pagado: number;
  fecha_pago: string;
  metodo_pago: 'efectivo' | 'qr' | 'transferencia';
  numero_cuota?: number;
  observacion?: string;
  id_usuario?: string;
}

export interface UpdateCreditPaymentData {
  monto_pagado?: number;
  fecha_pago?: string;
  metodo_pago?: 'efectivo' | 'qr' | 'transferencia';
  numero_cuota?: number;
  observacion?: string;
}

export const creditPaymentsService = {
  async getAll(id_venta?: string): Promise<CreditPayment[]> {
    let query = supabase
      .from('pagos_credito')
      .select('*')
      .order('fecha_pago', { ascending: false });

    if (id_venta) {
      query = query.eq('id_venta', id_venta);
    }

    const { data, error } = await query;

    if (error) throw new Error(handleSupabaseError(error));
    return data as CreditPayment[];
  },

  async getById(id: string): Promise<CreditPayment | null> {
    const { data, error } = await supabase
      .from('pagos_credito')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }
    return data as CreditPayment;
  },

  async create(paymentData: CreateCreditPaymentData): Promise<CreditPayment> {
    // Validar que la venta existe y es a crédito
    const { data: venta, error: ventaError } = await supabase
      .from('ventas')
      .select('total, total_con_interes, metodo_pago, monto_pagado, estado, meses_credito, cuota_inicial, tasa_interes, monto_interes')
      .eq('id', paymentData.id_venta)
      .single();

    if (ventaError) {
      throw new Error(`Error al verificar la venta: ${handleSupabaseError(ventaError)}`);
    }

    if (!venta) {
      throw new Error('Venta no encontrada');
    }

    if (venta.metodo_pago !== 'credito') {
      throw new Error('Esta venta no es a crédito');
    }

    if (venta.estado === 'anulada') {
      throw new Error('No se puede registrar un pago para una venta anulada');
    }

    // Validar que se especifique número de cuota
    if (!paymentData.numero_cuota || paymentData.numero_cuota < 1) {
      throw new Error('Debes especificar el número de cuota a pagar');
    }

    // Validar que la cuota no exceda el número total de cuotas
    const cuotas = venta.meses_credito || 1;
    if (paymentData.numero_cuota > cuotas) {
      throw new Error(`La cuota ${paymentData.numero_cuota} excede el número total de cuotas (${cuotas})`);
    }

    // Verificar si la cuota ya está pagada
    const { data: pagosExistentes } = await supabase
      .from('pagos_credito')
      .select('numero_cuota')
      .eq('id_venta', paymentData.id_venta)
      .eq('numero_cuota', paymentData.numero_cuota);

    if (pagosExistentes && pagosExistentes.length > 0) {
      throw new Error(`La cuota ${paymentData.numero_cuota} ya está pagada`);
    }

    // Calcular saldo pendiente usando total con interés
    // Si total_con_interes no está disponible o no es correcto, recalcularlo
    let totalConInteres = parseFloat(venta.total_con_interes || venta.total);
    
    // Si hay interés, recalcular total_con_interes para asegurar que esté correcto
    if (venta.monto_interes && venta.monto_interes > 0) {
      const numCuotas = venta.meses_credito || 1;
      // total_con_interes = total + (interés × cuotas) porque el interés se suma a cada cuota
      totalConInteres = parseFloat(venta.total.toString()) + (parseFloat(venta.monto_interes.toString()) * numCuotas);
    }
    
    // Obtener todos los pagos de crédito registrados para calcular el monto pagado correctamente
    const { data: pagosRegistrados } = await supabase
      .from('pagos_credito')
      .select('monto_pagado')
      .eq('id_venta', paymentData.id_venta);
    
    // Calcular monto pagado: cuota_inicial + suma de todos los pagos registrados
    const cuotaInicial = parseFloat(venta.cuota_inicial || '0');
    const sumaPagosRegistrados = pagosRegistrados?.reduce((sum, pago) => sum + parseFloat(pago.monto_pagado.toString()), 0) || 0;
    const montoPagadoActual = cuotaInicial + sumaPagosRegistrados;
    
    const saldoPendiente = totalConInteres - montoPagadoActual;

    // Validar que el monto a pagar no exceda el saldo pendiente
    // Permitir un pequeño margen (0.02) para manejar redondeos de decimales
    if (paymentData.monto_pagado > saldoPendiente + 0.02) {
      throw new Error(
        `El monto a pagar (Bs. ${paymentData.monto_pagado.toFixed(2)}) excede el saldo pendiente (Bs. ${saldoPendiente.toFixed(2)})`
      );
    }
    
    // Si el monto a pagar es mayor al saldo pendiente pero dentro del margen de redondeo,
    // ajustar el monto al saldo pendiente exacto
    if (paymentData.monto_pagado > saldoPendiente && paymentData.monto_pagado <= saldoPendiente + 0.02) {
      paymentData.monto_pagado = parseFloat(saldoPendiente.toFixed(2));
    }

    if (paymentData.monto_pagado <= 0) {
      throw new Error('El monto a pagar debe ser mayor a cero');
    }

    // Validar fecha de pago
    const fechaPago = new Date(paymentData.fecha_pago);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fechaPago > hoy) {
      throw new Error('La fecha de pago no puede ser futura');
    }

    // Obtener timestamp de creación
    const createdAt = getLocalDateTimeISO();

    // Crear el pago
    const { data: pago, error: pagoError } = await supabase
      .from('pagos_credito')
      .insert({
        id_venta: paymentData.id_venta,
        monto_pagado: paymentData.monto_pagado,
        fecha_pago: paymentData.fecha_pago,
        metodo_pago: paymentData.metodo_pago,
        numero_cuota: paymentData.numero_cuota,
        observacion: paymentData.observacion || null,
        id_usuario: paymentData.id_usuario || null,
        created_at: createdAt,
      })
      .select()
      .single();

    if (pagoError) {
      throw new Error(`Error al crear el pago: ${handleSupabaseError(pagoError)}`);
    }

    // Actualizar monto_pagado en la venta: cuota_inicial + suma de todos los pagos
    // Primero obtener todos los pagos registrados (ya incluyendo el que acabamos de crear)
    const { data: todosLosPagos } = await supabase
      .from('pagos_credito')
      .select('monto_pagado')
      .eq('id_venta', paymentData.id_venta);
    
    // Reutilizar cuotaInicial ya declarado arriba
    const sumaPagos = todosLosPagos?.reduce((sum, p) => sum + parseFloat(p.monto_pagado.toString()), 0) || 0;
    const nuevoMontoPagado = cuotaInicial + sumaPagos;
    
    // Determinar estado_credito
    // Usar un margen más amplio para comparación de redondeos (0.05 en lugar de 0.01)
    let nuevoEstadoCredito: 'pendiente' | 'parcial' | 'pagado' | 'vencido';
    const saldoPendienteCalculado = totalConInteres - nuevoMontoPagado;
    if (saldoPendienteCalculado <= 0.05) {
      // Si el saldo pendiente es menor o igual a 0.05, considerar pagado (para manejar redondeos)
      nuevoEstadoCredito = 'pagado';
    } else if (nuevoMontoPagado > cuotaInicial) {
      nuevoEstadoCredito = 'parcial';
    } else {
      nuevoEstadoCredito = 'pendiente';
    }
    
    // Actualizar monto_pagado, estado_credito y updated_at en la venta
    const updatedAt = getLocalDateTimeISO();
    await supabase
      .from('ventas')
      .update({ 
        monto_pagado: nuevoMontoPagado,
        estado_credito: nuevoEstadoCredito,
        updated_at: updatedAt 
      })
      .eq('id', paymentData.id_venta);

    return pago as CreditPayment;
  },

  async delete(id: string): Promise<void> {
    // Obtener id_venta y datos de la venta antes de eliminar
    const { data: pago, error: pagoError } = await supabase
      .from('pagos_credito')
      .select('id_venta')
      .eq('id', id)
      .single();

    if (pagoError) {
      throw new Error(`Error al obtener el pago: ${handleSupabaseError(pagoError)}`);
    }

    // Obtener datos de la venta para recalcular monto_pagado
    const { data: venta } = await supabase
      .from('ventas')
      .select('total, total_con_interes, cuota_inicial, monto_interes, meses_credito')
      .eq('id', pago.id_venta)
      .single();

    const { error } = await supabase
      .from('pagos_credito')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error al eliminar el pago: ${handleSupabaseError(error)}`);
    }

    // Recalcular monto_pagado: cuota_inicial + suma de pagos restantes
    if (pago?.id_venta && venta) {
      // Obtener todos los pagos restantes después de la eliminación
      const { data: pagosRestantes } = await supabase
        .from('pagos_credito')
        .select('monto_pagado')
        .eq('id_venta', pago.id_venta);
      
      const cuotaInicial = parseFloat(venta.cuota_inicial || '0');
      const sumaPagos = pagosRestantes?.reduce((sum, p) => sum + parseFloat(p.monto_pagado.toString()), 0) || 0;
      const nuevoMontoPagado = cuotaInicial + sumaPagos;
      
      // Calcular total_con_interes si es necesario
      let totalConInteres = parseFloat(venta.total_con_interes || venta.total);
      if (venta.monto_interes && venta.monto_interes > 0) {
        const cuotas = venta.meses_credito || 1;
        totalConInteres = parseFloat(venta.total.toString()) + (parseFloat(venta.monto_interes.toString()) * cuotas);
      }
      
      // Determinar estado_credito
      // Usar un margen más amplio para comparación de redondeos (0.05 en lugar de 0.01)
      let nuevoEstadoCredito: 'pendiente' | 'parcial' | 'pagado' | 'vencido';
      const saldoPendienteCalculado = totalConInteres - nuevoMontoPagado;
      if (saldoPendienteCalculado <= 0.05) {
        // Si el saldo pendiente es menor o igual a 0.05, considerar pagado (para manejar redondeos)
        nuevoEstadoCredito = 'pagado';
      } else if (nuevoMontoPagado > cuotaInicial) {
        nuevoEstadoCredito = 'parcial';
      } else {
        nuevoEstadoCredito = 'pendiente';
      }
      
      // Actualizar monto_pagado, estado_credito y updated_at en la venta
      const updatedAt = getLocalDateTimeISO();
      await supabase
        .from('ventas')
        .update({ 
          monto_pagado: nuevoMontoPagado,
          estado_credito: nuevoEstadoCredito,
          updated_at: updatedAt 
        })
        .eq('id', pago.id_venta);
    }
  },

  async update(id: string, updates: UpdateCreditPaymentData, idUsuario?: string): Promise<CreditPayment> {
    // Obtener el pago actual
    const { data: pagoActual, error: pagoError } = await supabase
      .from('pagos_credito')
      .select('id_venta, monto_pagado')
      .eq('id', id)
      .single();

    if (pagoError) {
      throw new Error(`Error al obtener el pago: ${handleSupabaseError(pagoError)}`);
    }

    if (!pagoActual) {
      throw new Error('Pago no encontrado');
    }

    // Obtener datos de la venta
    const { data: venta, error: ventaError } = await supabase
      .from('ventas')
      .select('total, metodo_pago, estado')
      .eq('id', pagoActual.id_venta)
      .single();

    if (ventaError) {
      throw new Error(`Error al verificar la venta: ${handleSupabaseError(ventaError)}`);
    }

    if (venta.estado === 'anulada') {
      throw new Error('No se puede editar un pago de una venta anulada');
    }

    // Si se actualiza el monto, validar
    if (updates.monto_pagado !== undefined) {
      if (updates.monto_pagado <= 0) {
        throw new Error('El monto a pagar debe ser mayor a cero');
      }

      // Calcular saldo pendiente considerando otros pagos (excluyendo el actual)
      const { data: otrosPagos, error: otrosPagosError } = await supabase
        .from('pagos_credito')
        .select('monto_pagado')
        .eq('id_venta', pagoActual.id_venta)
        .neq('id', id);

      if (otrosPagosError) {
        throw new Error(`Error al obtener otros pagos: ${handleSupabaseError(otrosPagosError)}`);
      }

      const montoOtrosPagos = otrosPagos?.reduce((sum, p) => sum + parseFloat(p.monto_pagado.toString()), 0) || 0;
      const totalVenta = parseFloat(venta.total);
      const saldoPendiente = totalVenta - montoOtrosPagos;

      // Validar que el nuevo monto no exceda el saldo pendiente
      if (updates.monto_pagado > saldoPendiente) {
        throw new Error(
          `El monto a pagar (Bs. ${updates.monto_pagado.toFixed(2)}) excede el saldo pendiente disponible (Bs. ${saldoPendiente.toFixed(2)})`
        );
      }
    }

    // Validar fecha de pago si se actualiza
    if (updates.fecha_pago) {
      const fechaPago = new Date(updates.fecha_pago);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fechaPago > hoy) {
        throw new Error('La fecha de pago no puede ser futura');
      }
    }

    // Obtener timestamp de actualización
    const updatedAt = getLocalDateTimeISO();

    // Preparar datos de actualización
    const updateData: any = {
      updated_at: updatedAt,
    };

    if (updates.monto_pagado !== undefined) {
      updateData.monto_pagado = updates.monto_pagado;
    }
    if (updates.fecha_pago !== undefined) {
      updateData.fecha_pago = updates.fecha_pago;
    }
    if (updates.metodo_pago !== undefined) {
      updateData.metodo_pago = updates.metodo_pago;
    }
    if (updates.observacion !== undefined) {
      updateData.observacion = updates.observacion || null;
    }

    // Actualizar el pago
    const { data: pagoActualizado, error: updateError } = await supabase
      .from('pagos_credito')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Error al actualizar el pago: ${handleSupabaseError(updateError)}`);
    }

    // Actualizar updated_at en la venta
    const ventaUpdatedAt = getLocalDateTimeISO();
    await supabase
      .from('ventas')
      .update({ updated_at: ventaUpdatedAt })
      .eq('id', pagoActual.id_venta);

    // El trigger actualizará automáticamente monto_pagado y estado_credito en la venta
    return pagoActualizado as CreditPayment;
  },

  async getBySaleId(id_venta: string): Promise<CreditPayment[]> {
    const { data, error } = await supabase
      .from('pagos_credito')
      .select('*')
      .eq('id_venta', id_venta)
      .order('numero_cuota', { ascending: true, nullsFirst: false })
      .order('fecha_pago', { ascending: false });

    if (error) throw new Error(handleSupabaseError(error));
    return data as CreditPayment[];
  },
};

