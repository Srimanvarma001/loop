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

export default router;
