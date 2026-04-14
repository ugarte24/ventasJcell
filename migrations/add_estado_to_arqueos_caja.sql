-- ============================================================================
-- AGREGAR CAMPO ESTADO A ARQUEOS_CAJA
-- ============================================================================
-- Este script asegura que la columna estado existe en arqueos_caja
-- ============================================================================

-- Agregar columna estado si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'arqueos_caja' 
    AND column_name = 'estado'
  ) THEN
    ALTER TABLE arqueos_caja
    ADD COLUMN estado VARCHAR(20) DEFAULT 'abierto' NOT NULL
    CHECK (estado IN ('abierto', 'cerrado'));

    -- El DEFAULT ya dejó filas existentes en 'abierto'. Solo algunas BD tienen hora_cierre
    -- (esquema extendido); si existe, marcar 'cerrado' donde corresponda.
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'arqueos_caja'
        AND column_name = 'hora_cierre'
    ) THEN
      UPDATE arqueos_caja
      SET estado = CASE
        WHEN hora_cierre IS NULL THEN 'abierto'
        ELSE 'cerrado'
      END;
    END IF;

    RAISE NOTICE 'Columna estado agregada a arqueos_caja';
  ELSE
    RAISE NOTICE 'Columna estado ya existe en arqueos_caja';
  END IF;
END $$;

-- Agregar comentario
COMMENT ON COLUMN arqueos_caja.estado IS 'Estado del arqueo: abierto o cerrado';
