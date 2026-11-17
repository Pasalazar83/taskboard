// Cabeceras de seguridad: no guardar respuestas en caché ni adivinar el tipo de contenido.
function securityHeaders(req, res, next) {
  res.set("Cache-Control", "no-store");
  res.set("X-Content-Type-Options", "nosniff");
  next();
}

module.exports = { securityHeaders };
