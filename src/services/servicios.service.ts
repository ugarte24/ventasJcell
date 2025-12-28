import { supabase } from '@/lib/supabase';
import { Servicio, MovimientoServicio, RegistroServicio, CreateMovimientoServicioData, CreateRegistroServicioData } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO } from '@/lib/utils';

export const serviciosService = {
  // ============ SERVICIOS ============
  
  async getAllServicios(includeInactive = false): Promise<Servicio[]> {
    let query = supabase
      .from('servicios')
      .select('*')
      .order('nombre');

    if (!includeInactive) {
      query = query.eq('estado', 'activo');
    }

    const { data, error } = await query;

    if (error) throw new Error(handleSupabaseError(error));
    return data as Servicio[];
  },

  async getServicioById(id: string): Promise<Servicio | null> {
    const { data, error } = await supabase
      .from('servicios')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }
    return data as Servicio;
  },

  async createServicio(servicio: Omit<Servicio, 'id' | 'created_at' | 'updated_at' | 'saldo_actual'>): Promise<Servicio> {
    const { data, error } = await supabase
      .from('servicios')
      .insert({
        nombre: servicio.nombre,
        descripcion: servicio.descripcion || null,
        estado: servicio.estado || 'activo',
      })
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));
    return data as Servicio;
  },

  async updateServicio(id: string, updates: Partial<Omit<Servicio, 'id' | 'created_at' | 'updated_at'>>): Promise<Servicio> {
    const { data, error } = await supabase
      .from('servicios')
      .update({
        ...updates,
        updated_at: getLocalDateTimeISO(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));
    return data as Servicio;
  },

  async deleteServicio(id: string): Promise<void> {
    const { error } = await supabase
      .from('servicios')
      .delete()
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },

  // ============ MOVIMIENTOS ============

  async getAllMovimientos(filters?: {
    id_servicio?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<MovimientoServicio[]> {
    let query = supabase
      .from('movimientos_servicios')
      .select('*')
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.id_servicio) {
      query = query.eq('id_servicio', filters.id_servicio);
    }

    if (filters?.fechaDesde) {
      query = query.gte('fecha', filters.fechaDesde);
    }

    if (filters?.fechaHasta) {
      query = query.lte('fecha', filters.fechaHasta);
    }

    const { data, error } = await query;

    if (error) throw new Error(handleSupabaseError(error));
    return data as MovimientoServicio[];
  },

  async getMovimientoById(id: string): Promise<MovimientoServicio | null> {
    const { data, error } = await supabase
      .from('movimientos_servicios')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }
    return data as MovimientoServicio;
  },

  async createMovimiento(movimientoData: CreateMovimientoServicioData): Promise<MovimientoServicio> {
    // Calcular el saldo anterior correctamente
    // Si hay movimientos del mismo día, usar el saldo_nuevo del último movimiento
    // Si no hay movimientos del mismo día, usar 0
    let saldoAnterior = 0;
    
    // Verificar si hay movimientos del mismo día para este servicio
    const { data: movimientosDelDia } = await supabase
      .from('movimientos_servicios')
      .select('saldo_nuevo')
      .eq('id_servicio', movimientoData.id_servicio)
      .eq('fecha', movimientoData.fecha)
      .order('hora', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (movimientosDelDia && movimientosDelDia.saldo_nuevo !== null) {
      // Si hay movimientos del mismo día, usar el saldo_nuevo del último movimiento
      saldoAnterior = movimientosDelDia.saldo_nuevo;
    }

    const saldoNuevo = saldoAnterior + movimientoData.monto;

    const { data, error } = await supabase
      .from('movimientos_servicios')
      .insert({
        id_servicio: movimientoData.id_servicio,
        tipo: movimientoData.tipo || 'aumento',
        monto: movimientoData.monto,
        saldo_anterior: saldoAnterior,
        saldo_nuevo: saldoNuevo,
        fecha: movimientoData.fecha,
        hora: movimientoData.hora,
        id_usuario: movimientoData.id_usuario,
        observacion: movimientoData.observacion || null,
      })
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    // Si existe un registro para esta fecha, actualizarlo para que el trigger recalcule monto_aumentado y total
    const registroExistente = await this.getRegistroPorFecha(movimientoData.id_servicio, movimientoData.fecha);
    if (registroExistente) {
      // Calcular la suma de todos los aumentos del día desde la base de datos
      const { data: movimientosDelDia } = await supabase
        .from('movimientos_servicios')
        .select('monto')
        .eq('id_servicio', movimientoData.id_servicio)
        .eq('fecha', movimientoData.fecha)
        .eq('tipo', 'aumento');
      
      const sumaAumentos = movimientosDelDia?.reduce((sum, mov) => sum + (mov.monto || 0), 0) || 0;
      
      // Actualizar el registro pasando explícitamente el monto_aumentado para que se guarde correctamente
      await this.updateRegistro(registroExistente.id, {
        saldo_inicial: registroExistente.saldo_inicial,
        saldo_final: registroExistente.saldo_final,
        monto_aumentado: sumaAumentos, // Pasar explícitamente la suma de aumentos
        observacion: registroExistente.observacion || undefined,
      });
    }

    return data as MovimientoServicio;
  },

  async updateMovimiento(id: string, updates: { monto: number; observacion?: string }): Promise<MovimientoServicio> {
    if (!id) {
      throw new Error('ID de movimiento no válido');
    }

    // Obtener el movimiento actual
    const movimientoActual = await this.getMovimientoById(id);
    if (!movimientoActual) {
      throw new Error(`Movimiento no encontrado con ID: ${id}`);
    }

    // El saldo nuevo del movimiento será: saldo anterior del movimiento + monto nuevo
    const nuevoSaldoMovimiento = movimientoActual.saldo_anterior + updates.monto;

    // Preparar los datos de actualización
    const updateData: any = {
      monto: updates.monto,
      saldo_nuevo: nuevoSaldoMovimiento,
    };
    
    // Solo incluir observación si se proporciona
    if (updates.observacion !== undefined) {
      updateData.observacion = updates.observacion;
    } else if (movimientoActual.observacion) {
      updateData.observacion = movimientoActual.observacion;
    }

    // Actualizar el movimiento sin select para evitar error 406
    const { error: updateError } = await supabase
      .from('movimientos_servicios')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      throw new Error(handleSupabaseError(updateError));
    }

    // Obtener el movimiento actualizado
    const movimientoActualizado = await this.getMovimientoById(id);
    if (!movimientoActualizado) {
      throw new Error('Error al obtener el movimiento actualizado');
    }

    // Obtener todos los movimientos del mismo día ordenados por hora y created_at (ascendente)
    // para recalcular los saldos de los movimientos posteriores
    const { data: todosMovimientosDelDia, error: errorMovimientos } = await supabase
      .from('movimientos_servicios')
      .select('*')
      .eq('id_servicio', movimientoActual.id_servicio)
      .eq('fecha', movimientoActual.fecha)
      .order('hora', { ascending: true })
      .order('created_at', { ascending: true });

    if (errorMovimientos) {
      throw new Error(handleSupabaseError(errorMovimientos));
    }

    // Recalcular saldos de todos los movimientos posteriores al editado
    if (todosMovimientosDelDia && todosMovimientosDelDia.length > 0) {
      // Encontrar el índice del movimiento editado
      const indiceEditado = todosMovimientosDelDia.findIndex(mov => mov.id === id);
      
      if (indiceEditado !== -1) {
        // Recalcular desde el movimiento editado en adelante
        for (let i = indiceEditado; i < todosMovimientosDelDia.length; i++) {
          const mov = todosMovimientosDelDia[i];
          
          // Determinar el saldo anterior
          let saldoAnteriorMov = 0;
          if (i === 0) {
            // Si es el primer movimiento del día, saldo anterior es 0
            saldoAnteriorMov = 0;
          } else {
            // Si no es el primero, usar el saldo_nuevo del movimiento anterior
            saldoAnteriorMov = todosMovimientosDelDia[i - 1].saldo_nuevo;
          }

          // Calcular el nuevo saldo
          const nuevoSaldo = saldoAnteriorMov + mov.monto;

          // Actualizar solo si el saldo cambió o si es el movimiento editado
          if (mov.saldo_anterior !== saldoAnteriorMov || mov.saldo_nuevo !== nuevoSaldo || mov.id === id) {
            const { error: updateMovError } = await supabase
              .from('movimientos_servicios')
              .update({
                saldo_anterior: saldoAnteriorMov,
                saldo_nuevo: nuevoSaldo,
              })
              .eq('id', mov.id);

            if (updateMovError) {
              console.error(`Error al actualizar movimiento ${mov.id}:`, updateMovError);
            } else {
              // Actualizar el objeto en memoria para que el siguiente cálculo use el valor correcto
              mov.saldo_anterior = saldoAnteriorMov;
              mov.saldo_nuevo = nuevoSaldo;
            }
          }
        }
      }
    }

    // Si existe un registro para esta fecha, actualizarlo para que el trigger recalcule total
    try {
      const registroExistente = await this.getRegistroPorFecha(movimientoActual.id_servicio, movimientoActual.fecha);
      if (registroExistente) {
        // Calcular la suma de todos los aumentos del día desde la base de datos
        const { data: movimientosDelDia } = await supabase
          .from('movimientos_servicios')
          .select('monto')
          .eq('id_servicio', movimientoActual.id_servicio)
          .eq('fecha', movimientoActual.fecha)
          .eq('tipo', 'aumento');
        
        const sumaAumentos = movimientosDelDia?.reduce((sum, mov) => sum + (mov.monto || 0), 0) || 0;
        
        // Actualizar el registro pasando explícitamente el monto_aumentado para que se guarde correctamente
        await this.updateRegistro(registroExistente.id, {
          saldo_inicial: registroExistente.saldo_inicial,
          saldo_final: registroExistente.saldo_final,
          monto_aumentado: sumaAumentos,
          observacion: registroExistente.observacion || undefined,
        });
      }
    } catch (error) {
      console.warn('No se pudo actualizar el registro diario:', error);
    }

    // Obtener el movimiento actualizado final
    const movimientoFinal = await this.getMovimientoById(id);
    if (!movimientoFinal) {
      throw new Error('Error al obtener el movimiento actualizado');
    }

    return movimientoFinal;
  },

  async deleteMovimiento(id: string): Promise<void> {
    // Obtener el movimiento
    const movimiento = await this.getMovimientoById(id);
    if (!movimiento) {
      throw new Error('Movimiento no encontrado');
    }

    // Eliminar el movimiento
    const { error } = await supabase
      .from('movimientos_servicios')
      .delete()
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },

  // ============ REGISTROS ============

  async getAllRegistros(filters?: {
    id_servicio?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<RegistroServicio[]> {
    let query = supabase
      .from('registros_servicios')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.id_servicio) {
      query = query.eq('id_servicio', filters.id_servicio);
    }

    if (filters?.fechaDesde) {
      query = query.gte('fecha', filters.fechaDesde);
    }

    if (filters?.fechaHasta) {
      query = query.lte('fecha', filters.fechaHasta);
    }

    const { data, error } = await query;

    if (error) throw new Error(handleSupabaseError(error));
    return data as RegistroServicio[];
  },

  async getRegistroById(id: string): Promise<RegistroServicio | null> {
    const { data, error } = await supabase
      .from('registros_servicios')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }
    return data as RegistroServicio;
  },

  async getRegistroPorFecha(id_servicio: string, fecha: string): Promise<RegistroServicio | null> {
    try {
      const { data, error } = await supabase
        .from('registros_servicios')
        .select('id,id_servicio,fecha,saldo_inicial,saldo_final,total,monto_aumentado,id_usuario,observacion,created_at,updated_at')
        .eq('id_servicio', id_servicio)
        .eq('fecha', fecha)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') return null;
        // Si es error 406, intentar sin especificar columnas
        if (error.code === 'PGRST301' || error.message?.includes('406')) {
          const { data: data2, error: error2 } = await supabase
            .from('registros_servicios')
            .select('*')
            .eq('id_servicio', id_servicio)
            .eq('fecha', fecha)
            .maybeSingle();
          
          if (error2) {
            if (error2.code === 'PGRST116') return null;
            throw new Error(handleSupabaseError(error2));
          }
          return data2 as RegistroServicio | null;
        }
        throw new Error(handleSupabaseError(error));
      }
      return data as RegistroServicio | null;
    } catch (error: any) {
      // Si hay un error, retornar null en lugar de lanzar excepción
      if (error.message?.includes('406') || error.code === 'PGRST301') {
        return null;
      }
      throw error;
    }
  },

  async createRegistro(registroData: CreateRegistroServicioData): Promise<RegistroServicio> {
    // Verificar que no exista ya un registro para esta fecha y servicio
    const existe = await this.getRegistroPorFecha(registroData.id_servicio, registroData.fecha);
    if (existe) {
      throw new Error('Ya existe un registro para esta fecha y servicio');
    }

    // Calcular la suma de todos los aumentos del día si no se proporciona
    let montoAumentadoFinal = registroData.monto_aumentado;
    if (montoAumentadoFinal === undefined || montoAumentadoFinal === null) {
      const { data: movimientosDelDia } = await supabase
        .from('movimientos_servicios')
        .select('monto')
        .eq('id_servicio', registroData.id_servicio)
        .eq('fecha', registroData.fecha)
        .eq('tipo', 'aumento');
      
      montoAumentadoFinal = movimientosDelDia?.reduce((sum, mov) => sum + (mov.monto || 0), 0) || 0;
    }

    const { data, error } = await supabase
      .from('registros_servicios')
      .insert({
        id_servicio: registroData.id_servicio,
        fecha: registroData.fecha,
        saldo_inicial: registroData.saldo_inicial,
        saldo_final: registroData.saldo_final,
        monto_aumentado: montoAumentadoFinal, // Siempre pasar un valor explícito
        id_usuario: registroData.id_usuario,
        observacion: registroData.observacion || null,
      })
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));
    return data as RegistroServicio;
  },

  async updateRegistro(id: string, updates: Partial<Omit<RegistroServicio, 'id' | 'created_at' | 'updated_at'>>): Promise<RegistroServicio> {
    // Si monto_aumentado no está en updates, calcularlo desde los movimientos
    if (updates.monto_aumentado === undefined) {
      // Obtener el registro actual para tener id_servicio y fecha
      const registroActual = await this.getRegistroById(id);
      if (registroActual) {
        const { data: movimientosDelDia } = await supabase
          .from('movimientos_servicios')
          .select('monto')
          .eq('id_servicio', registroActual.id_servicio)
          .eq('fecha', registroActual.fecha)
          .eq('tipo', 'aumento');
        
        const sumaAumentos = movimientosDelDia?.reduce((sum, mov) => sum + (mov.monto || 0), 0) || 0;
        updates.monto_aumentado = sumaAumentos;
      }
    }

    const { data, error } = await supabase
      .from('registros_servicios')
      .update({
        ...updates,
        updated_at: getLocalDateTimeISO(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));
    return data as RegistroServicio;
  },

  async deleteRegistro(id: string): Promise<void> {
    const { error } = await supabase
      .from('registros_servicios')
      .delete()
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },
};

