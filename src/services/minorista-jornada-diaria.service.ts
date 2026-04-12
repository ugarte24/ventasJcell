import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/error-handler';

export const MINORISTA_JORNADA_DIARIA_QUERY_KEY = 'minorista-jornada-diaria' as const;

const MSG_TABLA_FALTA =
  'Falta la tabla minorista_jornada_diaria. En Supabase: SQL Editor → ejecuta migrations/create_minorista_jornada_diaria.sql y recarga la app.';

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

export interface MinoristaJornadaDiaria {
  id: string;
  id_minorista: string;
  fecha: string;
  iniciada_at: string;
  created_at: string;
  updated_at: string;
}

export const minoristaJornadaDiariaService = {
  async getByUsuarioYFecha(idMinorista: string, fecha: string): Promise<MinoristaJornadaDiaria | null> {
    const { data, error } = await supabase
      .from('minorista_jornada_diaria')
      .select('*')
      .eq('id_minorista', idMinorista)
      .eq('fecha', fecha)
      .maybeSingle();

    if (error) {
      throwIfTableMissing(error);
      throw new Error(handleSupabaseError(error));
    }
    return data as MinoristaJornadaDiaria | null;
  },

  async marcarIniciada(idMinorista: string, fecha: string): Promise<MinoristaJornadaDiaria> {
    const iniciada_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('minorista_jornada_diaria')
      .upsert(
        {
          id_minorista: idMinorista,
          fecha,
          iniciada_at,
        },
        { onConflict: 'id_minorista,fecha' }
      )
      .select()
      .single();

    if (error) {
      throwIfTableMissing(error);
      throw new Error(handleSupabaseError(error));
    }
    return data as MinoristaJornadaDiaria;
  },
};
