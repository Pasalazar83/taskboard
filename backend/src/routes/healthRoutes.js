const { Router } = require("express");

function healthRoutes() {
  const router = Router();
  router.get("/", (req, res) => res.json({ status: "ok" }));
  return router;
}

module.exports = { healthRoutes };
