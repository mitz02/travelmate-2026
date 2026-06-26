import { Pool, QueryResultRow } from 'pg';

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'travelmate',
        ...(process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true'
          ? { ssl: { rejectUnauthorized: false } }
          : {}),
      }
);

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  try {
    const result = await pool.query<T>(text, params);
    return result.rows;
  } catch (e: any) {
    console.error('Database query error:', { message: e?.message, code: e?.code, stack: e?.stack, text: text.slice(0, 100) });
    throw e;
  }
}

export async function queryOne<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

export { pool };
