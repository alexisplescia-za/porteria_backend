const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/usuarios — lista todos los usuarios (activos e inactivos)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, rol, activo, created_at FROM usuarios ORDER BY username'
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/usuarios/login
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

// PUT /api/usuarios/:id/reactivar — va ANTES que /:id para que Express no lo capture primero
router.put('/:id/reactivar', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'UPDATE usuarios SET activo = true WHERE id = $1 RETURNING id, username',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    res.json({ ok: true, usuario: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/usuarios — crear usuario
router.post('/', async (req, res) => {
  try {
    const { username, password, rol } = req.body;
    if (!username || !password || !rol) {
      return res.status(400).json({ ok: false, error: 'username, password y rol son requeridos' });
    }
    if (!['admin', 'porteria'].includes(rol)) {
      return res.status(400).json({ ok: false, error: 'rol debe ser admin o porteria' });
    }
    const { rows } = await pool.query(
      'INSERT INTO usuarios (username, password, rol) VALUES ($1, $2, $3) RETURNING id, username, rol',
      [username.trim(), password, rol]
    );
    res.json({ ok: true, usuario: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, error: 'Ya existe un usuario con ese nombre' });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/usuarios/:id — editar contraseña y/o rol
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, rol } = req.body;

    const updates = [];
    const values  = [];
    let i = 1;

    if (password) { updates.push(`password = $${i++}`); values.push(password); }
    if (rol)      { updates.push(`rol = $${i++}`);      values.push(rol); }

    if (updates.length === 0) {
      return res.status(400).json({ ok: false, error: 'Nada que actualizar' });
    }

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, username, rol`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    res.json({ ok: true, usuario: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/usuarios/:id — desactivar usuario
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'UPDATE usuarios SET activo = false WHERE id = $1 RETURNING id, username',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    res.json({ ok: true, usuario: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
