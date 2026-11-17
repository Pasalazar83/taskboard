/**
 * Acceso a datos de tareas. Todas las consultas filtran por `user_id`,
 * así un usuario nunca puede leer ni modificar tareas ajenas.
 * Consultas parametrizadas ($1, $2...) para prevenir inyección SQL.
 */
const toRow = (t) => [
  t.title,
  t.description,
  t.status,
  t.status === "done",
  t.priority,
  t.due_at,
  t.reminder_minutes,
  t.location ? JSON.stringify(t.location) : null,
];

class TaskRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async listByUser(userId) {
    const { rows } = await this.pool.query(
      "SELECT * FROM tasks WHERE user_id=$1 ORDER BY id DESC",
      [userId],
    );
    return rows;
  }

  async create(userId, task, db = this.pool) {
    const { rows } = await db.query(
      "INSERT INTO tasks (title,description,status,done,priority,due_at,reminder_minutes,location,user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
      [...toRow(task), userId],
    );
    return rows[0];
  }

  // Bloquea la fila durante la transacción para evitar ediciones simultáneas.
  async findForUpdate(id, userId, db) {
    const { rows } = await db.query(
      "SELECT * FROM tasks WHERE id=$1 AND user_id=$2 FOR UPDATE",
      [id, userId],
    );
    return rows[0] || null;
  }

  async update(id, userId, task, db = this.pool) {
    const { rows } = await db.query(
      "UPDATE tasks SET title=$1,description=$2,status=$3,done=$4,priority=$5,due_at=$6,reminder_minutes=$7,location=$8,updated_at=NOW() WHERE id=$9 AND user_id=$10 RETURNING *",
      [...toRow(task), id, userId],
    );
    return rows[0];
  }

  async delete(id, userId) {
    const { rowCount } = await this.pool.query(
      "DELETE FROM tasks WHERE id=$1 AND user_id=$2",
      [id, userId],
    );
    return rowCount > 0;
  }
}

module.exports = { TaskRepository };
