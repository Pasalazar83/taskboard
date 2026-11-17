const { Router } = require("express");
const { asyncHandler } = require("../middlewares/asyncHandler");

// Rutas de tareas. Se montan en /api/tasks y todas requieren sesión.
function taskRoutes(controller, requireAuth) {
  const router = Router();
  router.use(requireAuth);
  router.get("/", asyncHandler(controller.list));
  router.post("/", asyncHandler(controller.create));
  router.patch("/:id", asyncHandler(controller.update));
  router.delete("/:id", asyncHandler(controller.remove));
  return router;
}

module.exports = { taskRoutes };
