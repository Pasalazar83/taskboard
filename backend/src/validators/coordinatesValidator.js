const { ValidationError } = require("../errors/AppError");

// Valida latitud (-90 a 90) y longitud (-180 a 180).
function validateCoordinates(query) {
  const lat = Number(query.lat);
  const lon = Number(query.lon);
  if (
    !query.lat || !query.lon ||
    !Number.isFinite(lat) || Math.abs(lat) > 90 ||
    !Number.isFinite(lon) || Math.abs(lon) > 180
  )
    throw new ValidationError("Coordenadas inválidas");
  return { lat, lon };
}

module.exports = { validateCoordinates };
