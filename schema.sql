-- ════════════════════════════════════════════════════════════════
--  PORTERÍA CARREFOUR — Schema PostgreSQL (Neon)
--  Ejecutar una sola vez en la consola SQL de Neon
-- ════════════════════════════════════════════════════════════════

-- Tabla de registros de ingresos/egresos
CREATE TABLE IF NOT EXISTS registros (
  id              TEXT PRIMARY KEY,
  fecha_hora      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo_op         TEXT NOT NULL CHECK (tipo_op IN ('INGRESO', 'EGRESO')),
  perfil          TEXT,
  nombre          TEXT,
  remito          TEXT DEFAULT 'N/A',
  detalle         TEXT DEFAULT 'N/A',
  estado          TEXT DEFAULT 'N/A',
  obs             TEXT DEFAULT '',
  modulo          TEXT DEFAULT 'general',
  egreso_temprano BOOLEAN DEFAULT FALSE,
  grupo_id        TEXT,
  usuario         TEXT DEFAULT 'sistema',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas en historial
CREATE INDEX IF NOT EXISTS idx_registros_fecha   ON registros (fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_registros_tipo_op ON registros (tipo_op);
CREATE INDEX IF NOT EXISTS idx_registros_perfil  ON registros (perfil);
CREATE INDEX IF NOT EXISTS idx_registros_grupo   ON registros (grupo_id);

-- Tabla de configuración dinámica (proveedores, jefes, etc.)
CREATE TABLE IF NOT EXISTS config (
  id         SERIAL PRIMARY KEY,
  categoria  TEXT NOT NULL,
  valor      TEXT NOT NULL,
  activo     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_config_categoria ON config (categoria);

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id         SERIAL PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  rol        TEXT NOT NULL CHECK (rol IN ('admin', 'porteria')),
  activo     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de auditoría
CREATE TABLE IF NOT EXISTS auditoria (
  id         SERIAL PRIMARY KEY,
  accion     TEXT NOT NULL,
  usuario    TEXT NOT NULL,
  detalle    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
--  DATOS INICIALES
-- ════════════════════════════════════════════════════════════════

-- Usuarios iniciales (mismos que el HTML actual)
INSERT INTO usuarios (username, password, rol) VALUES
  ('admin',    'admin123',    'admin'),
  ('porteria', 'porteria1',   'porteria'),
  ('Dana',     'dana123',     'porteria'),
  ('Anibal',   'anibal123',   'porteria'),
  ('German',   'german123',   'porteria')
ON CONFLICT (username) DO NOTHING;
