const { Pool } = require('pg');

// Connection pool for Supabase PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log successful connection
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

// Handle connection errors
pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Query wrapper function
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`Query executed in ${duration}ms - Rows: ${result.rowCount}`);
    return result;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});

module.exports = { query, pool };