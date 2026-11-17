const { AppError, ValidationError } = require("../errors/AppError");
const { digest, token, hashPassword, verifyPassword } = require("./security");
const { transaction } = require("../db/transaction");
const {
  validateEmail, validatePassword, validateName, validateResetToken,
} = require("../validators/authValidator");

const SESSION_DAYS = 7;
const RESET_MINUTES = 30;

/**
 * Reglas de negocio de las cuentas: registro, inicio y cierre de sesión,
 * y recuperación de contraseña. Recibe sus dependencias por constructor.
 */
class AuthService {
  constructor({ pool, users, sessions, resets, outbox, mailer, frontendUrl }) {
    Object.assign(this, { pool, users, sessions, resets, outbox, mailer, frontendUrl });
    // Hash ficticio: el login con un correo inexistente tarda lo mismo que uno real,
    // así no se puede averiguar qué correos están registrados.
    this.dummyHash = hashPassword(token());
  }

  async createSession(user, db) {
    const value = token();
    await this.sessions.create(digest(value), user.id, new Date(Date.now() + SESSION_DAYS * 86400000), db);
    return { token: value, user: { id: user.id, name: user.name, email: user.email } };
  }

  async register(body) {
    const email = validateEmail(body?.email);
    validatePassword(body?.password);
    const name = validateName(body?.name);
    const passwordHash = await hashPassword(body.password);
    try {
      return await transaction(this.pool, async (db) => {
        const user = await this.users.create({ name, email, passwordHash }, db);
        if (this.mailer.enabled)
          await this.outbox.enqueue({
            key: "welcome:" + user.id,
            recipient: email,
            subject: "Bienvenido a TaskBoard",
            content:
              "Hola " + name + ",\n\nTu cuenta en TaskBoard fue creada con este correo. " +
              "Ya puedes organizar tus tareas en " + this.frontendUrl + "\n\n" +
              "Si no creaste esta cuenta, ignora este mensaje.",
            kind: "welcome",
          }, db);
        return this.createSession(user, db);
      });
    } catch (e) {
      if (e.code === "23505")
        throw new AppError("No se pudo crear la cuenta con ese correo. Intenta iniciar sesión.", 409);
      throw e;
    }
  }

  async login(body) {
    const email = validateEmail(body?.email);
    validatePassword(body?.password);
    const user = await this.users.findByEmail(email);
    const valid = await verifyPassword(body.password, user?.password_hash || (await this.dummyHash));
    if (!user || !valid) throw new AppError("Correo o contraseña incorrectos", 401);
    return this.createSession(user);
  }

  // Devuelve el usuario dueño de un token de sesión válido.
  async authenticate(authorizationHeader) {
    const value = authorizationHeader?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if (!value) throw new AppError("Inicia sesión para continuar", 401);
    const sessionHash = digest(value);
    const user = await this.sessions.findActiveUser(sessionHash);
    if (!user) throw new AppError("Tu sesión venció. Inicia sesión nuevamente.", 401);
    return { user, sessionHash };
  }

  logout(sessionHash) {
    return this.sessions.delete(sessionHash);
  }

  // Responde igual exista o no el correo, para no revelar cuentas registradas.
  async forgotPassword(body) {
    const email = validateEmail(body?.email);
    if (!this.mailer.enabled)
      throw new AppError("La recuperación por correo todavía no está configurada", 503);
    await transaction(this.pool, async (db) => {
      const user = await this.users.findByEmail(email, db);
      if (!user) return;
      const value = token();
      await this.resets.replaceForUser(user.id, digest(value), new Date(Date.now() + RESET_MINUTES * 60000), db);
      await this.outbox.enqueue({
        key: "reset:" + digest(value),
        recipient: email,
        subject: "Recupera tu acceso a TaskBoard",
        content:
          "Abre este enlace para cambiar tu contraseña. Vence en 30 minutos: " +
          this.frontendUrl + "/#reset=" + value,
        kind: "reset",
      }, db);
    });
    return { message: "Si el correo está registrado, recibirás un enlace para recuperar tu cuenta." };
  }

  // Cambia la contraseña y cierra todas las sesiones abiertas de ese usuario.
  async resetPassword(body) {
    validatePassword(body?.password);
    const resetToken = validateResetToken(body?.token);
    const passwordHash = await hashPassword(body.password);
    await transaction(this.pool, async (db) => {
      const userId = await this.resets.consume(digest(resetToken), db);
      if (!userId) throw new ValidationError("El enlace venció o ya fue utilizado");
      await this.users.updatePassword(userId, passwordHash, db);
      await this.sessions.deleteByUser(userId, db);
    });
    return { message: "Contraseña actualizada. Ya puedes iniciar sesión." };
  }
}

module.exports = { AuthService };
