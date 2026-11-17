const { Router } = require("express");
const { asyncHandler } = require("../middlewares/asyncHandler");

function systemRoutes(controller) {
  const router = Router();
  router.get(["/", "/api"], controller.info);
  router.get("/api/health", asyncHandler(controller.health));
  return router;
}

module.exports = { systemRoutes };
