-- =============================================
-- Schema: Asistencia Rugby M13 - Club Tilcara
-- =============================================

-- Tabla de jugadores
CREATE TABLE IF NOT EXISTS jugadores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  fecha_nacimiento DATE,
  numero_camiseta INTEGER,
  posicion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de asistencia
CREATE TABLE IF NOT EXISTS asistencia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jugador_id UUID REFERENCES jugadores(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  presente BOOLEAN DEFAULT false,
  lesionado BOOLEAN DEFAULT false,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(jugador_id, fecha)
);

-- Tabla de usuarios (staff)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT DEFAULT 'staff' CHECK (rol IN ('admin', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_asistencia_fecha ON asistencia(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencia_jugador ON asistencia(jugador_id);
CREATE INDEX IF NOT EXISTS idx_jugadores_activo ON jugadores(activo);

-- Habilitar RLS (Row Level Security)
ALTER TABLE jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso (permiso total por ahora, simplificado)
DROP POLICY IF EXISTS "Acceso total jugadores" ON jugadores;
DROP POLICY IF EXISTS "Acceso total asistencia" ON asistencia;
DROP POLICY IF EXISTS "Acceso total usuarios" ON usuarios;

CREATE POLICY "Acceso total jugadores" ON jugadores FOR ALL USING (true);
CREATE POLICY "Acceso total asistencia" ON asistencia FOR ALL USING (true);
CREATE POLICY "Acceso total usuarios" ON usuarios FOR ALL USING (true);

-- =============================================
-- Datos de ejemplo (opcional, podés borrarlos)
-- =============================================

-- Usuarios de ejemplo
INSERT INTO usuarios (email, nombre, rol) VALUES
  ('entrenador@tilcara.com', 'Entrenador Principal', 'admin'),
  ('ayudante@tilcara.com', 'Ayudante', 'staff')
ON CONFLICT (email) DO NOTHING;

-- Jugadores de ejemplo (25+ jugadores M13)
INSERT INTO jugadores (nombre, apellido, fecha_nacimiento, numero_camiseta, posicion, activo) VALUES
('Amezua', 'Juan Cruz', '2013-02-19', 1, 'Hooker', true),
('Balestresse', 'Benjamin Jose', '2013-04-22', 2, 'Wing', true),
('Benítez', 'Tomás Alejo', '2013-03-20', 3, 'Centro/Wing', true),
('Bilche Cavenaghi', 'Pedro Fermín', '2013-02-18', 4, 'Segunda/Ala', true),
('Cacciabue', 'Juan Martin', '2013-06-14', 5, 'Pilar', true),
('Cassano Gallino', 'Justo', '2013-07-13', 6, 'Segunda/Tercera', true),
('Ceballos', 'Juan Pablo', '2013-10-01', 7, 'Segunda/Ala', true),
('Comas Marín', 'Santino', '2013-08-03', 8, 'Pilar/Hooker', true),
('Diaz', 'Felipe Antonio', '2013-05-25', 9, 'Segunda/Ala', true),
('Ferrarotti Taborda', 'Fausto', '2013-11-04', 10, 'Centro/Ala', true),
('Fontana', 'Tomás', '2013-12-05', 11, 'Centro/Wing/Fullback', true),
('Fuentes', 'Gerónimo', '2013-11-11', 12, 'Centro/Wing', true),
('Galliussi Malatesta', 'Juan Martín', '2013-01-05', 13, 'Medio/Wing/Fullback', true),
('Gomez', 'Misael', '2013-12-30', 14, 'Pilar', true),
('Haberkorn', 'Ivo Julián', '2013-02-11', 15, 'Wing/Ala', true),
('Hermosid Sosa', 'Tadeo Francisco', '2013-09-18', 16, 'Pilar/Hooker', true),
('Lechman', 'Dylan', '2013-06-19', 17, 'Segunda', true),
('Llensa', 'Baltasar', '2013-05-11', 18, 'Tercera', true),
('Martinez', 'Thiago', '2013-02-27', 19, 'Wing', true),
('Molinas Alejandro Ian', 'Ignacio', '2013-03-01', 20, 'Segunda', true),
('Moscovich', 'Santiago Abel', '2013-11-15', 21, 'Medio/Wing/Fullback', true),
('Notaro', 'Bruno', '2013-12-26', 22, 'Medio', true),
('Pereyra', 'Juan Bautista', '2013-05-27', 23, 'Apertura/Centro/Fullback', true),
('Perez', 'Constantino', '2013-05-24', 24, 'Octavo', true),
('Peruchena', 'Fabian Mateo', '2013-05-25', 25, 'Pilar/Segunda', true),
('Pian', 'Liam Exequiel', '2013-06-19', 26, 'Hooker', true),
('Podesta', 'Ciro', '2013-04-29', 27, 'Centro/Wing', true),
('Proske', 'Jacinto', '2013-07-01', 28, 'Centro/Wing', true),
('Reding', 'Clemente', '2013-08-06', 29, 'Pilar/Segunda', true),
('Reynoso', 'Santiago', '2013-07-11', 30, 'Pilar/Tercera', true),
('Scipione Palavecino', 'Francesco', '2013-09-25', 31, 'Medio/Apertura/Wing/Fullback', true),
('Soria', 'Estefano', '2013-12-16', 32, 'Pilar/Tercera', true),
('Vaschalde', 'Estanislao', '2013-09-19', 33, 'Apertura/Centro', true),
('Villamonte', 'Matheo', '2014-06-06', 34, 'Wing', true)
ON CONFLICT DO NOTHING;