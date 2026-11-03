/**
 * Implementación en memoria con el MISMO contrato que PostgresTaskRepository.
 * Se usa en las pruebas automáticas: el servicio funciona igual con cualquiera
 * de las dos (sustitución de Liskov + inversión de dependencias).
 */
class InMemoryTaskRepository {
  constructor() {
    this.tasks = [];
    this.nextId = 1;
  }

  async findAll() {
    return [...this.tasks].sort((a, b) => a.id - b.id);
  }

  async create(title) {
    const task = { id: this.nextId++, title, done: false, created_at: new Date().toISOString() };
    this.tasks.push(task);
    return task;
  }

  async setDone(id, done) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;
    task.done = done;
    return task;
  }

  async toggleDone(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;
    task.done = !task.done;
    return task;
  }

  async delete(id) {
    const before = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== id);
    return this.tasks.length < before;
  }
}

module.exports = { InMemoryTaskRepository };
