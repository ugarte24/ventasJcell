import { addCalendarDaysLocal, getLocalDateISO } from '@/lib/utils';
import { minoristaJornadaDiariaService } from '@/services/minorista-jornada-diaria.service';
import { ventasMinoristasService } from '@/services/ventas-minoristas.service';
import { preregistrosService } from '@/services/preregistros.service';
import { salesService } from '@/services/sales.service';
import { transferenciasService } from '@/services/transferencias.service';
import { usersService } from '@/services/users.service';

export type MinoristaAutoFinalizarDiaAnteriorResult =
  | { ok: true; mode: 'skipped'; reason: string }
  | { ok: true; mode: 'done'; fechaCerrada: string }
  | { ok: false; message: string };

function sessionDedupeKey(idMinorista: string, fechaCerrada: string): string {
  return `ventasJcell_autocierre_minorista_${idMinorista}_${fechaCerrada}`;
}

/**
 * Si ayer hubo jornada iniciada, no se finalizó venta ese día, hoy aún no inició jornada
 * y el preregistro tiene ventas en curso, registra la venta del día anterior como al
 * pulsar "Finalizar" (ventas + ventas_minoristas, transferencia si aplica), para que
 * la consulta histórica no pierda datos.
 */
export async function tryAutoFinalizarVentaMinoristaDiaAnterior(
  idMinorista: string
): Promise<MinoristaAutoFinalizarDiaAnteriorResult> {
  const hoy = getLocalDateISO();
  const ayer = addCalendarDaysLocal(hoy, -1);

  try {
    const jornadaAyer = await minoristaJornadaDiariaService.getByUsuarioYFecha(idMinorista, ayer);
    if (!jornadaAyer) {
      return { ok: true, mode: 'skipped', reason: 'no_jornada_ayer' };
    }

    const yaFinalizo = await ventasMinoristasService.hasVentaRegistradaDesdeNuevaVentaEnFecha(
      idMinorista,
      ayer
    );
    if (yaFinalizo) {
      return { ok: true, mode: 'skipped', reason: 'ya_finalizado' };
    }

    const jornadaHoy = await minoristaJornadaDiariaService.getByUsuarioYFecha(idMinorista, hoy);
    if (jornadaHoy) {
      return { ok: true, mode: 'skipped', reason: 'jornada_hoy_ya_iniciada' };
    }

    if (typeof sessionStorage !== 'undefined') {
      if (sessionStorage.getItem(sessionDedupeKey(idMinorista, ayer))) {
        return { ok: true, mode: 'skipped', reason: 'ya_ejecutado_sesion' };
      }
    }

    const preregistros = await preregistrosService.getPreregistrosMinorista(idMinorista);
    if (!preregistros.length) {
      return { ok: true, mode: 'skipped', reason: 'sin_preregistros' };
    }

    const aumentosDelDia = await ventasMinoristasService.getAumentosDelDia(idMinorista, ayer);
    const aumentosPorProducto = new Map<string, number>();
    aumentosDelDia.forEach((aumento) => {
      const actual = aumentosPorProducto.get(aumento.id_producto) || 0;
      aumentosPorProducto.set(aumento.id_producto, actual + aumento.cantidad_aumento);
    });

    type ItemCalc = {
      id: string;
      id_producto: string;
      cantidad: number;
      aumento: number;
      cantidadRestante: number;
      precio_unitario: number;
      subtotal: number;
    };

    const items: ItemCalc[] = preregistros.map((p) => {
      const cantidad = p.cantidad;
      const aumento = aumentosPorProducto.get(p.id_producto) || 0;
      const saldoDisponible = cantidad + aumento;
      let cantidadRestante: number;
      if (p.cantidad_restante != null && !Number.isNaN(Number(p.cantidad_restante))) {
        cantidadRestante = Math.max(0, Math.min(Number(p.cantidad_restante), saldoDisponible));
      } else {
        cantidadRestante = saldoDisponible;
      }
      const precio_unitario = p.producto?.precio_por_unidad || 0;
      const cantidadVendida = cantidad + aumento - cantidadRestante;
      const subtotal = cantidadVendida * precio_unitario;
      return {
        id: p.id,
        id_producto: p.id_producto,
        cantidad,
        aumento,
        cantidadRestante,
        precio_unitario,
        subtotal,
      };
    });

    const itemsConVenta = items.filter((i) => i.cantidad + i.aumento - i.cantidadRestante > 0);
    if (!itemsConVenta.length) {
      return { ok: true, mode: 'skipped', reason: 'sin_ventas_pendientes' };
    }

    const preregistroTotal = itemsConVenta.reduce((s, i) => s + i.subtotal, 0);
    const saleItems = itemsConVenta.map((item) => {
      const cantidadVendida = item.cantidad + item.aumento - item.cantidadRestante;
      return {
        id_producto: item.id_producto,
        cantidad: cantidadVendida,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
      };
    });

    const newSale = await salesService.create({
      total: preregistroTotal,
      metodo_pago: 'efectivo',
      id_vendedor: idMinorista,
      items: saleItems,
      fecha: ayer,
      hora: '23:59',
    });

    const horaCierre = '23:59';

    for (const item of itemsConVenta) {
      const cantidadVendida = item.cantidad + item.aumento - item.cantidadRestante;
      if (cantidadVendida > 0) {
        await ventasMinoristasService.create({
          id_minorista: idMinorista,
          id_producto: item.id_producto,
          cantidad_vendida: cantidadVendida,
          cantidad_aumento: 0,
          precio_unitario: item.precio_unitario,
          fecha: ayer,
          hora: horaCierre,
          observaciones: `Venta registrada desde preregistros - Venta #${newSale.id} (cierre automático día anterior)`,
        });
      }
    }

    const saldosRestantes = items
      .filter((item) => item.cantidadRestante > 0)
      .map((item) => ({
        id_producto: item.id_producto,
        cantidad_restante: item.cantidadRestante,
      }));

    if (saldosRestantes.length > 0) {
      try {
        await transferenciasService.create(newSale.id, idMinorista, saldosRestantes);
      } catch (e: unknown) {
        console.error('Auto-cierre día anterior: error al crear transferencia', e);
      }
    }

    for (const item of itemsConVenta) {
      const cantidadVendida = item.cantidad + item.aumento - item.cantidadRestante;
      if (cantidadVendida <= 0) continue;
      try {
        await preregistrosService.updateCantidadRestanteMinorista(item.id, item.cantidadRestante);
      } catch (persistErr: unknown) {
        console.error('Auto-cierre día anterior: error guardando cantidad_restante', persistErr);
      }
    }

    // No usar false aquí: bloquea la edición del usuario en general y la UI muestra
    // "venta finalizada" hoy aunque solo se haya cerrado el día anterior por el sistema.
    try {
      await usersService.minoristaSetEdicionPreregistroPermitida(true);
    } catch (e: unknown) {
      console.error('Auto-cierre día anterior: error restableciendo edición preregistro para el nuevo día', e);
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(sessionDedupeKey(idMinorista, ayer), '1');
    }

    return { ok: true, mode: 'done', fechaCerrada: ayer };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error desconocido al cerrar el día anterior';
    return { ok: false, message };
  }
}
