const db = require('./db');
const createApp = require('./server');

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  await db.init();
  const app = createApp(db);
  app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Error al iniciar:', err);
  process.exit(1);
});
