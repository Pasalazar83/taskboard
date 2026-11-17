const { Router } = require("express");
const { asyncHandler } = require("../middlewares/asyncHandler");
const { authLimit, resetLimit } = require("../middlewares/rateLimits");

// Rutas de cuentas. Se montan en /api/auth.
function authRoutes(controller, requireAuth) {
  const router = Router();
  const attempts = authLimit();
  router.post("/register", attempts, asyncHandler(controller.register));
  router.post("/login", attempts, asyncHandler(controller.login));
  router.post("/forgot-password", resetLimit(), asyncHandler(controller.forgotPassword));
  router.post("/reset-password", attempts, asyncHandler(controller.resetPassword));
  router.get("/me", requireAuth, controller.me);
  router.post("/logout", requireAuth, asyncHandler(controller.logout));
  return router;
}

module.exports = { authRoutes };
