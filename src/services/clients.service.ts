import { supabase } from '@/lib/supabase';
import { Client } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO } from '@/lib/utils';

export const clientsService = {
  async getAll(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre');

    if (error) throw new Error(handleSupabaseError(error));
    return data as Client[];
  },

  async getById(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }
    return data as Client;
  },

  async search(query: string): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .or(`nombre.ilike.%${query}%,ci_nit.ilike.%${query}%,telefono.ilike.%${query}%`)
      .order('nombre');

    if (error) throw new Error(handleSupabaseError(error));
    return data as Client[];
  },

  async create(client: Omit<Client, 'id' | 'fecha_registro'>): Promise<Client> {
    // Obtener fecha y hora local del cliente
    const fechaRegistro = getLocalDateTimeISO();
    const createdAt = getLocalDateTimeISO();
    
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nombre: client.nombre,
        ci_nit: client.ci_nit,
        telefono: client.telefono,
        direccion: client.direccion,
        fecha_registro: fechaRegistro, // Fecha explícita en hora local
        created_at: createdAt, // Timestamp explícito en hora local
      })
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));
    return data as Client;
  },

  async update(id: string, updates: Partial<Client>): Promise<Client> {
    // Obtener timestamp de actualización en hora local
    const updatedAt = getLocalDateTimeISO();
    
    const { data, error } = await supabase
      .from('clientes')
      .update({
        ...updates,
        updated_at: updatedAt, // Timestamp explícito en hora local
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));
    return data as Client;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },
};


