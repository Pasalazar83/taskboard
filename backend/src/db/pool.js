const { Pool } = require("pg");

// Fábrica de la conexión: quien la necesite la recibe ya construida (inyección).
function createPool({ databaseUrl, dbSsl }) {
  return new Pool({
    connectionString: databaseUrl,
    ssl: dbSsl ? { rejectUnauthorized: false } : false
  });
}

module.exports = { createPool };
