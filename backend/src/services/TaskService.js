const { NotFoundError } = require("../errors/AppError");
const { validateTitle, validateId, validateDone } = require("../validators/taskValidator");

/**
 * Reglas de negocio de las tareas. Depende de una abstracción (el contrato del
 * repositorio), no de PostgreSQL: el repositorio se inyecta en el constructor.
 */
class TaskService {
  constructor(taskRepository) {
    this.repo = taskRepository;
  }

  listTasks() {
    return this.repo.findAll();
  }

  createTask(rawTitle) {
    return this.repo.create(validateTitle(rawTitle));
  }

  // Si "done" viene definido lo asigna; si no, alterna el estado actual.
  async updateTaskStatus(rawId, rawDone) {
    const id = validateId(rawId);
    const done = validateDone(rawDone);
    const task = done === undefined
      ? await this.repo.toggleDone(id)
      : await this.repo.setDone(id, done);
    if (!task) throw new NotFoundError("Tarea no encontrada");
    return task;
  }

  async deleteTask(rawId) {
    const id = validateId(rawId);
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new NotFoundError("Tarea no encontrada");
  }
}

module.exports = { TaskService };
