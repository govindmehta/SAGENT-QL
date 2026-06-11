import Database from 'better-sqlite3';
import path from 'path';

type ChatRole = 'user' | 'model';

type GeminiChatMessage = {
  role: ChatRole;
  parts: [{ text: string }];
};

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

  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
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

const insertChatMessage = db.prepare(
  'INSERT INTO chat_history (session_id, role, content) VALUES (?, ?, ?)'
);

const selectChatHistory = db.prepare(
  'SELECT role, content FROM chat_history WHERE session_id = ? ORDER BY id DESC LIMIT ?'
);

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

export function saveMessage(sessionId: string, role: ChatRole, content: string) {
  insertChatMessage.run(sessionId, role, content);
}

export function getChatHistory(sessionId: string, limit: number = 20): GeminiChatMessage[] {
  const rows = selectChatHistory.all(sessionId, limit) as Array<{
    role: ChatRole;
    content: string;
  }>;

  return rows
    .reverse()
    .map((row) => ({
      role: row.role,
      parts: [{ text: row.content }],
    }));
}