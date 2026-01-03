import { supabase } from '@/lib/supabase';
import { SaldoRestanteMayorista, Sale, Product } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO, getLocalDateISO } from '@/lib/utils';
import { usersService } from './users.service';
import { salesService } from './sales.service';
import { productsService } from './products.service';

export const saldosRestantesMayoristasService = {
  // ============================================================================
  // CREAR SALDOS RESTANTES (ARRANSTRAR DESPUÉS DE VENTA)
  // ============================================================================

  async create(
    idVenta: string,
    idMayorista: string,
    saldosRestantes: Array<{ id_producto: string; cantidad_restante: number }>
  ): Promise<SaldoRestanteMayorista[]> {
    const createdAt = getLocalDateTimeISO();
    const updatedAt = getLocalDateTimeISO();
    const fecha = getLocalDateISO();

    const saldosData = saldosRestantes.map(saldo => ({
      id_venta: idVenta,
      id_mayorista: idMayorista,
      id_producto: saldo.id_producto,
      cantidad_restante: saldo.cantidad_restante,
      fecha,
      created_at: createdAt,
      updated_at: updatedAt,
    }));

    const { data, error } = await supabase
      .from('saldos_restantes_mayoristas')
      .insert(saldosData)
      .select();

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos relacionados
    const saldosCompletos = await Promise.all(
      (data || []).map(async (saldo) => {
        const [venta, mayorista, producto] = await Promise.all([
          salesService.getById(saldo.id_venta),
          usersService.getById(saldo.id_mayorista),
          productsService.getById(saldo.id_producto),
        ]);

        return {
          ...saldo,
          venta: venta || undefined,
          mayorista: mayorista || undefined,
          producto: producto || undefined,
        } as SaldoRestanteMayorista;
      })
    );

    return saldosCompletos;
  },

  // ============================================================================
  // OBTENER SALDOS RESTANTES
  // ============================================================================

  async getByMayorista(idMayorista: string, fecha?: string): Promise<SaldoRestanteMayorista[]> {
    let query = supabase
      .from('saldos_restantes_mayoristas')
      .select('*')
      .eq('id_mayorista', idMayorista)
      .order('created_at', { ascending: false });

    if (fecha) {
      query = query.eq('fecha', fecha);
    }

    const { data, error } = await query;

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos relacionados
    const saldosCompletos = await Promise.all(
      (data || []).map(async (saldo) => {
        const [venta, mayorista, producto] = await Promise.all([
          salesService.getById(saldo.id_venta),
          usersService.getById(saldo.id_mayorista),
          productsService.getById(saldo.id_producto),
        ]);

        return {
          ...saldo,
          venta: venta || undefined,
          mayorista: mayorista || undefined,
          producto: producto || undefined,
        } as SaldoRestanteMayorista;
      })
    );

    return saldosCompletos;
  },

  async getByVenta(idVenta: string): Promise<SaldoRestanteMayorista[]> {
    const { data, error } = await supabase
      .from('saldos_restantes_mayoristas')
      .select('*')
      .eq('id_venta', idVenta);

    if (error) throw new Error(handleSupabaseError(error));

    // Cargar datos relacionados
    const saldosCompletos = await Promise.all(
      (data || []).map(async (saldo) => {
        const [venta, mayorista, producto] = await Promise.all([
          salesService.getById(saldo.id_venta),
          usersService.getById(saldo.id_mayorista),
          productsService.getById(saldo.id_producto),
        ]);

        return {
          ...saldo,
          venta: venta || undefined,
          mayorista: mayorista || undefined,
          producto: producto || undefined,
        } as SaldoRestanteMayorista;
      })
    );

    return saldosCompletos;
  },
};

