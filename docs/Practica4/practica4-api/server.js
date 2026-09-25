const express = require('express');
const crypto = require('node:crypto');
const path = require('node:path');
const swaggerJsdoc = require('swagger-jsdoc');
const { apiReference } = require('@scalar/express-api-reference');

const { name: PROJECT_NAME, version: PROJECT_VERSION } = require('./package.json');

// OpenAPI generado automaticamente a partir de los comentarios @openapi de las rutas.
const openapiSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: PROJECT_NAME,
      version: PROJECT_VERSION,
      description: 'API Express 5 + Postgres de la Practica4.',
    },
    servers: [{ url: '/' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer' },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            username: { type: 'string', example: 'ana' },
            role: { type: 'string', example: 'SuperAdmin' },
          },
        },
        Error: {
          type: 'object',
          properties: { error: { type: 'string', example: 'Token requerido' } },
        },
      },
    },
  },
  apis: [path.join(__dirname, 'server.js')],
});

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.set('json spaces', 2);

  const auth = async (req, res, next) => {
    try {
      const [scheme, token] = (req.headers.authorization || '').split(' ');
      if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Token requerido' });
      }
      const user = await db.findUserByToken(token);
      if (!user) {
        return res.status(401).json({ error: 'Token invalido' });
      }
      req.user = user;
      next();
    } catch (err) {
      console.error('[auth]', err);
      res.status(500).json({ error: 'Error interno' });
    }
  };

  /**
   * @openapi
   * /:
   *   get:
   *     tags: [Info]
   *     summary: Nombre del proyecto
   *     responses:
   *       200:
   *         description: Nombre del proyecto
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 name: { type: string, example: practica4-api }
   */
  app.get('/', (req, res) => {
    res.json({ name: PROJECT_NAME });
  });

  /**
   * @openapi
   * /register:
   *   post:
   *     tags: [Auth]
   *     summary: Registra un usuario
   *     description: El primer usuario registrado recibe rol SuperAdmin, el resto ReadOnly.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [username, password]
   *             properties:
   *               username: { type: string, example: ana }
   *               password: { type: string, example: secret }
   *     responses:
   *       201:
   *         description: Usuario creado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/User' }
   *       400:
   *         description: Campos faltantes
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error' }
   *       409:
   *         description: El usuario ya existe
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error' }
   */
  app.post('/register', async (req, res) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ error: 'username y password son requeridos' });
      }
      if (await db.findUserByUsername(username)) {
        return res.status(409).json({ error: 'El usuario ya existe' });
      }
      const role = (await db.countUsers()) === 0 ? 'SuperAdmin' : 'ReadOnly';
      const user = await db.createUser({ username, password, role });
      res.status(201).json({ id: user.id, username: user.username, role: user.role });
    } catch (err) {
      console.error('[register]', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  /**
   * @openapi
   * /login:
   *   post:
   *     tags: [Auth]
   *     summary: Inicia sesion y devuelve un token
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [username, password]
   *             properties:
   *               username: { type: string, example: ana }
   *               password: { type: string, example: secret }
   *     responses:
   *       200:
   *         description: Token generado
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token: { type: string, example: 3f1c6b8a-... }
   *       401:
   *         description: Credenciales invalidas
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error' }
   *       404:
   *         description: Usuario no encontrado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error' }
   */
  app.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body || {};
      const user = await db.findUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      if (user.password !== password) {
        return res.status(401).json({ error: 'Credenciales invalidas' });
      }
      const token = crypto.randomUUID();
      await db.setToken(user.id, token);
      res.json({ token });
    } catch (err) {
      console.error('[login]', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  /**
   * @openapi
   * /users:
   *   get:
   *     tags: [Users]
   *     summary: Lista los usuarios
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de usuarios
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items: { $ref: '#/components/schemas/User' }
   *       401:
   *         description: Token requerido o invalido
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error' }
   */
  app.get('/users', auth, async (req, res) => {
    try {
      res.json(await db.listUsers());
    } catch (err) {
      console.error('[users]', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  /**
   * @openapi
   * /me:
   *   get:
   *     tags: [Users]
   *     summary: Devuelve el usuario autenticado
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Usuario autenticado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/User' }
   *       401:
   *         description: Token requerido o invalido
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error' }
   */
  app.get('/me', auth, (req, res) => {
    res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
  });

  // OpenAPI crudo (fuente del cliente REST autogenerado de Scalar).
  app.get('/openapi.json', (req, res) => {
    res.json(openapiSpec);
  });

  // Scalar API Reference: documentacion interactiva + cliente REST autogenerado.
  app.use(
    '/docs',
    apiReference({
      url: '/openapi.json',
      theme: 'default',
      metaData: { title: PROJECT_NAME },
    })
  );

  return app;
}

module.exports = createApp;