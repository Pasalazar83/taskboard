const { NotFoundError, ValidationError } = require("../errors/AppError");
const { transaction } = require("../db/transaction");
const { validateId } = require("../validators/taskValidator");
const { taskDetails } = require("../validators/taskDetails");

/**
 * Reglas de negocio de las tareas. No conoce HTTP ni SQL:
 * usa los repositorios que recibe en el constructor (inversión de dependencias).
 */
class TaskService {
  constructor({ pool, tasks, outbox, mailer, frontendUrl }) {
    Object.assign(this, { pool, tasks, outbox, mailer, frontendUrl });
  }

  list(user) {
    return this.tasks.listByUser(user.id);
  }

  // Crea la tarea y, si el correo está configurado, encola el aviso en la misma transacción.
  async create(user, body) {
    const details = taskDetails(body);
    const task = await transaction(this.pool, async (db) => {
      const created = await this.tasks.create(user.id, details, db);
      if (this.mailer.enabled)
        await this.outbox.enqueue({
          key: "created:" + created.id,
          recipient: user.email,
          subject: "Tarea creada: " + details.title,
          content: "Hola " + user.name + ",\n\nAgregaste «" + details.title + "» a tu tablero.\n" + this.frontendUrl,
          taskId: created.id,
        }, db);
      return created;
    });
    return { ...task, notification: this.mailer.enabled ? "queued" : "not_configured" };
  }

  // Edición parcial: combina los cambios con la tarea actual y reprograma recordatorios.
  async update(user, rawId, body) {
    const id = validateId(rawId);
    return transaction(this.pool, async (db) => {
      const current = await this.tasks.findForUpdate(id, user.id, db);
      if (!current) throw new NotFoundError();
      const changes = { ...body };
      if (changes.done !== undefined) {
        if (typeof changes.done !== "boolean") throw new ValidationError("done debe ser booleano");
        if (changes.status === undefined) changes.status = changes.done ? "done" : "pending";
      }
      const updated = await this.tasks.update(id, user.id, taskDetails(changes, current), db);
      await this.outbox.clearPendingReminders(id, db);
      return updated;
    });
  }

  async remove(user, rawId) {
    const deleted = await this.tasks.delete(validateId(rawId), user.id);
    if (!deleted) throw new NotFoundError();
  }
}

module.exports = { TaskService };
