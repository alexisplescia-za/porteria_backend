const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/registros
// Soporta filtros: ?tipoOp=INGRESO&perfil=Proveedor&desde=2026-01-01&hasta=2026-12-31
router.get('/', async (req, res) => {
  try {
    const { tipoOp, perfil, modulo, desde, hasta } = req.query;
    let query  = 'SELECT * FROM registros WHERE 1=1';
    const params = [];

    if (tipoOp) { params.push(tipoOp);  query += ` AND tipo_op = $${params.length}`; }
    if (perfil)  { params.push(perfil);  query += ` AND perfil  = $${params.length}`; }
    if (modulo)  { params.push(modulo);  query += ` AND modulo  = $${params.length}`; }
    if (desde)   { params.push(desde);   query += ` AND fecha_hora >= $${params.length}`; }
    if (hasta)   { params.push(hasta);   query += ` AND fecha_hora <= $${params.length}`; }

    query += ' ORDER BY fecha_hora DESC';

    const { rows } = await pool.query(query, params);
    res.json({ ok: true, data: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/registros — guardar un registro
router.post('/', async (req, res) => {
  try {
    const {
      id, fechaHora, tipoOp, perfil, nombre,
      remito, detalle, estado, obs, modulo,
      egresoTemprano, grupoId, usuario
    } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO registros
        (id, fecha_hora, tipo_op, perfil, nombre, remito, detalle, estado, obs, modulo, egreso_temprano, grupo_id, usuario)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [id, fechaHora, tipoOp, perfil, nombre, remito ?? 'N/A', detalle ?? 'N/A',
       estado ?? 'N/A', obs ?? '', modulo ?? 'general', egresoTemprano ?? false, grupoId ?? id, usuario ?? 'sistema']
    );

    res.json({ ok: true, data: rows[0], mensaje: `Registro ${id} guardado correctamente` });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/registros/purge — borrar todos los registros
router.delete('/purge', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM registros');
    res.json({ ok: true, eliminados: rowCount });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/registros/lote — guardar múltiples registros (ingreso + egreso temprano)
router.post('/lote', async (req, res) => {
  const client = await pool.connect();
  try {
    const registros = req.body;
    if (!Array.isArray(registros) || registros.length === 0) {
      return res.status(400).json({ ok: false, error: 'El lote está vacío o tiene formato inválido' });
    }

    await client.query('BEGIN');
    const insertados = [];

    for (const r of registros) {
      const { rows } = await client.query(
        `INSERT INTO registros
          (id, fecha_hora, tipo_op, perfil, nombre, remito, detalle, estado, obs, modulo, egreso_temprano, grupo_id, usuario)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [r.id, r.fechaHora, r.tipoOp, r.perfil, r.nombre, r.remito ?? 'N/A', r.detalle ?? 'N/A',
         r.estado ?? 'N/A', r.obs ?? '', r.modulo ?? 'general', r.egresoTemprano ?? false, r.grupoId ?? r.id, r.usuario ?? 'sistema']
      );
      insertados.push(rows[0]);
    }

    await client.query('COMMIT');
    res.json({ ok: true, guardados: insertados.length, ids: insertados.map(r => r.id) });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
