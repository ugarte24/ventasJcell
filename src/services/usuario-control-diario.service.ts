import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/error-handler';

const MSG_TABLA_FALTA =
  'Falta la tabla usuario_control_diario. En Supabase: SQL Editor → ejecuta el archivo migrations/add_usuario_control_diario.sql y recarga la app.';

function throwIfTableMissing(error: PostgrestError): void {
  const code = error.code;
  const msg = error.message || '';
  if (
    code === 'PGRST205' ||
    /schema cache|could not find.*table|no existe la relación/i.test(msg)
  ) {
    throw new Error(MSG_TABLA_FALTA);
  }
}

export interface UsuarioControlDiario {
  id: string;
  id_usuario: string;
  fecha: string;
  pedidos_habilitado: boolean;
  efectivo_entregado: number;
  created_at: string;
  updated_at: string;
}

export const usuarioControlDiarioService = {
  async getByUsuarioYFecha(idUsuario: string, fecha: string): Promise<UsuarioControlDiario | null> {
    const { data, error } = await supabase
      .from('usuario_control_diario')
      .select('*')
      .eq('id_usuario', idUsuario)
      .eq('fecha', fecha)
      .maybeSingle();

    if (error) {
      throwIfTableMissing(error);
      throw new Error(handleSupabaseError(error));
    }
    return data as UsuarioControlDiario | null;
  },

  /** Admin: todos los registros de una fecha (mayoristas/minoristas). */
  async listByFecha(fecha: string): Promise<UsuarioControlDiario[]> {
    const { data, error } = await supabase
      .from('usuario_control_diario')
      .select('*')
      .eq('fecha', fecha)
      .order('id_usuario');

    if (error) {
      throwIfTableMissing(error);
      throw new Error(handleSupabaseError(error));
    }
    return (data || []) as UsuarioControlDiario[];
  },

  async upsert(payload: {
    id_usuario: string;
    fecha: string;
    pedidos_habilitado: boolean;
    efectivo_entregado: number;
  }): Promise<UsuarioControlDiario> {
    const { data, error } = await supabase
      .from('usuario_control_diario')
      .upsert(
        {
          id_usuario: payload.id_usuario,
          fecha: payload.fecha,
          pedidos_habilitado: payload.pedidos_habilitado,
          efectivo_entregado: payload.efectivo_entregado,
        },
        { onConflict: 'id_usuario,fecha' }
      )
      .select()
      .single();

    if (error) {
      throwIfTableMissing(error);
      throw new Error(handleSupabaseError(error));
    }
    return data as UsuarioControlDiario;
  },
};
