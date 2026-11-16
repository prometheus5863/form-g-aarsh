const test = require('node:test');
const assert = require('node:assert');
const app = require('../server');

let server, base;
test.before(() => new Promise((resolve) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; resolve(); }); }));
test.after(() => server.close());

test('GET /api/health', async () => {
    const res = await fetch(`${base}/api/health`);
    assert.deepStrictEqual(await res.json(), { ok: true });
});

test('GET /api/ibbi-data returns the three lists from data/*.csv', async () => {
    const data = await (await fetch(`${base}/api/ibbi-data`)).json();
    for (const key of ['assignments', 'announcements', 'public_announcements']) assert.ok(Array.isArray(data[key]), key);
    assert.ok(data.assignments.length > 0);
    assert.ok('Corporate Debtor' in data.assignments[0]);
});

test('POST /api/manual-update needs the token when ADMIN_TOKEN is set', async () => {
    process.env.ADMIN_TOKEN = 'secret';
    const res = await fetch(`${base}/api/manual-update`, { method: 'POST' });
    assert.strictEqual(res.status, 401);
    delete process.env.ADMIN_TOKEN;
});
