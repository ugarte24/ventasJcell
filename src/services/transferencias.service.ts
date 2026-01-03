import { supabase } from '@/lib/supabase';
import { TransferenciaSaldo, Sale } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO } from '@/lib/utils';
import { usersService } from './users.service';
import { salesService } from './sales.service';
// Función para generar código QR único
const generateQRCode = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `TRF-${timestamp}-${random}`.toUpperCase();
};

export const transferenciasService = {
  // ============================================================================
  // CREAR TRANSFERENCIA (GENERAR QR)
  // ============================================================================

  async create(
    idVentaOrigen: string,
    idMinoristaOrigen: string,
    saldosTransferidos: Array<{ id_producto: string; cantidad_restante: number }>
  ): Promise<TransferenciaSaldo> {
    const codigoQR = generateQRCode();
    const createdAt = getLocalDateTimeISO();
    const updatedAt = getLocalDateTimeISO();

    // Crear transferencia (sin destino aún, se asignará al escanear)
    const { data, error } = await supabase
      .from('transferencias_saldos')
      .insert({
        id_venta_origen: idVentaOrigen,
        id_minorista_origen: idMinoristaOrigen,
        id_minorista_destino: idMinoristaOrigen, // Temporal, se actualizará al escanear
        codigo_qr: codigoQR,
        saldos_transferidos: saldosTransferidos as any,
        estado: 'pendiente',
        created_at: createdAt,
        updated_at: updatedAt,
      })
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));

    const [ventaOrigen, minoristaOrigen] = await Promise.all([
      salesService.getById(idVentaOrigen),
      usersService.getById(idMinoristaOrigen),
    ]);

    return {
      ...data,
      venta_origen: ventaOrigen || undefined,
      minorista_origen: minoristaOrigen || undefined,
    } as TransferenciaSaldo;
  },

  // ============================================================================
  // ESCANEAR QR (COMPLETAR TRANSFERENCIA)
  // ============================================================================

  async escanearQR(
    codigoQR: string,
    idMinoristaDestino: string
  ): Promise<TransferenciaSaldo> {
    // Buscar transferencia por código QR
    const { data: transferencia, error: findError } = await supabase
      .from('transferencias_saldos')
      .select('*')
      .eq('codigo_qr', codigoQR)
      .eq('estado', 'pendiente')
      .single();

    if (findError || !transferencia) {
      throw new Error('Código QR no válido o transferencia ya procesada');
    }

    // Verificar que no sea el mismo minorista
    if (transferencia.id_minorista_origen === idMinoristaDestino) {
      throw new Error('No puedes escanear tu propio código QR');
    }

    // Verificar que la venta origen sea la última venta del minorista origen
    const { data: ultimaVenta, error: ventaError } = await supabase
      .from('ventas')
      .select('*')
      .eq('id_vendedor', transferencia.id_minorista_origen)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (ventaError || !ultimaVenta || ultimaVenta.id !== transferencia.id_venta_origen) {
      throw new Error('El código QR no corresponde a la última venta del minorista');
    }

    // Actualizar transferencia
    const fechaEscaneo = getLocalDateTimeISO();
    const updatedAt = getLocalDateTimeISO();

    const { data: updated, error: updateError } = await supabase
      .from('transferencias_saldos')
      .update({
        id_minorista_destino: idMinoristaDestino,
        fecha_escaneo: fechaEscaneo,
        estado: 'completada',
        updated_at: updatedAt,
      })
      .eq('id', transferencia.id)
      .select()
      .single();

    if (updateError) throw new Error(handleSupabaseError(updateError));

    const [ventaOrigen, minoristaOrigen, minoristaDestino] = await Promise.all([
      salesService.getById(updated.id_venta_origen),
      usersService.getById(updated.id_minorista_origen),
      usersService.getById(updated.id_minorista_destino),
    ]);

    return {
      ...updated,
      venta_origen: ventaOrigen || undefined,
      minorista_origen: minoristaOrigen || undefined,
      minorista_destino: minoristaDestino || undefined,
    } as TransferenciaSaldo;
  },

  // ============================================================================
  // OBTENER TRANSFERENCIAS
  // ============================================================================

  async getByMinorista(idMinorista: string): Promise<TransferenciaSaldo[]> {
    const { data, error } = await supabase
      .from('transferencias_saldos')
      .select('*')
      .or(`id_minorista_origen.eq.${idMinorista},id_minorista_destino.eq.${idMinorista}`)
      .order('created_at', { ascending: false });

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos relacionados
    const transferenciasCompletas = await Promise.all(
      (data || []).map(async (transferencia) => {
        const [ventaOrigen, minoristaOrigen, minoristaDestino] = await Promise.all([
          salesService.getById(transferencia.id_venta_origen),
          usersService.getById(transferencia.id_minorista_origen),
          usersService.getById(transferencia.id_minorista_destino),
        ]);

        return {
          ...transferencia,
          venta_origen: ventaOrigen || undefined,
          minorista_origen: minoristaOrigen || undefined,
          minorista_destino: minoristaDestino || undefined,
        } as TransferenciaSaldo;
      })
    );

    return transferenciasCompletas;
  },

  async getByCodigoQR(codigoQR: string): Promise<TransferenciaSaldo | null> {
    const { data, error } = await supabase
      .from('transferencias_saldos')
      .select('*')
      .eq('codigo_qr', codigoQR)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }

    const [ventaOrigen, minoristaOrigen, minoristaDestino] = await Promise.all([
      salesService.getById(data.id_venta_origen),
      usersService.getById(data.id_minorista_origen),
      data.id_minorista_destino ? usersService.getById(data.id_minorista_destino) : null,
    ]);

    return {
      ...data,
      venta_origen: ventaOrigen || undefined,
      minorista_origen: minoristaOrigen || undefined,
      minorista_destino: minoristaDestino || undefined,
    } as TransferenciaSaldo;
  },
};

