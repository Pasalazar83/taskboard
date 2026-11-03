/**
 * Contrato del repositorio de tareas (lo que el servicio necesita):
 *   findAll()               -> Promise<Task[]>
 *   create(title)           -> Promise<Task>
 *   setDone(id, done)       -> Promise<Task | null>
 *   toggleDone(id)          -> Promise<Task | null>
 *   delete(id)              -> Promise<boolean>
 *
 * Única responsabilidad: acceso a datos en PostgreSQL. Todas las consultas son
 * parametrizadas para prevenir inyección SQL.
 */
class PostgresTaskRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findAll() {
    const { rows } = await this.pool.query("SELECT * FROM tasks ORDER BY id");
    return rows;
  }

  async create(title) {
    const { rows } = await this.pool.query(
      "INSERT INTO tasks (title) VALUES ($1) RETURNING *", [title]);
    return rows[0];
  }

  async setDone(id, done) {
    const { rows } = await this.pool.query(
      "UPDATE tasks SET done = $1 WHERE id = $2 RETURNING *", [done, id]);
    return rows[0] || null;
  }

  async toggleDone(id) {
    const { rows } = await this.pool.query(
      "UPDATE tasks SET done = NOT done WHERE id = $1 RETURNING *", [id]);
    return rows[0] || null;
  }

  async delete(id) {
    const { rowCount } = await this.pool.query("DELETE FROM tasks WHERE id = $1", [id]);
    return rowCount > 0;
  }
}

module.exports = { PostgresTaskRepository };
