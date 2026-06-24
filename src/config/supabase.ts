import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'travelmate',
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// ─────────────────────────────────────────────────────────────
// Minimal pg-based replacement for supabaseAdmin
// Handles the query patterns used across the codebase.
// ─────────────────────────────────────────────────────────────

class PostgrestFilterBuilder {
  private text: string;
  private params: any[];
  private counter: number;
  private countMode: boolean = false;
  public table: string = '';
  public selectColumns: string = '*';

  constructor(text: string, params: any[], counter: number) {
    this.text = text;
    this.params = params;
    this.counter = counter;
  }

  private param(val: any): string {
    this.params.push(val);
    return `$${this.params.length}`;
  }

  eq(col: string, val: any) {
    this.text += ` AND ${col} = ${this.param(val)}`;
    return this;
  }

  neq(col: string, val: any) {
    this.text += ` AND ${col} != ${this.param(val)}`;
    return this;
  }

  gt(col: string, val: any) {
    this.text += ` AND ${col} > ${this.param(val)}`;
    return this;
  }

  gte(col: string, val: any) {
    this.text += ` AND ${col} >= ${this.param(val)}`;
    return this;
  }

  lt(col: string, val: any) {
    this.text += ` AND ${col} < ${this.param(val)}`;
    return this;
  }

  lte(col: string, val: any) {
    this.text += ` AND ${col} <= ${this.param(val)}`;
    return this;
  }

  is(col: string, val: any) {
    if (val === null) {
      this.text += ` AND ${col} IS NULL`;
    } else {
      this.text += ` AND ${col} IS ${this.param(val)}`;
    }
    return this;
  }

  in(col: string, vals: any[]) {
    if (vals.length === 0) {
      this.text += ` AND 1=0`;
      return this;
    }
    const placeholders = vals.map(v => this.param(v)).join(',');
    this.text += ` AND ${col} IN (${placeholders})`;
    return this;
  }

  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    const dir = opts?.ascending !== false ? 'ASC' : 'DESC';
    const nulls = opts?.nullsFirst ? 'NULLS FIRST' : 'NULLS LAST';
    this.text += ` ORDER BY ${col} ${dir} ${nulls}`;
    return this;
  }

  limit(count: number) {
    this.text += ` LIMIT ${count}`;
    return this;
  }

  range(start: number, end: number) {
    this.text += ` OFFSET ${start} LIMIT ${end - start + 1}`;
    return this;
  }

  or(filters: string) {
    // filters format: "col1.eq.val1,col2.eq.val2"
    const parts = filters.split(',');
    const orClauses = parts.map(p => {
      const [col, op, ...rest] = p.split('.');
      const val = rest.join('.');
      if (op === 'eq') return `${col} = '${val}'`;
      if (op === 'neq') return `${col} != '${val}'`;
      if (op === 'is') return `${col} IS ${val}`;
      return `${col} ${op} '${val}'`;
    });
    this.text += ` AND (${orClauses.join(' OR ')})`;
    return this;
  }

  textSearch(col: string, query: string) {
    this.text += ` AND ${col} ILIKE ${this.param(`%${query}%`)}`;
    return this;
  }

  ilike(col: string, pattern: string) {
    this.text += ` AND ${col} ILIKE ${this.param(pattern)}`;
    return this;
  }

  /** Simulate the select with joined tables: "*, profiles(full_name, email)" */
  select(columns: string = '*') {
    this.selectColumns = columns;
    return this;
  }

  single() {
    return this._single(this.selectColumns);
  }

  maybeSingle() {
    return this._maybeSingle(this.selectColumns);
  }

  private async executeSelect(columns: string) {
    const parsed = this.parseSelect(columns);
    const sql = `SELECT ${parsed.columns} FROM "${this.table}" WHERE 1=1${this.text}`;
    let result;
    try {
      result = await pool.query(sql, this.params);
    } catch (e: any) {
      if (this.countMode && e.message?.includes('count')) {
        return { data: [], count: 0, error: null };
      }
      return { data: null, error: { message: e.message, code: e.code } };
    }
    const rows = this.processRows(result.rows, parsed.joins);
    const output: any = { data: rows, error: null };
    if (this.countMode && result.rows.length > 0) {
      output.count = result.rows.length;
    }
    return output;
  }

  private parseSelect(columns: string) {
    const joins: Array<{ table: string; cols: string[] }> = [];
    // Parse "*, profiles(full_name, user_id)" pattern
    const mainCols = columns.replace(/\w+\([^)]*\)/g, (match) => {
      const m = match.match(/(\w+)\(([^)]+)\)/);
      if (m) joins.push({ table: m[1], cols: m[2].split(',').map(c => c.trim()) });
      return '';
    }).replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '');
    const cols = mainCols || '*';
    return { columns: cols, joins };
  }

  private processRows(rows: any[], joins: Array<{ table: string; cols: string[] }>) {
    if (joins.length === 0) return rows;
    return rows.map(row => {
      for (const join of joins) {
        const obj: any = {};
        for (const col of join.cols) {
          obj[col] = row[col] ?? null;
          delete row[col];
        }
        row[join.table] = obj;
      }
      return row;
    });
  }

  private async _single(columns: string) {
    const result = await this.executeSelect(columns);
    if (result.error) return result;
    result.data = result.data?.[0] ?? null;
    return result;
  }

  private async _maybeSingle(columns: string) {
    const result = await this.executeSelect(columns);
    result.data = result.data?.[0] ?? null;
    return result;
  }

  then(resolve: any, reject?: any) {
    const self = this as any;
    if (typeof self.executeUpdate === 'function') {
      return self.executeUpdate().then(resolve).catch(reject);
    }
    if (typeof self.executeDelete === 'function') {
      return self.executeDelete().then(resolve).catch(reject);
    }
    return this.executeSelect(this.selectColumns).then(resolve, reject);
  }
}

