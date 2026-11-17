const { rateLimit } = require("express-rate-limit");

// Límite de peticiones por IP (OWASP: protección contra fuerza bruta y abuso).
const limiter = (windowMs, limit, error) =>
  rateLimit({ windowMs, limit, standardHeaders: "draft-7", legacyHeaders: false, message: { error } });

const apiLimit = () => limiter(60000, 240, "Demasiadas solicitudes. Espera un minuto.");
const authLimit = () => limiter(15 * 60000, 40, "Demasiados intentos. Intenta más tarde.");
const resetLimit = () => limiter(15 * 60000, 5, "Espera antes de pedir otro enlace.");

module.exports = { apiLimit, authLimit, resetLimit };
