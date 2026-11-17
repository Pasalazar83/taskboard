const config = require("./src/config/env");
const { createPool } = require("./src/db/pool");
const { migrate } = require("./src/db/migrate");
const { createApp } = require("./src/app");
const { ZohoMailer } = require("./src/services/ZohoMailer");
const { createNotificationWorker } = require("./src/services/notifications");
async function main() {
  if (!config.databaseUrl) throw new Error("Configura DATABASE_URL");
  const pool = createPool(config);
  pool.on("error", () => console.error("Error de conexión con PostgreSQL"));
  await migrate(pool);
  const mailer = new ZohoMailer(config);
  const tick = createNotificationWorker(pool, mailer);
  const timer = setInterval(tick, config.reminderInterval);
  timer.unref();
  const server = createApp({ pool, config, mailer }).listen(config.port, () =>
    console.log("TaskBoard API en puerto " + config.port),
  );
  void tick();
  const close = () => {
    clearInterval(timer);
    server.close(() => pool.end());
  };
  process.on("SIGTERM", close);
  process.on("SIGINT", close);
}
main().catch((err) => {
  console.error("No se pudo iniciar TaskBoard:", err.message);
  process.exit(1);
});
