const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const pool      = require('./db');
const registros = require('./routes/registros');
const config    = require('./routes/config');
const usuarios  = require('./routes/usuarios');

const app = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/registros', registros);
app.use('/api/config',    config);
app.use('/api/usuarios',  usuarios);

// Ping — hace query liviana a la DB para mantener Supabase activo
app.get('/api/ping', async (req, res) => {
  const ts = new Date().toISOString();
  try {
    await pool.query('SELECT 1');
    console.log(`🏓 Ping OK — ${ts}`);
    res.json({ ok: true, timestamp: ts, db: 'connected' });
  } catch (err) {
    console.error(`❌ Ping DB error — ${ts}:`, err.message);
    res.status(500).json({ ok: false, timestamp: ts, error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);

  // Self-ping cada 10 minutos — solo en producción
  if (process.env.NODE_ENV === 'production') {
    const BASE =
      process.env.RENDER_EXTERNAL_URL ||
      process.env.BASE_URL ||
      `http://localhost:${PORT}`;

    setInterval(async () => {
      try {
        const r = await fetch(`${BASE}/api/ping`);
        const data = await r.json();
        console.log(`🏓 Self-ping OK — ${data.timestamp}`);
      } catch (err) {
        console.warn(`⚠️ Self-ping failed — ${new Date().toISOString()}:`, err.message);
      }
    }, 10 * 60 * 1000); // 10 minutos

    console.log(`🔁 Self-ping activado → ${BASE}/api/ping`);
  }
});
