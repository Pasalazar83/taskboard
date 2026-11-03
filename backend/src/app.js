const express = require("express");
const cors = require("cors");
const { TaskService } = require("./services/TaskService");
const { TaskController } = require("./controllers/TaskController");
const { taskRoutes } = require("./routes/taskRoutes");
const { healthRoutes } = require("./routes/healthRoutes");
const { infoRoutes } = require("./routes/infoRoutes");
const { notFound } = require("./middlewares/notFound");
const { errorHandler } = require("./middlewares/errorHandler");

/**
 * Construye la aplicación Express a partir de sus dependencias.
 * Recibe el repositorio desde afuera, así que funciona igual con PostgreSQL
 * (producción) o en memoria (pruebas).
 */
function createApp({ taskRepository, frontendUrl = "", logger = console }) {
  const service = new TaskService(taskRepository);
  const controller = new TaskController(service);

  const app = express();
  app.use(express.json());
  // CORS: solo se permite el frontend; sin FRONTEND_URL se permite cualquier origen (desarrollo)
  app.use(cors({ origin: frontendUrl || "*" }));

  app.use(infoRoutes());
  app.use("/api/health", healthRoutes());
  app.use("/api/tasks", taskRoutes(controller));

  app.use(notFound);
  app.use(errorHandler(logger));
  return app;
}

module.exports = { createApp };
