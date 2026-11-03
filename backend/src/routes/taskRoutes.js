const { Router } = require("express");
const { asyncHandler } = require("../middlewares/asyncHandler");

// Solo define rutas y las conecta con el controlador recibido.
function taskRoutes(controller) {
  const router = Router();
  router.get("/", asyncHandler(controller.list));
  router.post("/", asyncHandler(controller.create));
  router.patch("/:id", asyncHandler(controller.updateStatus));
  router.delete("/:id", asyncHandler(controller.remove));
  return router;
}

module.exports = { taskRoutes };
