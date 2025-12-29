-- ============================================================================
-- SCRIPT: Configuración de Políticas RLS para Storage Bucket "productos"
-- ============================================================================
-- 
-- Este script configura las políticas de Row-Level Security (RLS) para el
-- bucket de almacenamiento "productos" en Supabase Storage.
--
-- IMPORTANTE: Ejecuta este script en el SQL Editor de Supabase después de
-- haber creado el bucket "productos" en Storage.
--
-- ============================================================================

-- Verificar que el bucket existe
-- Si el bucket no existe, créalo primero desde la interfaz de Supabase:
-- Storage → New Bucket → Name: "productos" → Public bucket: ✅

-- ============================================================================
-- POLÍTICA 1: Lectura Pública (SELECT)
-- ============================================================================
-- Permite que cualquier usuario (incluso no autenticados) pueda ver/descargar
-- las imágenes de productos desde el bucket.

DROP POLICY IF EXISTS "Public Access" ON storage.objects;

CREATE POLICY "Public Access"
ON storage.objects 
FOR SELECT
USING (bucket_id = 'productos');

-- ============================================================================
-- POLÍTICA 2: Escritura para Usuarios Autenticados (INSERT)
-- ============================================================================
-- Permite que usuarios autenticados puedan subir imágenes al bucket.

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

CREATE POLICY "Authenticated users can upload"
ON storage.objects 
FOR INSERT
WITH CHECK (
  bucket_id = 'productos' 
  AND auth.role() = 'authenticated'
);

-- ============================================================================
-- POLÍTICA 3: Actualización para Usuarios Autenticados (UPDATE)
-- ============================================================================
-- Permite que usuarios autenticados puedan actualizar/reemplazar imágenes.

DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;

CREATE POLICY "Authenticated users can update"
ON storage.objects 
FOR UPDATE
USING (
  bucket_id = 'productos' 
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'productos' 
  AND auth.role() = 'authenticated'
);

-- ============================================================================
-- POLÍTICA 4: Eliminación para Usuarios Autenticados (DELETE)
-- ============================================================================
-- Permite que usuarios autenticados puedan eliminar imágenes del bucket.

DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

CREATE POLICY "Authenticated users can delete"
ON storage.objects 
FOR DELETE
USING (
  bucket_id = 'productos' 
  AND auth.role() = 'authenticated'
);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Ejecuta esta consulta para verificar que las políticas se crearon correctamente:

-- SELECT 
--   policyname,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies 
-- WHERE schemaname = 'storage' 
--   AND tablename = 'objects'
--   AND policyname LIKE '%productos%' 
--   OR policyname LIKE '%Authenticated%'
--   OR policyname LIKE '%Public%'
-- ORDER BY policyname;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 
-- 1. Asegúrate de que el bucket "productos" esté creado y sea público:
--    - Ve a Storage → productos → Settings
--    - Verifica que "Public bucket" esté marcado
--
-- 2. Si el usuario no está autenticado, no podrá subir imágenes.
--    Asegúrate de que el usuario haya iniciado sesión correctamente.
--
-- 3. Si sigues teniendo problemas después de ejecutar este script:
--    - Verifica que el usuario esté autenticado: SELECT auth.uid();
--    - Verifica que el bucket existe: SELECT * FROM storage.buckets WHERE name = 'productos';
--    - Verifica las políticas: SELECT * FROM pg_policies WHERE tablename = 'objects';
--
-- ============================================================================

