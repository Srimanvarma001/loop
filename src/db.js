import { DatabaseSync } from 'node:sqlite';

const dbPath = process.env.DB_PATH || 'items.db';
const db = new DatabaseSync(dbPath);

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0
    )
  `);
}

export { db, initDb };
