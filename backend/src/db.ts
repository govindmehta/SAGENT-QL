import Database from 'better-sqlite3';
import path from 'path';

const databasePath = path.resolve(process.cwd(), 'data.db');
export const db = new Database(databasePath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY,
    item_name TEXT NOT NULL,
    units_sold INTEGER NOT NULL,
    sale_date TEXT NOT NULL
  );
`);

const salesCount = db.prepare('SELECT COUNT(*) as count FROM sales').get() as { count: number };

if (salesCount.count === 0) {
  const insertSales = db.prepare(
    'INSERT INTO sales (item_name, units_sold, sale_date) VALUES (?, ?, ?)'
  );

  const seedRows = [
    ['Notebook Pro', 12, '2026-06-01'],
    ['Laser Mouse', 24, '2026-06-02'],
    ['USB-C Dock', 8, '2026-06-03'],
    ['27-inch Monitor', 5, '2026-06-04'],
  ] as const;

  const seedTransaction = db.transaction(() => {
    for (const row of seedRows) {
      insertSales.run(...row);
    }
  });

  seedTransaction();
}

export function executeLocalQuery(sql: string, params: any[] = []) {
  const trimmedSql = sql.trim();
  const isReadQuery = /^(select|with|pragma)\b/i.test(trimmedSql);

  try {
    const statement = db.prepare(trimmedSql);

    if (isReadQuery) {
      return statement.all(...params);
    }

    const result = statement.run(...params);
    return `Rows modified: ${result.changes}`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}