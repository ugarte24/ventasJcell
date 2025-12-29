import { supabase } from '@/lib/supabase';

export const storageService = {
  async uploadProductImage(file: File, productId: string): Promise<string> {
    // Verificar que el usuario esté autenticado
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error al obtener sesión:', sessionError);
      throw new Error('Error de autenticación. Por favor, inicia sesión nuevamente.');
    }
    
    if (!session) {
      console.error('No hay sesión activa');
      throw new Error('No estás autenticado. Por favor, inicia sesión nuevamente.');
    }

    if (!session.user) {
      console.error('Sesión sin usuario');
      throw new Error('Sesión inválida. Por favor, inicia sesión nuevamente.');
    }

    console.log('Usuario autenticado:', session.user.id);

    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}-${Date.now()}.${fileExt}`;
    const filePath = `productos/${fileName}`;

    console.log('Intentando subir imagen:', filePath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('productos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error al subir:', uploadError);
      // Mejorar el mensaje de error para RLS
      if (uploadError.message?.includes('row-level security') || 
          uploadError.message?.includes('policy') ||
          uploadError.message?.includes('permission') ||
          uploadError.statusCode === 403) {
        throw new Error('No tienes permisos para subir imágenes. Verifica que estés autenticado correctamente y recarga la página.');
      }
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('productos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async deleteProductImage(filePath: string): Promise<void> {
    // Extraer el path del URL completo
    const path = filePath.split('/productos/')[1];
    if (!path) return;

    const { error } = await supabase.storage
      .from('productos')
      .remove([`productos/${path}`]);

    if (error) throw error;
  },

  getPublicUrl(path: string): string {
    const { data } = supabase.storage
      .from('productos')
      .getPublicUrl(path);

    return data.publicUrl;
  },
};


