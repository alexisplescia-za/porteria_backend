const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/usuarios — lista todos los usuarios activos
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, rol FROM usuarios WHERE activo = true ORDER BY username'
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/usuarios/login — login simple por ahora (sin JWT, próxima fase)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const { rows } = await pool.query(
      'SELECT id, username, rol FROM usuarios WHERE username = $1 AND password = $2 AND activo = true',
      [username, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos' });
    }

    res.json({ ok: true, usuario: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
