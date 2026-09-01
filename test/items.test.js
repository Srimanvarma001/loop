import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.DB_PATH = ':memory:';

const { default: app } = await import('../src/app.js');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve, reject) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
    server.on('error', reject);
  });
});

after(() => {
  server?.close();
});

function fetch(path) {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${path}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: JSON.parse(body) });
      });
    }).on('error', reject);
  });
}

function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = http.request(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let chunks = '';
      res.on('data', chunk => chunks += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: JSON.parse(chunks) });
      });
    });
    req.on('error', reject);
    req.end(body);
  });
}

function put(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = http.request(`${baseUrl}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let chunks = '';
      res.on('data', chunk => chunks += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: JSON.parse(chunks) });
      });
    });
    req.on('error', reject);
    req.end(body);
  });
}

function del(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${baseUrl}${path}`, { method: 'DELETE' }, (res) => {
      let chunks = '';
      res.on('data', chunk => chunks += chunk);
      res.on('end', () => {
        const body = chunks ? JSON.parse(chunks) : null;
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

describe('GET /items', () => {
  it('returns 200 and empty array when no items exist', async () => {
    const res = await fetch('/items');
    assert.equal(res.status, 200);
    assert.deepStrictEqual(res.body, []);
  });
});

describe('POST /items', () => {
  it('creates an item and returns 201 with id, title, done:false', async () => {
    const res = await post('/items', { title: 'Buy milk' });
    assert.equal(res.status, 201);
    assert.equal(res.body.title, 'Buy milk');
    assert.equal(res.body.done, false);
    assert.ok(typeof res.body.id === 'number');
  });

  it('created item appears in GET /items', async () => {
    const list = await fetch('/items');
    assert.equal(list.status, 200);
    assert.ok(list.body.some(i => i.title === 'Buy milk'));
  });

  it('returns 400 when title is missing', async () => {
    const res = await post('/items', {});
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('returns 400 when title is empty string', async () => {
    const res = await post('/items', { title: '' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('returns 400 when title is only whitespace', async () => {
    const res = await post('/items', { title: '   ' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });
});

describe('GET /items/:id', () => {
  it('returns 200 with the item for a valid id', async () => {
    const created = await post('/items', { title: 'Read item' });
    assert.equal(created.status, 201);
    const res = await fetch(`/items/${created.body.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.id, created.body.id);
    assert.equal(res.body.title, 'Read item');
    assert.equal(res.body.done, false);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await fetch('/items/999999');
    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, { error: 'Not found' });
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await fetch('/items/abc');
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });
});

describe('PUT /items/:id', () => {
  it('updates done field and returns 200 with the updated item', async () => {
    const created = await post('/items', { title: 'Update done' });
    assert.equal(created.status, 201);
    const res = await put(`/items/${created.body.id}`, { done: true });
    assert.equal(res.status, 200);
    assert.equal(res.body.id, created.body.id);
    assert.equal(res.body.title, 'Update done');
    assert.equal(res.body.done, true);
  });

  it('update persists in follow-up GET', async () => {
    const created = await post('/items', { title: 'Persist title' });
    assert.equal(created.status, 201);
    const updated = await put(`/items/${created.body.id}`, { title: 'New title' });
    assert.equal(updated.status, 200);
    const fetched = await fetch(`/items/${created.body.id}`);
    assert.equal(fetched.status, 200);
    assert.equal(fetched.body.title, 'New title');
  });

  it('updates both title and done in one request', async () => {
    const created = await post('/items', { title: 'Both fields' });
    assert.equal(created.status, 201);
    const res = await put(`/items/${created.body.id}`, { title: 'Updated both', done: true });
    assert.equal(res.status, 200);
    assert.equal(res.body.title, 'Updated both');
    assert.equal(res.body.done, true);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await put('/items/999999', { done: true });
    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, { error: 'Not found' });
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await put('/items/abc', { done: true });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });
});

describe('DELETE /items/:id', () => {
  it('deletes an item and returns 204; item is gone from GET /items', async () => {
    const created = await post('/items', { title: 'Delete me' });
    assert.equal(created.status, 201);
    const res = await del(`/items/${created.body.id}`);
    assert.equal(res.status, 204);
    const list = await fetch('/items');
    assert.ok(!list.body.some(i => i.id === created.body.id));
  });

  it('returns 404 for an unknown id', async () => {
    const res = await del('/items/999999');
    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, { error: 'Not found' });
  });

  it('returns 404 when deleting an already-deleted id', async () => {
    const created = await post('/items', { title: 'Delete twice' });
    assert.equal(created.status, 201);
    const first = await del(`/items/${created.body.id}`);
    assert.equal(first.status, 204);
    const second = await del(`/items/${created.body.id}`);
    assert.equal(second.status, 404);
  });

  it('deleting the last item leaves an empty list', async () => {
    const list1 = await fetch('/items');
    for (const item of list1.body) {
      await del(`/items/${item.id}`);
    }
    const list2 = await fetch('/items');
    assert.deepStrictEqual(list2.body, []);
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await del('/items/abc');
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });
});
