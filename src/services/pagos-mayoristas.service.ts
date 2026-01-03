import { supabase } from '@/lib/supabase';
import { PagoMayorista, Sale } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO, getLocalDateISO } from '@/lib/utils';
import { usersService } from './users.service';
import { salesService } from './sales.service';

export const pagosMayoristasService = {
  // ============================================================================
  // CREAR PAGO (DESPUÉS DE COMPLETAR VENTA MAYORISTA)
  // ============================================================================

  async create(
    idVenta: string,
    idMayorista: string,
    montoEsperado: number,
    metodoPago: 'efectivo' | 'qr' | 'transferencia'
  ): Promise<PagoMayorista> {
    const createdAt = getLocalDateTimeISO();
    const updatedAt = getLocalDateTimeISO();
    const fechaPago = getLocalDateISO();

    const { data, error } = await supabase
      .from('pagos_mayoristas')
      .insert({
        id_venta: idVenta,
        id_mayorista: idMayorista,
        monto_esperado: montoEsperado,
        monto_recibido: 0, // Se actualizará cuando el admin verifique
        metodo_pago: metodoPago,
        estado: 'pendiente',
        fecha_pago: fechaPago,
        created_at: createdAt,
        updated_at: updatedAt,
      })
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    const [venta, mayorista] = await Promise.all([
      salesService.getById(idVenta),
      usersService.getById(idMayorista),
    ]);

    return {
      ...data,
      venta: venta || undefined,
      mayorista: mayorista || undefined,
    } as PagoMayorista;
  },

  // ============================================================================
  // VERIFICAR PAGO (ADMINISTRADOR)
  // ============================================================================

  async verificar(
    id: string,
    idAdministrador: string,
    montoRecibido: number,
    observaciones?: string
  ): Promise<PagoMayorista> {
    const updatedAt = getLocalDateTimeISO();
    const fechaVerificacion = getLocalDateTimeISO();

    const { data, error } = await supabase
      .from('pagos_mayoristas')
      .update({
        monto_recibido: montoRecibido,
        id_administrador: idAdministrador,
        fecha_verificacion: fechaVerificacion,
        estado: 'verificado',
        observaciones,
        updated_at: updatedAt,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    return await this.getById(data.id) as PagoMayorista;
  },

  // ============================================================================
  // ACTUALIZAR PAGO (EDITAR INGRESO DE DINERO)
  // ============================================================================

  async update(
    id: string,
    montoRecibido: number,
    observaciones?: string
  ): Promise<PagoMayorista> {
    const updatedAt = getLocalDateTimeISO();

    const { data, error } = await supabase
      .from('pagos_mayoristas')
      .update({
        monto_recibido: montoRecibido,
        observaciones,
        updated_at: updatedAt,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    return await this.getById(data.id) as PagoMayorista;
  },

  // ============================================================================
  // OBTENER PAGOS
  // ============================================================================

  async getAll(idMayorista?: string, estado?: string): Promise<PagoMayorista[]> {
    let query = supabase
      .from('pagos_mayoristas')
      .select('*')
      .order('created_at', { ascending: false });

    if (idMayorista) {
      query = query.eq('id_mayorista', idMayorista);
    }

    if (estado) {
      query = query.eq('estado', estado);
    }

    const { data, error } = await query;

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos relacionados
    const pagosCompletos = await Promise.all(
      (data || []).map(async (pago) => {
        const [venta, mayorista, administrador] = await Promise.all([
          salesService.getById(pago.id_venta),
          usersService.getById(pago.id_mayorista),
          pago.id_administrador ? usersService.getById(pago.id_administrador) : null,
        ]);

        return {
          ...pago,
          venta: venta || undefined,
          mayorista: mayorista || undefined,
          administrador: administrador || undefined,
        } as PagoMayorista;
      })
    );

    return pagosCompletos;
  },

  async getById(id: string): Promise<PagoMayorista | null> {
    const { data, error } = await supabase
      .from('pagos_mayoristas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }

    const [venta, mayorista, administrador] = await Promise.all([
      salesService.getById(data.id_venta),
      usersService.getById(data.id_mayorista),
      data.id_administrador ? usersService.getById(data.id_administrador) : null,
    ]);

    return {
      ...data,
      venta: venta || undefined,
      mayorista: mayorista || undefined,
      administrador: administrador || undefined,
    } as PagoMayorista;
  },

  async getByVenta(idVenta: string): Promise<PagoMayorista | null> {
    const { data, error } = await supabase
      .from('pagos_mayoristas')
      .select('*')
      .eq('id_venta', idVenta)
      .maybeSingle();

    if (error) throw new Error(handleSupabaseError(error));

    if (!data) return null;

    const [venta, mayorista, administrador] = await Promise.all([
      salesService.getById(data.id_venta),
      usersService.getById(data.id_mayorista),
      data.id_administrador ? usersService.getById(data.id_administrador) : null,
    ]);

    return {
      ...data,
      venta: venta || undefined,
      mayorista: mayorista || undefined,
      administrador: administrador || undefined,
    } as PagoMayorista;
  },
};

