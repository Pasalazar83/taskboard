const express = require("express");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const { asyncHandler: wrap } = require("./middlewares/asyncHandler");
const { errorHandler } = require("./middlewares/errorHandler");
const {
  AppError,
  ValidationError,
  NotFoundError,
} = require("./errors/AppError");
const { validateId } = require("./validators/taskValidator");
const { taskDetails } = require("./validators/taskDetails");
const {
  digest,
  token,
  hashPassword,
  verifyPassword,
} = require("./services/security");
const { enqueue } = require("./services/notifications");
const { createWeatherService } = require("./services/WeatherService");

async function transaction(pool, callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
function credentials(body, needPassword = true) {
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw new ValidationError("Ingresa un correo válido");
  if (needPassword) checkPassword(body?.password);
  return email;
}
function checkPassword(password) {
  if (
    typeof password !== "string" ||
    password.length < 10 ||
    password.length > 128
  )
    throw new ValidationError(
      "La contraseña debe tener entre 10 y 128 caracteres",
    );
}
function createApp({
  pool,
  config = {},
  mailer = { enabled: false },
  logger = console,
  weatherService,
}) {
  const app = express();
  app.set("trust proxy", config.trustProxy || false);
  app.disable("x-powered-by");
  app.use(cors({ origin: config.frontendUrl || "http://localhost:5173" }));
  app.use(express.json({ limit: "64kb" }));
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 240,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { error: "Demasiadas solicitudes. Espera un minuto." },
    }),
  );
  const authLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 40,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Demasiados intentos. Intenta más tarde." },
  });
  const resetLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Espera antes de pedir otro enlace." },
  });
  app.get(["/", "/api"], (req, res) =>
    res.json({ name: "TaskBoard API", version: "2.0.0" }),
  );
  app.get(
    "/api/health",
    wrap(async (req, res) => {
      await pool.query("SELECT 1");
      res.json({ status: "ok" });
    }),
  );
  async function newSession(db, user) {
    const value = token();
    await db.query(
      "INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,$3)",
      [digest(value), user.id, new Date(Date.now() + 7 * 86400000)],
    );
    return {
      token: value,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }
  app.post(
    "/api/auth/register",
    authLimit,
    wrap(async (req, res) => {
      const email = credentials(req.body);
      const name =
        typeof req.body.name === "string" ? req.body.name.trim() : "";
      if (!name || name.length > 80)
        throw new ValidationError("Ingresa un nombre de hasta 80 caracteres");
      const hash = await hashPassword(req.body.password);
      try {
        const result = await transaction(pool, async (db) => {
          const { rows } = await db.query(
            "INSERT INTO users (name,email,password_hash) VALUES ($1,$2,$3) RETURNING id,name,email",
            [name, email, hash],
          );
          return newSession(db, rows[0]);
        });
        res.status(201).json(result);
      } catch (e) {
        if (e.code === "23505")
          throw new AppError(
            "No se pudo crear la cuenta con ese correo. Intenta iniciar sesión.",
            409,
          );
        throw e;
      }
    }),
  );
  // A dummy hash keeps unknown-user login work comparable to a real password check.
  const dummyHash = hashPassword(token());
  app.post(
    "/api/auth/login",
    authLimit,
    wrap(async (req, res) => {
      const email = credentials(req.body);
      const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [
        email,
      ]);
      const user = rows[0];
      const valid = await verifyPassword(
        req.body.password,
        user?.password_hash || (await dummyHash),
      );
      if (!user || !valid)
        throw new AppError("Correo o contraseña incorrectos", 401);
      res.json(await newSession(pool, user));
    }),
  );
  const auth = wrap(async (req, res, next) => {
    const value = req.headers.authorization?.match(
      /^Bearer ([a-f0-9]{64})$/,
    )?.[1];
    if (!value) throw new AppError("Inicia sesión para continuar", 401);
    const { rows } = await pool.query(
      "SELECT u.id,u.name,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at > NOW()",
      [digest(value)],
    );
    if (!rows[0])
      throw new AppError("Tu sesión venció. Inicia sesión nuevamente.", 401);
    req.user = rows[0];
    req.sessionHash = digest(value);
    next();
  });
  app.post(
    "/api/auth/forgot-password",
    resetLimit,
    wrap(async (req, res) => {
      const email = credentials(req.body, false);
      if (!mailer.enabled)
        throw new AppError(
          "La recuperación por correo todavía no está configurada",
          503,
        );
      await transaction(pool, async (db) => {
        const { rows } = await db.query("SELECT id FROM users WHERE email=$1", [
          email,
        ]);
        if (!rows[0]) return;
        const value = token();
        await db.query("DELETE FROM password_resets WHERE user_id=$1", [
          rows[0].id,
        ]);
        await db.query(
          "INSERT INTO password_resets (token_hash,user_id,expires_at) VALUES ($1,$2,$3)",
          [digest(value), rows[0].id, new Date(Date.now() + 30 * 60000)],
        );
        await enqueue(db, {
          key: "reset:" + digest(value),
          recipient: email,
          subject: "Recupera tu acceso a TaskBoard",
          content:
            "Abre este enlace para cambiar tu contraseña. Vence en 30 minutos: " +
            config.frontendUrl +
            "/#reset=" +
            value,
          kind: "reset",
        });
      });
      res.json({
        message:
          "Si el correo está registrado, recibirás un enlace para recuperar tu cuenta.",
      });
    }),
  );
  app.post(
    "/api/auth/reset-password",
    authLimit,
    wrap(async (req, res) => {
      checkPassword(req.body?.password);
      if (
        typeof req.body?.token !== "string" ||
        !/^[a-f0-9]{64}$/.test(req.body.token)
      )
        throw new ValidationError("Enlace inválido");
      const hash = await hashPassword(req.body.password);
      await transaction(pool, async (db) => {
        const { rows } = await db.query(
          "DELETE FROM password_resets WHERE token_hash=$1 AND expires_at > NOW() RETURNING user_id",
          [digest(req.body.token)],
        );
        if (!rows[0])
          throw new ValidationError("El enlace venció o ya fue utilizado");
        await db.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
          hash,
          rows[0].user_id,
        ]);
        await db.query("DELETE FROM sessions WHERE user_id=$1", [
          rows[0].user_id,
        ]);
      });
      res.json({
        message: "Contraseña actualizada. Ya puedes iniciar sesión.",
      });
    }),
  );
  app.get("/api/auth/me", auth, (req, res) => res.json(req.user));
  app.post(
    "/api/auth/logout",
    auth,
    wrap(async (req, res) => {
      await pool.query("DELETE FROM sessions WHERE token_hash=$1", [
        req.sessionHash,
      ]);
      res.status(204).end();
    }),
  );
  app.get("/api/integrations", auth, (req, res) =>
    res.json({ mail: mailer.enabled, weather: !!config.openweatherKey }),
  );
  const weather = weatherService || createWeatherService(config.openweatherKey);
  app.get(
    "/api/weather",
    auth,
    wrap(async (req, res) => {
      const lat = Number(req.query.lat),
        lon = Number(req.query.lon);
      if (
        !req.query.lat ||
        !req.query.lon ||
        !Number.isFinite(lat) ||
        Math.abs(lat) > 90 ||
        !Number.isFinite(lon) ||
        Math.abs(lon) > 180
      )
        throw new ValidationError("Coordenadas inválidas");
      res.json(await weather(lat, lon));
    }),
  );
  app.get(
    "/api/tasks",
    auth,
    wrap(async (req, res) => {
      const { rows } = await pool.query(
        "SELECT * FROM tasks WHERE user_id=$1 ORDER BY id DESC",
        [req.user.id],
      );
      res.json(rows);
    }),
  );
  app.post(
    "/api/tasks",
    auth,
    wrap(async (req, res) => {
      const t = taskDetails(req.body);
      const task = await transaction(pool, async (db) => {
        const { rows } = await db.query(
          "INSERT INTO tasks (user_id,title,description,status,done,priority,due_at,reminder_minutes,location) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
          [
            req.user.id,
            t.title,
            t.description,
            t.status,
            t.status === "done",
            t.priority,
            t.due_at,
            t.reminder_minutes,
            t.location ? JSON.stringify(t.location) : null,
          ],
        );
        if (mailer.enabled)
          await enqueue(db, {
            key: "created:" + rows[0].id,
            recipient: req.user.email,
            subject: "Tarea creada: " + t.title,
            content:
              "Hola " +
              req.user.name +
              ",\n\nAgregaste «" +
              t.title +
              "» a tu tablero.\n" +
              config.frontendUrl,
            taskId: rows[0].id,
          });
        return rows[0];
      });
      res
        .status(201)
        .json({
          ...task,
          notification: mailer.enabled ? "queued" : "not_configured",
        });
    }),
  );
  app.patch(
    "/api/tasks/:id",
    auth,
    wrap(async (req, res) => {
      const id = validateId(req.params.id);
      const task = await transaction(pool, async (db) => {
        const { rows } = await db.query(
          "SELECT * FROM tasks WHERE id=$1 AND user_id=$2 FOR UPDATE",
          [id, req.user.id],
        );
        if (!rows[0]) throw new NotFoundError();
        const body = { ...req.body };
        if (body.done !== undefined) {
          if (typeof body.done !== "boolean")
            throw new ValidationError("done debe ser booleano");
          if (body.status === undefined)
            body.status = body.done ? "done" : "pending";
        }
        const t = taskDetails(body, rows[0]);
        const result = await db.query(
          "UPDATE tasks SET title=$1,description=$2,status=$3,done=$4,priority=$5,due_at=$6,reminder_minutes=$7,location=$8,updated_at=NOW() WHERE id=$9 AND user_id=$10 RETURNING *",
          [
            t.title,
            t.description,
            t.status,
            t.status === "done",
            t.priority,
            t.due_at,
            t.reminder_minutes,
            t.location ? JSON.stringify(t.location) : null,
            id,
            req.user.id,
          ],
        );
        await db.query(
          "DELETE FROM mail_outbox WHERE task_id=$1 AND kind='reminder' AND status <> 'sent'",
          [id],
        );
        return result.rows[0];
      });
      res.json(task);
    }),
  );
  app.delete(
    "/api/tasks/:id",
    auth,
    wrap(async (req, res) => {
      const { rowCount } = await pool.query(
        "DELETE FROM tasks WHERE id=$1 AND user_id=$2",
        [validateId(req.params.id), req.user.id],
      );
      if (!rowCount) throw new NotFoundError();
      res.status(204).end();
    }),
  );
  app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));
  app.use(errorHandler(logger));
  return app;
}
module.exports = { createApp };
