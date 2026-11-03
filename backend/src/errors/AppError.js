// Jerarquía de errores de dominio. El manejador central trata cualquier AppError
// por igual (Liskov) y se pueden agregar nuevos tipos sin modificarlo (abierto/cerrado).
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

class ValidationError extends AppError {
  constructor(message) { super(message, 400); }
}

class NotFoundError extends AppError {
  constructor(message = "Recurso no encontrado") { super(message, 404); }
}

module.exports = { AppError, ValidationError, NotFoundError };
