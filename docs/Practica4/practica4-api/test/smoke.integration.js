const assert = require('node:assert/strict');
const { once } = require('node:events');
const db = require('../db');
const createApp = require('../server');

const BASE_PORT = Number(process.env.PORT) || 0;

async function waitForDb(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      await db.init();
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function post(base, path, body) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function main() {
  await waitForDb();
  await db.reset();
  console.log('DB lista');

  const server = createApp(db).listen(BASE_PORT);
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;

  const suffix = Date.now();
  const first = await post(base, '/register', { username: `admin_${suffix}`, password: 'secret' });
  assert.equal(first.status, 201);
  assert.equal(first.body.role, 'SuperAdmin');

  const second = await post(base, '/register', { username: `user_${suffix}`, password: 'secret' });
  assert.equal(second.status, 201);
  assert.equal(second.body.role, 'ReadOnly');

  const dup = await post(base, '/register', { username: `admin_${suffix}`, password: 'secret' });
  assert.equal(dup.status, 409);

  const login = await post(base, '/login', { username: `admin_${suffix}`, password: 'secret' });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);
  const { token } = login.body;

  const headers = { authorization: `Bearer ${token}` };
  const users = await (await fetch(base + '/users', { headers })).json();
  assert.ok(users.some((u) => u.username === `admin_${suffix}` && u.role === 'SuperAdmin'));
  assert.ok(users.some((u) => u.username === `user_${suffix}` && u.role === 'ReadOnly'));

  const meRes = await fetch(base + '/me', { headers });
  assert.equal(meRes.status, 200);
  const me = await meRes.json();
  assert.equal(me.username, `admin_${suffix}`);
  assert.equal(me.role, 'SuperAdmin');

  server.close();
  await once(server, 'close');
  await db.close();
  console.log('Smoke test OK: register(SuperAdmin/ReadOnly), login, /users, /me');
}

main().catch((err) => {
  console.error('Smoke test FALLO:', err);
  process.exit(1);
});