class PostgrestQueryBuilder {
  private table: string;
  constructor(table: string) { this.table = table; }

  select(columns: string = '*', opts?: { count?: string; head?: boolean }) {
    const builder = new PostgrestFilterBuilder('', [], 1);
    builder.table = this.table;
    builder.selectColumns = columns;
    if (opts?.count === 'exact') {
      (builder as any).countMode = true;
    }
    return builder;
  }

  insert(values: any | any[], opts?: any) {
    const rows = Array.isArray(values) ? values : [values];
    const cols = Object.keys(rows[0]).map(c => `"${c}"`);

    const buildSQL = (returning: string) => {
      const allParams: any[] = [];
      const allVals: string[] = [];
      for (const row of rows) {
        const placeholders = cols.map((_, i) => {
          allParams.push(row[Object.keys(row)[i]]);
          return `$${allParams.length}`;
        });
        allVals.push(`(${placeholders.join(',')})`);
      }
      return { sql: `INSERT INTO "${this.table}" (${cols.join(',')}) VALUES ${allVals.join(',')} ${returning}`, params: allParams };
    };

    return {
      select: () => ({
        single: async () => {
          const { sql, params } = buildSQL('RETURNING *');
          try {
            const result = await pool.query(sql, params);
            return { data: result.rows[0], error: null };
          } catch (e: any) {
            return { data: null, error: { message: e.message, code: e.code } };
          }
        },
        maybeSingle: async () => {
          const { sql, params } = buildSQL('RETURNING *');
          try {
            const result = await pool.query(sql, params);
            return { data: result.rows[0] || null, error: null };
          } catch (e: any) {
            return { data: null, error: { message: e.message, code: e.code } };
          }
        },
      }),
      then: async (resolve: any) => {
        const { sql, params } = buildSQL('');
        try {
          await pool.query(sql, params);
          resolve({ data: null, error: null });
        } catch (e: any) {
          resolve({ data: null, error: { message: e.message, code: e.code } });
        }
      },
    };
  }

