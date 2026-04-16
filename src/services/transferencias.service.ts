import { supabase } from '@/lib/supabase';
import { TransferenciaSaldo, Sale } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO, parseDateOnlyLocal } from '@/lib/utils';
import { usersService } from './users.service';
import { salesService } from './sales.service';
// Función para generar código QR único
const generateQRCode = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `TRF-${timestamp}-${random}`.toUpperCase();
};

async function enrichSaldosTransferidosConNombres(
  saldos: unknown
): Promise<unknown> {
  if (!Array.isArray(saldos) || saldos.length === 0) return saldos;

  type SaldoLike = { id_producto?: string; cantidad_restante?: number; nombre?: string };
  const rows = saldos as SaldoLike[];
  const ids = Array.from(
    new Set(
      rows
        .map((s) => (typeof s.id_producto === 'string' ? s.id_producto : ''))
        .filter((id) => id.length > 0)
    )
  );

  if (!ids.length) return saldos;

  const { data, error } = await supabase
    .from('productos')
    .select('id, nombre')
    .in('id', ids);

  if (error || !data?.length) return saldos;

  const nombrePorId = new Map<string, string>(data.map((p) => [p.id, p.nombre]));
  return rows.map((s) => ({
    ...s,
    nombre: s.nombre || (s.id_producto ? nombrePorId.get(s.id_producto) : undefined),
  }));
}

