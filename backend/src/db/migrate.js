// Crea la tabla si no existe (idempotente).
const CREATE_TASKS_TABLE = `
  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    done BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  )
`;

async function migrate(pool) {
  await pool.query(CREATE_TASKS_TABLE);
}

module.exports = { migrate };
