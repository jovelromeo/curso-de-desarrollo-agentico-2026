const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'cursodesarrolloagentico2026',
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id serial PRIMARY KEY,
      name text UNIQUE NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id serial PRIMARY KEY,
      username text UNIQUE NOT NULL,
      password text NOT NULL,
      role_id integer NOT NULL REFERENCES roles(id),
      token text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    INSERT INTO roles (name)
    VALUES ('SuperAdmin'), ('Admin'), ('ReadOnly')
    ON CONFLICT (name) DO NOTHING
  `);
}

async function countUsers() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  return rows[0].count;
}

async function findUserByUsername(username) {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.password, u.role_id, r.name AS role, u.token
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.username = $1`,
    [username]
  );
  return rows[0] || null;
}

async function createUser({ username, password, role }) {
  const { rows: roleRows } = await pool.query(
    'SELECT id FROM roles WHERE name = $1',
    [role]
  );
  const { rows } = await pool.query(
    `INSERT INTO users (username, password, role_id)
     VALUES ($1, $2, $3)
     RETURNING id, username, role_id, created_at`,
    [username, password, roleRows[0].id]
  );
  return { ...rows[0], role };
}

async function listUsers() {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
      ORDER BY u.id`
  );
  return rows;
}

async function setToken(userId, token) {
  await pool.query('UPDATE users SET token = $1 WHERE id = $2', [token, userId]);
}

async function findUserByToken(token) {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.token = $1`,
    [token]
  );
  return rows[0] || null;
}

async function reset() {
  await pool.query('TRUNCATE users RESTART IDENTITY CASCADE');
}

async function close() {
  await pool.end();
}

module.exports = {
  init,
  reset,
  close,
  countUsers,
  findUserByUsername,
  createUser,
  listUsers,
  setToken,
  findUserByToken,
};
