const { Router } = require("express");

// Raíz de la API: describe el servicio y sus endpoints para quien abra la URL base.
const API_INFO = Object.freeze({
  name: "TaskBoard API",
  version: "1.0.0",
  status: "ok",
  endpoints: [
    { method: "GET", path: "/api/health", description: "Estado del servicio" },
    { method: "GET", path: "/api/tasks", description: "Lista todas las tareas" },
    { method: "POST", path: "/api/tasks", description: "Crea una tarea. Cuerpo: { \"title\": \"...\" }" },
    { method: "PATCH", path: "/api/tasks/:id", description: "Completa o reabre una tarea. Cuerpo: { \"done\": true|false }" },
    { method: "DELETE", path: "/api/tasks/:id", description: "Elimina una tarea" }
  ]
});

function infoRoutes() {
  const router = Router();
  router.get(["/", "/api"], (req, res) => res.json(API_INFO));
  return router;
}

module.exports = { infoRoutes, API_INFO };
