-- =============================================
-- Migracion: UUID -> INTEGER secuencial
-- Ejecutar en el SQL Editor de Supabase
-- =============================================

-- 1. Crear tabla de mapeo UUID -> INTEGER
CREATE TABLE IF NOT EXISTS _id_mapping (
  tabla TEXT NOT NULL,
  old_id UUID NOT NULL,
  new_id SERIAL,
  PRIMARY KEY (tabla, old_id)
);

-- 2. Migrar jugadores: crear columna new_id
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS new_id SERIAL;

-- Llenar mapeo para jugadores
INSERT INTO _id_mapping (tabla, old_id, new_id)
SELECT 'jugadores', id, new_id
FROM jugadores
ON CONFLICT DO NOTHING;

-- 3. Migrar asistencia: crear columna new_jugador_id
ALTER TABLE asistencia ADD COLUMN IF NOT EXISTS new_jugador_id INTEGER;

-- Llenar new_jugador_id usando el mapeo
UPDATE asistencia a
SET new_jugador_id = m.new_id
FROM _id_mapping m
WHERE a.jugador_id = m.old_id AND m.tabla = 'jugadores';

-- 4. Migrar usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS new_id SERIAL;

INSERT INTO _id_mapping (tabla, old_id, new_id)
SELECT 'usuarios', id, new_id
FROM usuarios
ON CONFLICT DO NOTHING;

-- =============================================
-- FASE 2: Renombrar columnas y eliminar viejas
-- Ejecutar solo despues de verificar que todo esta bien
-- =============================================

-- Eliminar constraints viejos
ALTER TABLE asistencia DROP CONSTRAINT IF EXISTS asistencia_jugador_id_fkey;
ALTER TABLE asistencia DROP CONSTRAINT IF EXISTS asistencia_jugador_id_fecha_key;

-- Eliminar indices viejos
DROP INDEX IF EXISTS idx_asistencia_jugador;

-- Eliminar PK viejas y renombrar
ALTER TABLE jugadores DROP CONSTRAINT IF EXISTS jugadores_pkey;
ALTER TABLE jugadores DROP COLUMN IF EXISTS id;
ALTER TABLE jugadores RENAME COLUMN new_id TO id;
ALTER TABLE jugadores ADD PRIMARY KEY (id);

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_pkey;
ALTER TABLE usuarios DROP COLUMN IF EXISTS id;
ALTER TABLE usuarios RENAME COLUMN new_id TO id;
ALTER TABLE usuarios ADD PRIMARY KEY (id);
ALTER TABLE usuarios ADD CONSTRAINT usuarios_email_unique UNIQUE (email);

ALTER TABLE asistencia DROP COLUMN IF EXISTS id;
ALTER TABLE asistencia DROP COLUMN IF EXISTS jugador_id;
ALTER TABLE asistencia RENAME COLUMN new_jugador_id TO jugador_id;
ALTER TABLE asistencia ADD COLUMN id SERIAL PRIMARY KEY;

-- Recrear foreign key
ALTER TABLE asistencia
  ADD CONSTRAINT asistencia_jugador_id_fkey
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE;

-- Recrear constraint UNIQUE
ALTER TABLE asistencia
  ADD CONSTRAINT asistencia_jugador_id_fecha_key
  UNIQUE (jugador_id, fecha);

-- Recrear indice
CREATE INDEX IF NOT EXISTS idx_asistencia_jugador ON asistencia(jugador_id);

-- Limpiar tabla de mapeo
DROP TABLE IF EXISTS _id_mapping;

-- =============================================
-- Verificacion (opcional)
-- =============================================
SELECT 'jugadores' as tabla, count(*) as total FROM jugadores
UNION ALL
SELECT 'asistencia', count(*) FROM asistencia
UNION ALL
SELECT 'usuarios', count(*) FROM usuarios;
