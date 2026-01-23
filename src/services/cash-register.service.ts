import { supabase } from '@/lib/supabase';
import { CashRegister } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO } from '@/lib/utils';

export const cashRegisterService = {
  // Obtener arqueo abierto del día actual
  async getOpenRegister(): Promise<CashRegister | null> {
    // Obtener fecha local (no UTC) para evitar problemas de zona horaria
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    try {
      const { data, error } = await supabase
        .from('arqueos_caja')
        .select('*')
        .eq('fecha', today)
        .eq('estado', 'abierto')
        .maybeSingle();

      if (error) {
        // Si es un error de "no encontrado" o 406, retornar null
        if (error.code === 'PGRST116' || error.code === '406' || error.message?.includes('Not Acceptable')) {
          return null;
        }
        // Si es un error 400, puede ser un problema de sintaxis o RLS
        if (error.code === '400' || error.message?.includes('Bad Request')) {
          console.warn('Error 400 al obtener arqueo abierto, intentando sin filtro de estado:', error);
          // Intentar sin filtro de estado como fallback
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('arqueos_caja')
            .select('*')
            .eq('fecha', today)
            .maybeSingle();
          
          if (fallbackError) {
            // Si también falla, retornar null
            if (fallbackError.code === 'PGRST116' || fallbackError.code === '406') {
              return null;
            }
            throw new Error(handleSupabaseError(fallbackError));
          }
          
          // Filtrar manualmente por estado
          if (fallbackData && fallbackData.estado === 'abierto') {
            return fallbackData as CashRegister;
          }
          return null;
        }
        throw new Error(handleSupabaseError(error));
      }
      
      return data as CashRegister | null;
    } catch (error: any) {
      // Manejar errores inesperados
      console.error('Error inesperado al obtener arqueo abierto:', error);
      return null;
    }
  },

  // Obtener todos los arqueos
  async getAll(): Promise<CashRegister[]> {
    // Obtener datos ordenados solo por fecha (más compatible)
    const { data, error } = await supabase
      .from('arqueos_caja')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw new Error(handleSupabaseError(error));
    
    // Ordenar manualmente por hora_apertura dentro de cada fecha
    return (data || []).sort((a, b) => {
      // Primero por fecha (descendente)
      if (a.fecha !== b.fecha) {
        return b.fecha.localeCompare(a.fecha);
      }
      // Luego por hora_apertura (descendente)
      const horaA = a.hora_apertura || '';
      const horaB = b.hora_apertura || '';
      return horaB.localeCompare(horaA);
    }) as CashRegister[];
  },

  // Obtener arqueo por ID
  async getById(id: string): Promise<CashRegister | null> {
    const { data, error } = await supabase
      .from('arqueos_caja')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }
    return data as CashRegister;
  },

  // Calcular total de ventas en efectivo del día
  async getTodayCashSales(): Promise<number> {
    // Obtener fecha local (no UTC) para evitar problemas de zona horaria
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('ventas')
      .select('total')
      .eq('fecha', today)
      .eq('metodo_pago', 'efectivo')
      .eq('estado', 'completada');

    if (error) throw new Error(handleSupabaseError(error));
    
    return data.reduce((sum, sale) => sum + sale.total, 0);
  },

  // Calcular total de todas las ventas del día (excluyendo créditos)
  async getTodayTotalSales(): Promise<number> {
    // Obtener fecha local (no UTC) para evitar problemas de zona horaria
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('ventas')
      .select('total')
      .eq('fecha', today)
      .eq('estado', 'completada')
      .neq('metodo_pago', 'credito'); // Excluir ventas a crédito

    if (error) throw new Error(handleSupabaseError(error));
    
    return data.reduce((sum, sale) => sum + sale.total, 0);
  },

  // Calcular total de ventas del día por método de pago (incluye crédito)
  async getTodaySalesByMethod(): Promise<{ efectivo: number; qr: number; transferencia: number; credito: number }> {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('ventas')
      .select('total, metodo_pago')
      .eq('fecha', today)
      .eq('estado', 'completada');

    if (error) throw new Error(handleSupabaseError(error));

    const totals = {
      efectivo: 0,
      qr: 0,
      transferencia: 0,
      credito: 0,
    };

    data.forEach((sale) => {
      const metodo = sale.metodo_pago as keyof typeof totals;
      if (totals[metodo] !== undefined) {
        totals[metodo] += sale.total;
      }
    });

    return totals;
  },

  // Calcular ingresos en efectivo/otros provenientes de ventas a crédito: cuota inicial + pagos de cuotas en el día
  async getTodayCreditReceipts(): Promise<number> {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Cuotas iniciales de ventas a crédito del día
    const { data: creditSales, error: creditSalesError } = await supabase
      .from('ventas')
      .select('cuota_inicial')
      .eq('fecha', today)
      .eq('metodo_pago', 'credito')
      .eq('estado', 'completada');

    if (creditSalesError) throw new Error(handleSupabaseError(creditSalesError));

    const cuotaInicialTotal = creditSales.reduce((sum, sale) => sum + (sale.cuota_inicial || 0), 0);

    // Pagos de crédito registrados hoy
    const { data: creditPayments, error: creditPaymentsError } = await supabase
      .from('pagos_credito')
      .select('monto_pagado')
      .eq('fecha_pago', today);

    if (creditPaymentsError) throw new Error(handleSupabaseError(creditPaymentsError));

    const pagosCuotasTotal = creditPayments.reduce((sum, pago) => sum + pago.monto_pagado, 0);

    return cuotaInicialTotal + pagosCuotasTotal;
  },

  // Calcular total de servicios transaccionados del día
  async getTodayServicesTotal(): Promise<number> {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const { data, error } = await supabase
      .from('registros_servicios')
      .select('total')
      .eq('fecha', today);

    if (error) throw new Error(handleSupabaseError(error));
    
    // Sumar todos los totales de servicios del día
    // El total puede ser positivo (ingreso) o negativo (egreso)
    return data.reduce((sum, registro) => sum + (registro.total || 0), 0);
  },

  // Calcular ingresos totales del día: efectivo + QR + transferencia + crédito (cuota inicial + pagos) + servicios
  async getTodayTotalIncome(): Promise<number> {
    const salesByMethod = await this.getTodaySalesByMethod();
    const creditReceipts = await this.getTodayCreditReceipts();
    const servicesTotal = await this.getTodayServicesTotal();
    return (
      (salesByMethod?.efectivo || 0) +
      (salesByMethod?.qr || 0) +
      (salesByMethod?.transferencia || 0) +
      (creditReceipts || 0) +
      (servicesTotal || 0)
    );
  },

  // Abrir caja
  async openRegister(montoInicial: number, idAdministrador: string): Promise<CashRegister> {
    // Obtener fecha local (no UTC) para evitar problemas de zona horaria
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const horaApertura = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Calcular ingresos totales del día (efectivo/QR/transf + crédito ingresado)
    const totalVentas = await this.getTodayTotalIncome();
    
    // Obtener timestamps en hora local
    const createdAt = getLocalDateTimeISO();
    const updatedAt = getLocalDateTimeISO();

    const { data, error } = await supabase
      .from('arqueos_caja')
      .insert({
        fecha: today,
        hora_apertura: horaApertura,
        monto_inicial: montoInicial,
        total_ventas: totalVentas,
        efectivo_real: null,
        diferencia: 0,
        id_administrador: idAdministrador,
        observacion: null,
        estado: 'abierto',
        created_at: createdAt, // Timestamp explícito en hora local
        updated_at: updatedAt, // Timestamp explícito en hora local
      })
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));
    return data as CashRegister;
  },

  // Cerrar caja
  async closeRegister(
    id: string,
    efectivoReal: number,
    observacion?: string
  ): Promise<CashRegister> {
    const now = new Date();
    const horaCierre = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Obtener el arqueo actual
    const arqueo = await this.getById(id);
    if (!arqueo) {
      throw new Error('Arqueo no encontrado');
    }

    // Calcular ingresos totales del día (efectivo/QR/transf + crédito ingresado)
    const totalIngresos = await this.getTodayTotalIncome();

    // Calcular diferencia
    const totalEsperado = arqueo.monto_inicial + totalIngresos;
    const diferencia = efectivoReal - totalEsperado;

    // Obtener timestamp de actualización en hora local
    const updatedAt = getLocalDateTimeISO();
    
    const { data, error } = await supabase
      .from('arqueos_caja')
      .update({
        hora_cierre: horaCierre,
        efectivo_real: efectivoReal,
        total_ventas: totalIngresos,
        diferencia: diferencia,
        observacion: observacion || null,
        estado: 'cerrado',
        updated_at: updatedAt, // Timestamp explícito en hora local
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));
    return data as CashRegister;
  },

  // Actualizar total de ventas del arqueo abierto
  async updateSalesTotal(id: string): Promise<void> {
    const totalVentas = await this.getTodayTotalIncome();
    // Obtener timestamp de actualización en hora local
    const updatedAt = getLocalDateTimeISO();
    
    const { error } = await supabase
      .from('arqueos_caja')
      .update({ 
        total_ventas: totalVentas,
        updated_at: updatedAt, // Timestamp explícito en hora local
      })
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },

  // Actualizar arqueo
  async update(
    id: string,
    updates: {
      monto_inicial?: number;
      efectivo_real?: number | null;
      observacion?: string | null;
      hora_apertura?: string;
      hora_cierre?: string | null;
    }
  ): Promise<CashRegister> {
    // Obtener el arqueo actual
    const arqueo = await this.getById(id);
    if (!arqueo) {
      throw new Error('Arqueo no encontrado');
    }

    // Si el arqueo está abierto y es del día actual, recalcular el total de ventas
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isOpenToday = arqueo.estado === 'abierto' && arqueo.fecha === today;
    let totalVentasToUse = arqueo.total_ventas;
    
    if (isOpenToday) {
      totalVentasToUse = await this.getTodayTotalIncome();
    }

    // Calcular diferencia si se actualiza efectivo_real
    let diferencia = arqueo.diferencia;
    if (updates.efectivo_real !== undefined) {
      const montoInicial = updates.monto_inicial ?? arqueo.monto_inicial;
      const totalEsperado = montoInicial + totalVentasToUse;
      diferencia = updates.efectivo_real - totalEsperado;
    } else if (updates.monto_inicial !== undefined) {
      const efectivoReal = arqueo.efectivo_real ?? 0;
      const totalEsperado = updates.monto_inicial + totalVentasToUse;
      diferencia = efectivoReal - totalEsperado;
    }

    // Obtener timestamp de actualización en hora local
    const updatedAt = getLocalDateTimeISO();
    
    // Preparar objeto de actualización
    const updateData: any = {
      ...updates,
      diferencia,
      updated_at: updatedAt, // Timestamp explícito en hora local
    };
    
    // Solo actualizar total_ventas si es del día actual y está abierto
    if (isOpenToday) {
      updateData.total_ventas = totalVentasToUse;
    }
    
    const { data, error } = await supabase
      .from('arqueos_caja')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));
    return data as CashRegister;
  },
};

