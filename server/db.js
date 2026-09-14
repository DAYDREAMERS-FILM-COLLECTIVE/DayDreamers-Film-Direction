import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local first, fallback to .env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
    console.error("FATAL: DATABASE_URL not set in environment or .env.local");
}

// Remove query parameters like sslmode that force strict CA validation in pg
const connectionString = rawConnectionString ? rawConnectionString.split('?')[0] : '';

export const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
});

export async function query(text, params) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL) {
        console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
}
