const { Pool } = require('pg');
require('dotenv').config();

// Strip sslmode/channel_binding from connection string to avoid pg v8 SSL warning;
// SSL is configured explicitly below.
const connectionString = (process.env.DATABASE_URL || '')
  .replace(/[?&]sslmode=[^&]*/g, '')
  .replace(/[?&]channel_binding=[^&]*/g, '')
  .replace(/\?$/, '');

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

module.exports = pool;
