import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  
  throw new Error(
    `Missing Supabase environment variables: ${missing.join(', ')}\n` +
    'Please create a .env.local file with these variables.\n' +
    'See README_SUPABASE.md for instructions.'
  );
}

// Patrón Singleton para evitar múltiples instancias
let supabaseInstance: SupabaseClient<Database> | null = null;

function getSupabaseClient(): SupabaseClient<Database> {
  // Si ya existe una instancia, retornarla
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Crear nueva instancia solo si no existe
  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-client-info': 'ventaplus@1.0.0',
      },
    },
  });

  return supabaseInstance;
}

// Exportar la instancia única
export const supabase = getSupabaseClient();

