const fs = require("node:fs/promises");
const path = require("node:path");
async function migrate(pool) {
  await pool.query(
    await fs.readFile(path.join(__dirname, "schema-v2.sql"), "utf8"),
  );
}
module.exports = { migrate };
