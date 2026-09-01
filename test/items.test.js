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

describe('GET /items', () => {
  it('returns 200 and empty array when no items exist', async () => {
    const res = await fetch('/items');
    assert.equal(res.status, 200);
    assert.deepStrictEqual(res.body, []);
  });
});
