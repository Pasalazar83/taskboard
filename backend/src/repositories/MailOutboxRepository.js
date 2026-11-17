// Acceso a datos de la cola de correos pendientes (patrón outbox).
class MailOutboxRepository {
  constructor(pool) {
    this.pool = pool;
  }

  // Si la clave ya existe no se duplica el correo.
  async enqueue({ key, recipient, subject, content, taskId = null, kind = "created" }, db = this.pool) {
    await db.query(
      "INSERT INTO mail_outbox (dedupe_key,recipient,subject,content,task_id,kind) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (dedupe_key) DO NOTHING",
      [key, recipient, subject, content, taskId, kind],
    );
  }

  // Al editar una tarea se descartan los recordatorios aún no enviados.
  async clearPendingReminders(taskId, db = this.pool) {
    await db.query(
      "DELETE FROM mail_outbox WHERE task_id=$1 AND kind='reminder' AND status <> 'sent'",
      [taskId],
    );
  }
}

module.exports = { MailOutboxRepository };
