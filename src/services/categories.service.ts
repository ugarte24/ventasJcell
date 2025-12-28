import { supabase } from '@/lib/supabase';
import { Category } from '@/types';
import { handleSupabaseError } from '@/lib/error-handler';
import { getLocalDateTimeISO } from '@/lib/utils';

export const categoriesService = {
  async getAll(includeInactive = true): Promise<Category[]> {
    let query = supabase
      .from('categorias')
      .select('*')
      .order('nombre');

    if (!includeInactive) {
      query = query.eq('estado', 'activo');
    }

    const { data, error } = await query;

    if (error) throw new Error(handleSupabaseError(error));
    return data as Category[];
  },

  async getById(id: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(handleSupabaseError(error));
    }
    return data as Category;
  },

  async create(category: Omit<Category, 'id'>): Promise<Category> {
    // Obtener timestamps en hora local
    const createdAt = getLocalDateTimeISO();
    const updatedAt = getLocalDateTimeISO();
    
    const { data, error } = await supabase
      .from('categorias')
      .insert({
        nombre: category.nombre,
        descripcion: category.descripcion,
        estado: category.estado || 'activo',
        created_at: createdAt, // Timestamp explícito en hora local
        updated_at: updatedAt, // Timestamp explícito en hora local
      })
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));
    return data as Category;
  },

  async update(id: string, updates: Partial<Category>): Promise<Category> {
    // Obtener timestamp de actualización en hora local
    const updatedAt = getLocalDateTimeISO();
    
    const { data, error } = await supabase
      .from('categorias')
      .update({
        ...updates,
        updated_at: updatedAt, // Timestamp explícito en hora local
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(handleSupabaseError(error));
    return data as Category;
  },

  async delete(id: string): Promise<void> {
    // Soft delete
    // Obtener timestamp de actualización en hora local
    const updatedAt = getLocalDateTimeISO();
    
    const { error } = await supabase
      .from('categorias')
      .update({ 
        estado: 'inactivo',
        updated_at: updatedAt, // Timestamp explícito en hora local
      })
      .eq('id', id);

    if (error) throw new Error(handleSupabaseError(error));
  },

  async toggleStatus(id: string): Promise<Category> {
    // Obtener el estado actual
    const current = await this.getById(id);
    if (!current) {
      throw new Error('Categoría no encontrada');
    }

    const newStatus = current.estado === 'activo' ? 'inactivo' : 'activo';
    return this.update(id, { estado: newStatus });
  },
};