function ventaOrdenTimestamp(venta: Sale & { created_at?: string }): number {
  if (venta.created_at) {
    const t = new Date(venta.created_at).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const d = parseDateOnlyLocal(venta.fecha);
  if (Number.isNaN(d.getTime())) return 0;
  const parts = (venta.hora || '00:00').split(':');
  const hh = parseInt(parts[0] ?? '0', 10);
  const mm = parseInt(parts[1] ?? '0', 10);
  d.setHours(Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);
  return d.getTime();
}

type TransferenciaRow = Record<string, unknown>;

async function cargarTransferenciaSaldoEnriquecida(
  row: TransferenciaRow
): Promise<TransferenciaSaldo> {
  const [ventaOrigen, minoristaOrigen, minoristaDestino] = await Promise.all([
    salesService.getById(String(row.id_venta_origen)),
    usersService.getById(String(row.id_minorista_origen)),
    row.id_minorista_destino ? usersService.getById(String(row.id_minorista_destino)) : null,
  ]);

  const saldosConNombres = await enrichSaldosTransferidosConNombres(row.saldos_transferidos);

  return {
    ...(row as unknown as TransferenciaSaldo),
    saldos_transferidos: saldosConNombres as TransferenciaSaldo['saldos_transferidos'],
    venta_origen: ventaOrigen || undefined,
    minorista_origen: minoristaOrigen || undefined,
    minorista_destino: minoristaDestino || undefined,
  } as TransferenciaSaldo;
}

/**
 * Busca transferencia pendiente por código y valida que el destino pueda recibirla.
 * No modifica la base de datos.
 */
async function resolverTransferenciaPendientePorCodigo(
  codigoQR: string,
  idMinoristaDestino: string
): Promise<TransferenciaRow> {
  const codigoNormalizado = codigoQR.trim().replace(/\s+/g, '').toUpperCase();
  if (!codigoNormalizado) {
    throw new Error('Código QR no válido o transferencia ya procesada');
  }

  const { data: transferencia, error: findError } = await supabase
    .from('transferencias_saldos')
    .select('*')
    .eq('codigo_qr', codigoNormalizado)
    .eq('estado', 'pendiente')
    .single();

  if (findError) {
    if (findError.code !== 'PGRST116') {
      throw new Error(handleSupabaseError(findError));
    }
    throw new Error('Código QR no válido o transferencia ya procesada');
  }

  if (!transferencia) {
    throw new Error('Código QR no válido o transferencia ya procesada');
  }

  if (transferencia.id_minorista_origen === idMinoristaDestino) {
    throw new Error('No puedes escanear tu propio código QR');
  }

  const { data: ultimaPendienteOrigen, error: ultPendErr } = await supabase
    .from('transferencias_saldos')
    .select('id')
    .eq('id_minorista_origen', transferencia.id_minorista_origen)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ultPendErr) throw new Error(handleSupabaseError(ultPendErr));
  if (ultimaPendienteOrigen && ultimaPendienteOrigen.id !== transferencia.id) {
    throw new Error('El código QR no corresponde a la última transferencia pendiente del minorista');
  }

  return transferencia as TransferenciaRow;
}

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
  // ESCANEAR QR: vista previa (pendiente) y completar
  // ============================================================================

  /**
   * Solo lectura + validaciones: muestra saldos al destino antes de aceptar.
   */
  async previewTransferenciaQR(
    codigoQR: string,
    idMinoristaDestino: string
  ): Promise<TransferenciaSaldo> {
    const row = await resolverTransferenciaPendientePorCodigo(codigoQR, idMinoristaDestino);
    return cargarTransferenciaSaldoEnriquecida(row);
  },

  /**
   * Completa la transferencia (asigna destino, estado completada). Revalida en servidor.
   */
  async completarTransferenciaQR(
    codigoQR: string,
    idMinoristaDestino: string
  ): Promise<TransferenciaSaldo> {
    const transferencia = await resolverTransferenciaPendientePorCodigo(codigoQR, idMinoristaDestino);

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
      .eq('id', transferencia.id as string)
      .select()
      .single();

    if (updateError) throw new Error(handleSupabaseError(updateError));

    return cargarTransferenciaSaldoEnriquecida(updated as TransferenciaRow);
  },

  /** @deprecated Usar previewTransferenciaQR + completarTransferenciaQR + aplicar preregistro */
  async escanearQR(
    codigoQR: string,
    idMinoristaDestino: string
  ): Promise<TransferenciaSaldo> {
    return this.completarTransferenciaQR(codigoQR, idMinoristaDestino);
  },

  // ============================================================================
  // OBTENER TRANSFERENCIAS
  // ============================================================================

  /**
   * Transferencia pendiente del minorista origen ligada a la venta **completada** más reciente
   * cuya fecha (`ventas.fecha`) coincide con `fechaVentaISO` (YYYY-MM-DD).
   */
  async getPendienteOrigenPorDiaVenta(
    idMinorista: string,
    fechaVentaISO: string
  ): Promise<TransferenciaSaldo | null> {
    const { data: rows, error } = await supabase
      .from('transferencias_saldos')
      .select('*')
      .eq('id_minorista_origen', idMinorista)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) throw new Error(handleSupabaseError(error));
    if (!rows?.length) return null;

    type Cand = { row: TransferenciaSaldo; venta: Sale & { created_at?: string } };
    const candidates: Cand[] = [];

    for (const row of rows) {
      if (!row.codigo_qr) continue;
      try {
        const venta = (await salesService.getById(row.id_venta_origen)) as
          | (Sale & { created_at?: string })
          | null;
        const fechaVenta = venta?.fecha ? String(venta.fecha).split('T')[0] : '';
        if (
          venta &&
          fechaVenta === fechaVentaISO &&
          venta.estado === 'completada' &&
          venta.id_vendedor === idMinorista
        ) {
          candidates.push({ row: row as TransferenciaSaldo, venta });
        }
      } catch {
        /* siguiente fila */
      }
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => ventaOrdenTimestamp(b.venta) - ventaOrdenTimestamp(a.venta));
    return candidates[0].row;
  },

  /**
   * Transferencia pendiente asociada a la última venta **completada** del minorista (cualquier fecha).
   */
  async getPendienteOrigenUltimaVentaFinalizada(
    idMinorista: string
  ): Promise<TransferenciaSaldo | null> {
    const { data: rows, error } = await supabase
      .from('transferencias_saldos')
      .select('*')
      .eq('id_minorista_origen', idMinorista)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) throw new Error(handleSupabaseError(error));
    if (!rows?.length) return null;

    type Cand = { row: TransferenciaSaldo; venta: Sale & { created_at?: string } };
    const candidates: Cand[] = [];

    for (const row of rows) {
      if (!row.codigo_qr) continue;
      try {
        const venta = (await salesService.getById(row.id_venta_origen)) as
          | (Sale & { created_at?: string })
          | null;
        if (
          venta &&
          venta.estado === 'completada' &&
          venta.id_vendedor === idMinorista
        ) {
          candidates.push({ row: row as TransferenciaSaldo, venta });
        }
      } catch {
        /* siguiente fila */
      }
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => ventaOrdenTimestamp(b.venta) - ventaOrdenTimestamp(a.venta));
    return candidates[0].row;
  },

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

  /** Marca como canceladas las transferencias pendientes ligadas a una venta (admin / reapertura edición). */
  async cancelarPendientesPorVentaOrigen(idVentaOrigen: string): Promise<void> {
    const updatedAt = getLocalDateTimeISO();
    const { error } = await supabase
      .from('transferencias_saldos')
      .update({ estado: 'cancelada', updated_at: updatedAt })
      .eq('id_venta_origen', idVentaOrigen)
      .eq('estado', 'pendiente');

    if (error) throw new Error(handleSupabaseError(error));
  },
};