  update(values: Record<string, any>) {
    const setClauses: string[] = [];
    const params: any[] = [];
    for (const [key, val] of Object.entries(values)) {
      params.push(val);
      // Handle jsonb::jsonb cast for JSON values
      if (val !== null && typeof val === 'object') {
        setClauses.push(`"${key}" = $${params.length}::jsonb`);
      } else {
        setClauses.push(`"${key}" = $${params.length}`);
      }
    }

    const builder = new PostgrestFilterBuilder('', params, params.length + 1);
    builder.table = this.table;
    (builder as any).executeUpdate = async () => {
      const sql = `UPDATE "${this.table}" SET ${setClauses.join(', ')} WHERE 1=1${(builder as any).text}`;
      try {
        await pool.query(sql, params);
        return { data: null, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e.message, code: e.code } };
      }
    };
    return builder;
  }

  delete(opts?: any) {
    const builder = new PostgrestFilterBuilder('', [], 1);
    builder.table = this.table;
    (builder as any).executeDelete = async () => {
      const sql = `DELETE FROM "${this.table}" WHERE 1=1${(builder as any).text}`;
      try {
        await pool.query(sql, (builder as any).params);
        return { data: null, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e.message, code: e.code } };
      }
    };
    return builder;
  }

  upsert(values: any, opts?: any) {
    const rows = Array.isArray(values) ? values : [values];
    const cols = Object.keys(rows[0]).map(c => `"${c}"`);
    const conflictCols = opts?.onConflict || '';
    const updateCols = cols.filter(c => !conflictCols.split(',').map((s: string) => `"${s.trim()}"`).includes(c));

    const buildSQL = (returning: string) => {
      const allParams: any[] = [];
      const allVals: string[] = [];
      for (const row of rows) {
        const placeholders = cols.map((_, i) => {
          allParams.push(row[Object.keys(row)[i]]);
          return `$${allParams.length}`;
        });
        allVals.push(`(${placeholders.join(',')})`);
      }
      let conflict = '';
      if (conflictCols) {
        const setClauses = updateCols.map(c => `${c} = EXCLUDED.${c}`);
        conflict = ` ON CONFLICT (${conflictCols}) DO UPDATE SET ${setClauses.join(', ')}`;
      }
      return { sql: `INSERT INTO "${this.table}" (${cols.join(',')}) VALUES ${allVals.join(',')}${conflict} ${returning}`, params: allParams };
    };

    return {
      select: () => ({
        single: async () => {
          const { sql, params } = buildSQL('RETURNING *');
          try {
            const result = await pool.query(sql, params);
            return { data: result.rows[0], error: null };
          } catch (e: any) {
            return { data: null, error: { message: e.message, code: e.code } };
          }
        },
        maybeSingle: async () => {
          const { sql, params } = buildSQL('RETURNING *');
          try {
            const result = await pool.query(sql, params);
            return { data: result.rows[0] || null, error: null };
          } catch (e: any) {
            return { data: null, error: { message: e.message, code: e.code } };
          }
        },
      }),
      then: async (resolve: any) => {
        const { sql, params } = buildSQL('');
        try {
          await pool.query(sql, params);
          resolve({ data: null, error: null });
        } catch (e: any) {
          resolve({ data: null, error: { message: e.message, code: e.code } });
        }
      },
    };
  }
}

class PostgrestClient {
  from(table: string) {
    return new PostgrestQueryBuilder(table);
  }

  async rpc(fn: string, params: Record<string, any>) {
    const keys = Object.keys(params);
    const vals = Object.values(params);
    const placeholders = keys.map((k, i) => `$${i + 1}`);
    const sql = `SELECT * FROM "${fn}"(${placeholders.join(',')})`;
    try {
      const result = await pool.query(sql, vals);
      return { data: result.rows[0]?.[fn] ?? result.rows[0] ?? null, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e.message, code: e.code } };
    }
  }

  schema(s: string) {
    return this;
  }
}

export const supabaseAdmin = new PostgrestClient() as any;
export const supabase = supabaseAdmin;
export function createSupabaseClientWithAuth(token: string) {
  return supabaseAdmin;
}
export { pool };
