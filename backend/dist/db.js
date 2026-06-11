"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.executeLocalQuery = executeLocalQuery;
exports.saveMessage = saveMessage;
exports.getChatHistory = getChatHistory;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const databasePath = path_1.default.resolve(process.cwd(), 'data.db');
exports.db = new better_sqlite3_1.default(databasePath);
exports.db.pragma('journal_mode = WAL');
exports.db.exec(`
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
const salesCount = exports.db.prepare('SELECT COUNT(*) as count FROM sales').get();
if (salesCount.count === 0) {
    const insertSales = exports.db.prepare('INSERT INTO sales (item_name, units_sold, sale_date) VALUES (?, ?, ?)');
    const seedRows = [
        ['Notebook Pro', 12, '2026-06-01'],
        ['Laser Mouse', 24, '2026-06-02'],
        ['USB-C Dock', 8, '2026-06-03'],
        ['27-inch Monitor', 5, '2026-06-04'],
    ];
    const seedTransaction = exports.db.transaction(() => {
        for (const row of seedRows) {
            insertSales.run(...row);
        }
    });
    seedTransaction();
}
const insertChatMessage = exports.db.prepare('INSERT INTO chat_history (session_id, role, content) VALUES (?, ?, ?)');
const selectChatHistory = exports.db.prepare('SELECT role, content FROM chat_history WHERE session_id = ? ORDER BY id DESC LIMIT ?');
function executeLocalQuery(sql, params = []) {
    const trimmedSql = sql.trim();
    const isReadQuery = /^(select|with|pragma)\b/i.test(trimmedSql);
    try {
        const statement = exports.db.prepare(trimmedSql);
        if (isReadQuery) {
            return statement.all(...params);
        }
        const result = statement.run(...params);
        return `Rows modified: ${result.changes}`;
    }
    catch (error) {
        return error instanceof Error ? error.message : String(error);
    }
}
function saveMessage(sessionId, role, content) {
    insertChatMessage.run(sessionId, role, content);
}
function getChatHistory(sessionId, limit = 20) {
    const rows = selectChatHistory.all(sessionId, limit);
    return rows
        .reverse()
        .map((row) => ({
        role: row.role,
        parts: [{ text: row.content }],
    }));
}
