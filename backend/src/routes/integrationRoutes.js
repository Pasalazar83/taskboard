const { Router } = require("express");
const { asyncHandler } = require("../middlewares/asyncHandler");

// Rutas de servicios externos. Se montan en /api y requieren sesión.
function integrationRoutes(controller, requireAuth) {
  const router = Router();
  router.get("/integrations", requireAuth, controller.status);
  router.get("/weather", requireAuth, asyncHandler(controller.weatherNow));
  return router;
}

module.exports = { integrationRoutes };
