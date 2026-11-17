// Rutas de sistema: información de la API y verificación de estado.
const API_INFO = Object.freeze({
  name: "TaskBoard API",
  version: "2.0.0",
  status: "ok",
  endpoints: [
    { method: "GET", path: "/api/health", description: "Estado del servicio y de la base de datos" },
    { method: "POST", path: "/api/auth/register", description: "Crea una cuenta" },
    { method: "POST", path: "/api/auth/login", description: "Inicia sesión" },
    { method: "GET", path: "/api/tasks", description: "Lista las tareas del usuario (requiere sesión)" },
    { method: "POST", path: "/api/tasks", description: "Crea una tarea (requiere sesión)" },
    { method: "PATCH", path: "/api/tasks/:id", description: "Modifica o completa una tarea (requiere sesión)" },
    { method: "DELETE", path: "/api/tasks/:id", description: "Elimina una tarea (requiere sesión)" }
  ]
});

class SystemController {
  constructor(pool) {
    this.pool = pool;
  }

  info = (req, res) => res.json(API_INFO);

  // Además de responder, comprueba que la base de datos esté disponible.
  health = async (req, res) => {
    await this.pool.query("SELECT 1");
    res.json({ status: "ok" });
  };
}

module.exports = { SystemController, API_INFO };
