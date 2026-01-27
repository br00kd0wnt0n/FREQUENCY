import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database is optional - server can run without it for demo/testing
const DATABASE_URL = process.env.DATABASE_URL;
export const isDatabaseConfigured = !!DATABASE_URL;

export const pool = DATABASE_URL ? new Pool({
  connectionString: DATABASE_URL,
}) : null;

if (pool) {
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });
}

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  if (!pool) {
    console.warn('Database not configured, returning empty result');
    return [];
  }
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

export async function testConnection(): Promise<boolean> {
  if (!pool) {
    console.log('Database not configured - running in demo mode');
    return true; // Allow server to start without database
  }
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    console.log('Continuing in demo mode without database');
    return true; // Allow server to start even if connection fails
  }
}
