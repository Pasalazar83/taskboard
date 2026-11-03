const { ValidationError } = require("../errors/AppError");

// Única responsabilidad: validar y normalizar la entrada. No sabe de HTTP ni de SQL.
const MAX_TITLE_LENGTH = 200;

function validateTitle(value) {
  const title = typeof value === "string" ? value.trim() : "";
  if (!title) throw new ValidationError("El título es obligatorio");
  if (title.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(`El título no puede superar ${MAX_TITLE_LENGTH} caracteres`);
  }
  return title;
}

function validateId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("El id debe ser un entero positivo");
  }
  return id;
}

function validateDone(value) {
  if (value !== undefined && typeof value !== "boolean") {
    throw new ValidationError("El campo 'done' debe ser booleano");
  }
  return value;
}

module.exports = { validateTitle, validateId, validateDone, MAX_TITLE_LENGTH };
