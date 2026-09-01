import express from 'express';
import { initDb } from './db.js';
import itemsRouter from './items.js';

initDb();

const app = express();
app.use(express.json());
app.use('/items', itemsRouter);

export default app;
