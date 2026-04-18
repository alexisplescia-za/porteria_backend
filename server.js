const express = require('express');
const cors    = require('cors');
require('dotenv').config();

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

// Ping
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Servidor corriendo en puerto ${PORT}`));
