const { AppError } = require("../errors/AppError");

// Punto único de manejo de errores. Nunca expone detalles internos al cliente.
function errorHandler(logger = console) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    if (err.type === "entity.parse.failed") {
      return res.status(400).json({ error: "JSON inválido" });
    }
    logger.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  };
}

module.exports = { errorHandler };
