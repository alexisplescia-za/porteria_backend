const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/config — devuelve toda la config activa agrupada por categoría
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT categoria, valor FROM config WHERE activo = true ORDER BY categoria, valor'
    );

    const cfg = {};
    rows.forEach(({ categoria, valor }) => {
      if (!cfg[categoria]) cfg[categoria] = [];
      cfg[categoria].push(valor);
    });

    res.json({ ok: true, data: cfg });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/config — reemplaza toda la config
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const cfg = req.body;
    const ignorar = ['gsUrl'];

    await client.query('BEGIN');
    await client.query('DELETE FROM config');

    let total = 0;
    for (const [categoria, valores] of Object.entries(cfg)) {
      if (ignorar.includes(categoria)) continue;
      if (!Array.isArray(valores)) continue;
      for (const valor of valores) {
        if (!valor) continue;
        await client.query(
          'INSERT INTO config (categoria, valor, activo) VALUES ($1, $2, true)',
          [categoria, valor.toString().trim()]
        );
        total++;
      }
    }

    await client.query('COMMIT');
    res.json({ ok: true, mensaje: `Configuración guardada. ${total} valores.` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
