import { salesService } from '@/services/sales.service';
import { ventasMinoristasService } from '@/services/ventas-minoristas.service';
import { preregistrosService } from '@/services/preregistros.service';
import { transferenciasService } from '@/services/transferencias.service';

/**
 * Cuando un administrador habilita de nuevo la edición en Nueva venta para un minorista,
 * se anula la última venta generada desde preregistro, se revierten saldos en tablas auxiliares
 * y el minorista puede corregir y volver a finalizar.
 */
export const minoristaRevisionVentaService = {
  async anularUltimaVentaNuevaVentaAlHabilitarEdicion(idMinorista: string, idAdmin: string): Promise<void> {
    const ventaId = await ventasMinoristasService.findUltimaVentaIdDesdeNuevaVenta(idMinorista);
    if (!ventaId) return;

    const venta = await salesService.getById(ventaId);
    if (!venta || venta.estado !== 'completada') return;
    if (venta.id_vendedor !== idMinorista) {
      throw new Error('La venta encontrada no pertenece al minorista indicado');
    }

    await transferenciasService.cancelarPendientesPorVentaOrigen(ventaId);

    const lineas = await ventasMinoristasService.getLineasDesdeNuevaVentaPorVentaId(ventaId);
    const preregistros = await preregistrosService.getPreregistrosMinorista(idMinorista);

    for (const linea of lineas) {
      const pr = preregistros.find((p) => p.id_producto === linea.id_producto);
      if (!pr) continue;
      const actual = pr.cantidad_restante ?? 0;
      const restaurado = actual + linea.cantidad_vendida;
      await preregistrosService.updateCantidadRestanteMinorista(pr.id, restaurado);
    }

    const idsLineas = lineas.map((l) => l.id);
    await ventasMinoristasService.deleteLineasByIds(idsLineas);

    await salesService.cancel(
      ventaId,
      idAdmin,
      'Reapertura edición Nueva venta: autorización administrador para corregir y volver a finalizar',
      { bypassSameDayCheck: true }
    );
  },
};
