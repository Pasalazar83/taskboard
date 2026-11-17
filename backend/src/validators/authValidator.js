const { ValidationError } = require("../errors/AppError");

// Validación de datos de cuenta. No sabe de HTTP ni de SQL.
function validateEmail(value) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw new ValidationError("Ingresa un correo válido");
  return email;
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 10 || password.length > 128)
    throw new ValidationError("La contraseña debe tener entre 10 y 128 caracteres");
  return password;
}

function validateName(value) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name || name.length > 80)
    throw new ValidationError("Ingresa un nombre de hasta 80 caracteres");
  return name;
}

function validateResetToken(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value))
    throw new ValidationError("Enlace inválido");
  return value;
}

module.exports = { validateEmail, validatePassword, validateName, validateResetToken };
