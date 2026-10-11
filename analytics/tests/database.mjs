import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

export class TestDatabase {
  constructor() {
    this.sqlite = new DatabaseSync(':memory:');
    this.sqlite.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  }
  prepare(sql) {
    const statement = this.sqlite.prepare(sql);
    const wrapped = params => ({
      bind: (...values) => wrapped(values),
      first: async () => { const row = statement.get(...params); return row ? { ...row } : null; },
      all: async () => ({ results: statement.all(...params).map(row => ({ ...row })) }),
      run: async () => {
        const meta = statement.run(...params);
        return { success: true, meta: { changes: Number(meta.changes), last_row_id: Number(meta.lastInsertRowid) } };
      },
      execute: () => statement.columns().length ? { results: statement.all(...params).map(row => ({ ...row })) } : { results: [], meta: statement.run(...params) },
    });
    return wrapped([]);
  }
  async batch(statements) {
    this.sqlite.exec('BEGIN');
    try {
      const results = statements.map(statement => statement.execute());
      this.sqlite.exec('COMMIT'); return results;
    } catch (error) { this.sqlite.exec('ROLLBACK'); throw error; }
  }
  close() { this.sqlite.close(); }
}
