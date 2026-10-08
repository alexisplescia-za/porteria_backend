const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// Rutas de sólo lectura para el backup semanal a Google Sheets (Apps Script).
// Requieren el header x-backup-key igual a la variable de entorno BACKUP_KEY.
// La clave vive sólo en Render y en las propiedades del Apps Script: nunca en el frontend.
router.use((req, res, next) => {
  const clave = process.env.BACKUP_KEY;
  if (!clave) return res.status(503).json({ ok: false, error: 'Backup no configurado (falta BACKUP_KEY)' });
  if (req.headers['x-backup-key'] !== clave) return res.status(403).json({ ok: false, error: 'No autorizado' });
  next();
});

const LIMITE_MAX = 5000;

// La columna created_at no existe en todas las instalaciones de la base. Se detecta una vez.
// Sin created_at se usa fecha_hora y, para no perder registros que llegan tarde (tablet sin
// conexión que sincroniza después), se vuelven a mirar los últimos 30 días: el Apps Script
// descarta los repetidos por ID.
let tieneCreatedAt = null;
async function columnaAlta() {
  if (tieneCreatedAt === null) {
    const { rows } = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'registros' AND column_name = 'created_at' LIMIT 1`
    );
    tieneCreatedAt = rows.length > 0;
  }
  return tieneCreatedAt ? 'COALESCE(created_at, fecha_hora)' : 'fecha_hora';
}

// GET /api/backup/registros?desde=<ISO>&limit=2000&offset=0
// Devuelve los registros cargados después de `desde` (por fecha de alta en la base si existe
// created_at; si no, por fecha_hora con 30 días de margen). Orden estable para paginar con offset.
router.get('/registros', async (req, res) => {
  try {
    const limite = Math.min(parseInt(req.query.limit, 10) || 2000, LIMITE_MAX);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const alta = await columnaAlta();
    const params = [];
    let where = '';
    if (req.query.desde) {
      params.push(req.query.desde);
      where = tieneCreatedAt
        ? `WHERE ${alta} > $${params.length}`
        : `WHERE ${alta} > ($${params.length}::timestamptz - interval '30 days')`;
    }
    const total = await pool.query(`SELECT COUNT(*)::int AS n FROM registros ${where}`, params);
    params.push(limite, offset);
    const { rows } = await pool.query(
      `SELECT id, fecha_hora, tipo_op, perfil, nombre, remito, detalle, estado, obs, modulo,
              egreso_temprano, grupo_id, usuario, ${alta} AS created_at
         FROM registros ${where}
        ORDER BY ${alta}, id
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ ok: true, total: total.rows[0].n, offset, limite, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/backup/config — toda la configuración (activa e inactiva)
router.get('/config', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, categoria, valor, activo FROM config ORDER BY categoria, valor');
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/backup/usuarios — sin contraseñas
router.get('/usuarios', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username, rol, activo FROM usuarios ORDER BY id');
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
