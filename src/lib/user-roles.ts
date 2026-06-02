import type { UserRole } from '@/types';

/** Solo rol mayorista (no vendedor tienda). */
export function isMayoristaRole(rol?: UserRole | string | null): boolean {
  return rol === 'mayorista';
}

/** Mayorista o vendedor tienda (pedidos, ventas del día mayorista, preregistros en panel). */
export function isMayoristaLikeRole(rol?: UserRole | string | null): boolean {
  return rol === 'mayorista' || rol === 'vendedor';
}

export function isMinoristaRole(rol?: UserRole | string | null): boolean {
  return rol === 'minorista';
}

/** Nueva venta con tabla de preregistro (minorista o mayorista; vendedor usa carrito POS). */
export function usesPreregistroNuevaVenta(rol?: UserRole | string | null): boolean {
  return isMinoristaRole(rol) || isMayoristaRole(rol);
}

/** Panel con pedidos / preregistros (incluye vendedor tienda). */
export function usesPreregistroPanel(rol?: UserRole | string | null): boolean {
  return isMinoristaRole(rol) || isMayoristaLikeRole(rol);
}

export type ModoVentaVendedor = 'pos' | 'preregistro';

export function isVendedorTiendaRole(rol?: UserRole | string | null): boolean {
  return rol === 'vendedor';
}

/** Vendedor tienda puede alternar entre carrito POS y preregistro mayorista. */
export function canToggleModoVentaVendedor(rol?: UserRole | string | null): boolean {
  return isVendedorTiendaRole(rol);
}

/** UI y lógica de preregistro en Nueva venta (incluye vendedor en pestaña preregistro). */
export function enModoPreregistroNuevaVenta(
  rol?: UserRole | string | null,
  modoVendedor: ModoVentaVendedor = 'pos'
): boolean {
  if (usesPreregistroNuevaVenta(rol)) return true;
  return isVendedorTiendaRole(rol) && modoVendedor === 'preregistro';
}

/** Flujo mayorista dentro de preregistro (mayorista o vendedor en pestaña preregistro). */
export function usaFlujoMayoristaPreregistro(
  rol?: UserRole | string | null,
  modoVendedor: ModoVentaVendedor = 'pos'
): boolean {
  return isMayoristaRole(rol) || (isVendedorTiendaRole(rol) && modoVendedor === 'preregistro');
}

export function getPedidoTipoUsuario(
  rol?: UserRole | string | null
): 'minorista' | 'mayorista' | null {
  if (isMinoristaRole(rol)) return 'minorista';
  if (isMayoristaLikeRole(rol)) return 'mayorista';
  return null;
}

export function getRoleDisplayLabel(rol?: UserRole | string | null): string {
  switch (rol) {
    case 'admin':
      return 'Administrador';
    case 'vendedor':
      return 'Vendedor tienda';
    case 'minorista':
      return 'Minorista';
    case 'mayorista':
      return 'Mayorista';
    default:
      return rol ?? '—';
  }
}
