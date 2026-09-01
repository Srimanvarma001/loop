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
