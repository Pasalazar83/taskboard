const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(express.json());

// CORS: en producción solo se permite el Static Site (FRONTEND_URL, sin barra final)
const FRONTEND_URL = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
app.use(cors({ origin: FRONTEND_URL || "*" }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
});

// Envuelve handlers async para enviar los errores al middleware central
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Valida que :id sea un entero positivo
const parseId = (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "El id debe ser un entero positivo" });
    return null;
  }
  return id;
};

// ---------- Endpoints ----------

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.get("/api/tasks", asyncHandler(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM tasks ORDER BY id");
  res.json(rows);
}));

app.post("/api/tasks", asyncHandler(async (req, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  if (!title) return res.status(400).json({ error: "El título es obligatorio" });
  if (title.length > 200) {
    return res.status(400).json({ error: "El título no puede superar 200 caracteres" });
  }
  const { rows } = await pool.query(
    "INSERT INTO tasks (title) VALUES ($1) RETURNING *", [title]);
  res.status(201).json(rows[0]);
}));

// PATCH: body { "done": true|false }. Si no se envía "done", alterna el estado.
app.patch("/api/tasks/:id", asyncHandler(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  const { done } = req.body || {};
  if (done !== undefined && typeof done !== "boolean") {
    return res.status(400).json({ error: "El campo 'done' debe ser booleano" });
  }

  const { rows } = done === undefined
    ? await pool.query("UPDATE tasks SET done = NOT done WHERE id = $1 RETURNING *", [id])
    : await pool.query("UPDATE tasks SET done = $1 WHERE id = $2 RETURNING *", [done, id]);

  if (rows.length === 0) return res.status(404).json({ error: "Tarea no encontrada" });
  res.json(rows[0]);
}));

app.delete("/api/tasks/:id", asyncHandler(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  const { rowCount } = await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
  if (rowCount === 0) return res.status(404).json({ error: "Tarea no encontrada" });
  res.status(204).end();
}));

// ---------- Manejo de errores ----------

app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON inválido" });
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

// ---------- Arranque ----------

const PORT = process.env.PORT || 3000;

// Crea la tabla si no existe (idempotente), luego levanta el servidor
pool.query(`
  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    done BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  )
`)
  .then(() => app.listen(PORT, () => console.log(`API escuchando en el puerto ${PORT}`)))
  .catch((err) => {
    console.error("No se pudo conectar a la base de datos:", err.message);
    process.exit(1);
  });
