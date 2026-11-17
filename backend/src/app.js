const express = require("express");
const cors = require("cors");
const { securityHeaders } = require("./middlewares/securityHeaders");
const { apiLimit } = require("./middlewares/rateLimits");
const { requireAuth } = require("./middlewares/requireAuth");
const { notFound } = require("./middlewares/notFound");
const { errorHandler } = require("./middlewares/errorHandler");
const { UserRepository } = require("./repositories/UserRepository");
const { SessionRepository } = require("./repositories/SessionRepository");
const { PasswordResetRepository } = require("./repositories/PasswordResetRepository");
const { TaskRepository } = require("./repositories/TaskRepository");
const { MailOutboxRepository } = require("./repositories/MailOutboxRepository");
const { AuthService } = require("./services/AuthService");
const { TaskService } = require("./services/TaskService");
const { createWeatherService } = require("./services/WeatherService");
const { AuthController } = require("./controllers/AuthController");
const { TaskController } = require("./controllers/TaskController");
const { IntegrationController } = require("./controllers/IntegrationController");
const { SystemController } = require("./controllers/SystemController");
const { systemRoutes } = require("./routes/systemRoutes");
const { authRoutes } = require("./routes/authRoutes");
const { taskRoutes } = require("./routes/taskRoutes");
const { integrationRoutes } = require("./routes/integrationRoutes");

/**
 * Construye la aplicación conectando las capas:
 * repositorios (datos) → servicios (reglas) → controladores (HTTP) → rutas.
 * Recibe la base, el correo y el clima desde afuera, así las pruebas pueden
 * reemplazarlos por versiones simuladas (inversión de dependencias).
 */
function createApp({ pool, config = {}, mailer = { enabled: false }, logger = console, weatherService }) {
  const frontendUrl = config.frontendUrl || "http://localhost:5173";

  // Modelo: repositorios y servicios
  const users = new UserRepository(pool);
  const sessions = new SessionRepository(pool);
  const resets = new PasswordResetRepository(pool);
  const tasks = new TaskRepository(pool);
  const outbox = new MailOutboxRepository(pool);
  const authService = new AuthService({ pool, users, sessions, resets, outbox, mailer, frontendUrl });
  const taskService = new TaskService({ pool, tasks, outbox, mailer, frontendUrl });
  const weather = weatherService || createWeatherService(config.openweatherKey);

  // Controladores
  const auth = requireAuth(authService);
  const authController = new AuthController(authService);
  const taskController = new TaskController(taskService);
  const integrationController = new IntegrationController({ weather, mailer, weatherEnabled: !!config.openweatherKey });
  const systemController = new SystemController(pool);

  const app = express();
  app.set("trust proxy", config.trustProxy || false);
  app.disable("x-powered-by");
  app.use(cors({ origin: frontendUrl }));
  app.use(express.json({ limit: "64kb" }));
  app.use(securityHeaders);
  app.use("/api", apiLimit());

  app.use(systemRoutes(systemController));
  app.use("/api/auth", authRoutes(authController, auth));
  app.use("/api/tasks", taskRoutes(taskController, auth));
  app.use("/api", integrationRoutes(integrationController, auth));

  app.use(notFound);
  app.use(errorHandler(logger));
  return app;
}

module.exports = { createApp };
