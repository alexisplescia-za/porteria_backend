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

// GET /api/backup/registros?desde=<ISO>&limit=2000&offset=0
// Devuelve los registros cargados después de `desde` (por fecha de alta en la base, no por fecha_hora:
// los registros que se sincronizan tarde desde una tablet sin conexión tienen fecha_hora vieja).
// Orden estable para poder paginar con offset.
router.get('/registros', async (req, res) => {
  try {
    const limite = Math.min(parseInt(req.query.limit, 10) || 2000, LIMITE_MAX);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const params = [];
    let where = '';
    if (req.query.desde) {
      params.push(req.query.desde);
      where = `WHERE COALESCE(created_at, fecha_hora) > $${params.length}`;
    }
    const total = await pool.query(`SELECT COUNT(*)::int AS n FROM registros ${where}`, params);
    params.push(limite, offset);
    const { rows } = await pool.query(
      `SELECT id, fecha_hora, tipo_op, perfil, nombre, remito, detalle, estado, obs, modulo,
              egreso_temprano, grupo_id, usuario, COALESCE(created_at, fecha_hora) AS created_at
         FROM registros ${where}
        ORDER BY COALESCE(created_at, fecha_hora), id
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
    const { rows } = await pool.query('SELECT id, username, rol, activo, created_at FROM usuarios ORDER BY id');
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
