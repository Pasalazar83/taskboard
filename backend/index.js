// Punto de entrada (composition root): aquí se crean y conectan todas las piezas.
const config = require("./src/config/env");
const { createPool } = require("./src/db/pool");
const { migrate } = require("./src/db/migrate");
const { PostgresTaskRepository } = require("./src/repositories/PostgresTaskRepository");
const { createApp } = require("./src/app");

async function main() {
  const pool = createPool(config);
  await migrate(pool);

  const app = createApp({
    taskRepository: new PostgresTaskRepository(pool),
    frontendUrl: config.frontendUrl
  });

  app.listen(config.port, () => console.log(`API escuchando en el puerto ${config.port}`));
}

main().catch((err) => {
  console.error("No se pudo conectar a la base de datos:", err.message);
  process.exit(1);
});
