import { supabase } from '@/lib/supabase';

export const storageService = {
  async uploadProductImage(file: File, productId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}-${Date.now()}.${fileExt}`;
    const filePath = `productos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('productos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

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


