/**
 * Misma heurística que el resumen Tarjeta / Recarga / Chip en Nueva venta.
 * Usa nombre de categoría y de producto (sin acentos, minúsculas).
 */
export type ProductoBucketResumen = 'tarjeta' | 'recarga' | 'chip' | 'otros';

export function normalizeResumenStr(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

export function bucketProductoResumen(
  categoriaNombre: string | undefined,
  productoNombre: string
): ProductoBucketResumen {
  const c = normalizeResumenStr(categoriaNombre || '');
  const p = normalizeResumenStr(productoNombre || '');
  if (c.includes('recarga') || p.includes('recarga')) return 'recarga';
  if (c.includes('chip') || p.includes('chip')) return 'chip';
  if (c.includes('tarjeta') || c.includes('tarjet')) return 'tarjeta';
  if (p.includes('tigo') || p.includes('entel') || p.includes('viva')) return 'tarjeta';
  return 'otros';
}

/** Completar saldos (origen → pedido): solo tarjeta y chip; no recargas ni otros. */
export function productoIncluidoEnCompletarSaldosOrigen(
  categoriaNombre: string | undefined,
  productoNombre: string
): boolean {
  const b = bucketProductoResumen(categoriaNombre, productoNombre);
  return b === 'tarjeta' || b === 'chip';
}
