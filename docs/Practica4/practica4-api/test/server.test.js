const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const createApp = require('../server');
const { FakeDb } = require('./fake-db');

async function withApp(run) {
  const db = new FakeDb();
  const server = createApp(db).listen(0);
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run({ db, base });
  } finally {
    server.close();
    await once(server, 'close');
  }
}

function post(base, path, body) {
  return fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function register(base, username, password = 'secret') {
  const res = await post(base, '/register', { username, password });
  return res.json();
}

async function login(base, username, password = 'secret') {
  const res = await post(base, '/login', { username, password });
  const { token } = await res.json();
  return token;
}

function authGet(base, path, token) {
  return fetch(base + path, { headers: { authorization: `Bearer ${token}` } });
}

test('register: el primer usuario recibe rol SuperAdmin', async () => {
  await withApp(async ({ base }) => {
    const res = await post(base, '/register', { username: 'ana', password: 'secret' });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.username, 'ana');
    assert.equal(body.role, 'SuperAdmin');
  });
});

test('register: el segundo usuario recibe rol ReadOnly', async () => {
  await withApp(async ({ base }) => {
    await register(base, 'ana');
    const res = await post(base, '/register', { username: 'bob', password: 'secret' });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.role, 'ReadOnly');
  });
});

test('register: username duplicado devuelve 409', async () => {
  await withApp(async ({ base }) => {
    await register(base, 'ana');
    const res = await post(base, '/register', { username: 'ana', password: 'otra' });
    assert.equal(res.status, 409);
  });
});

test('register: campos faltantes devuelve 400', async () => {
  await withApp(async ({ base }) => {
    const res = await post(base, '/register', { username: 'ana' });
    assert.equal(res.status, 400);
  });
});

test('login: devuelve un token y lo persiste', async () => {
  await withApp(async ({ db, base }) => {
    await register(base, 'ana');
    const res = await post(base, '/login', { username: 'ana', password: 'secret' });
    assert.equal(res.status, 200);
    const { token } = await res.json();
    assert.ok(token);
    assert.equal((await db.findUserByUsername('ana')).token, token);
  });
});

test('login: password incorrecta devuelve 401', async () => {
  await withApp(async ({ base }) => {
    await register(base, 'ana');
    const res = await post(base, '/login', { username: 'ana', password: 'mala' });
    assert.equal(res.status, 401);
  });
});

test('login: usuario inexistente devuelve 404', async () => {
  await withApp(async ({ base }) => {
    const res = await post(base, '/login', { username: 'nadie', password: 'secret' });
    assert.equal(res.status, 404);
  });
});

test('users: sin token devuelve 401', async () => {
  await withApp(async ({ base }) => {
    const res = await fetch(base + '/users');
    assert.equal(res.status, 401);
  });
});

test('users: token invalido devuelve 401', async () => {
  await withApp(async ({ base }) => {
    const res = await authGet(base, '/users', 'token-falso');
    assert.equal(res.status, 401);
  });
});

test('users: header sin esquema Bearer devuelve 401', async () => {
  await withApp(async ({ base }) => {
    await register(base, 'ana');
    const token = await login(base, 'ana');
    const res = await fetch(base + '/users', { headers: { authorization: token } });
    assert.equal(res.status, 401);
  });
});

test('users: con token devuelve la lista con rol', async () => {
  await withApp(async ({ base }) => {
    await register(base, 'ana');
    await register(base, 'bob');
    const token = await login(base, 'ana');
    const res = await authGet(base, '/users', token);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, [
      { id: 1, username: 'ana', role: 'SuperAdmin' },
      { id: 2, username: 'bob', role: 'ReadOnly' },
    ]);
  });
});

test('me: sin token devuelve 401', async () => {
  await withApp(async ({ base }) => {
    const res = await fetch(base + '/me');
    assert.equal(res.status, 401);
  });
});

test('me: con token devuelve el usuario autenticado', async () => {
  await withApp(async ({ base }) => {
    await register(base, 'ana');
    const token = await login(base, 'ana');
    const res = await authGet(base, '/me', token);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { id: 1, username: 'ana', role: 'SuperAdmin' });
  });
});

test('raiz: devuelve el nombre del proyecto', async () => {
  await withApp(async ({ base }) => {
    const res = await fetch(base + '/');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { name: 'practica4-api' });
  });
});

test('openapi: genera la spec a partir de los endpoints', async () => {
  await withApp(async ({ base }) => {
    const res = await fetch(base + '/openapi.json');
    assert.equal(res.status, 200);
    const spec = await res.json();
    assert.equal(spec.openapi, '3.0.0');
    assert.deepEqual(Object.keys(spec.paths).sort(), ['/', '/login', '/me', '/register', '/users']);
  });
});

test('docs: sirve el cliente REST de Scalar', async () => {
  await withApp(async ({ base }) => {
    const res = await fetch(base + '/docs');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.match(await res.text(), /api-reference/i);
  });
});
