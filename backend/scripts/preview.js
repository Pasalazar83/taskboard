// Local preview only: ephemeral database, no external email is sent.
const { newDb } = require("pg-mem");
const { migrate } = require("../src/db/migrate");
const { createApp } = require("../src/app");
(async () => {
  const pg = newDb().adapters.createPg();
  const pool = new pg.Pool();
  await migrate(pool);
  createApp({ pool, config: { frontendUrl: "http://127.0.0.1:5173" } }).listen(
    3000,
    "127.0.0.1",
    () => console.log("API de prueba local http://127.0.0.1:3000"),
  );
})();
