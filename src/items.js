import { Router } from 'express';
import { db } from './db.js';

const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM items').all();
  const items = rows.map(row => ({
    id: row.id,
    title: row.title,
    done: row.done === 1,
  }));
  res.json(items);
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const row = db.prepare('SELECT * FROM items WHERE id = ?').get(Number(id));
  if (!row) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({ id: row.id, title: row.title, done: row.done === 1 });
});

router.post('/', (req, res) => {
  const { title } = req.body || {};
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const stmt = db.prepare('INSERT INTO items (title, done) VALUES (?, 0)');
  const info = stmt.run(title.trim());
  const item = { id: Number(info.lastInsertRowid), title: title.trim(), done: false };
  res.status(201).json(item);
});

export default router;
