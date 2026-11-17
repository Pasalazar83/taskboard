async function enqueue(
  db,
  { key, recipient, subject, content, taskId = null, kind = "created" },
) {
  await db.query(
    "INSERT INTO mail_outbox (dedupe_key,recipient,subject,content,task_id,kind) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (dedupe_key) DO NOTHING",
    [key, recipient, subject, content, taskId, kind],
  );
}
function createNotificationWorker(pool, mailer, logger = console) {
  let busy = false;
  return async function tick() {
    if (busy || !mailer.enabled) return;
    busy = true;
    try {
      const { rows: tasks } = await pool.query(
        "SELECT t.*, u.email FROM tasks t JOIN users u ON u.id=t.user_id WHERE t.status <> 'done' AND t.due_at IS NOT NULL",
      );
      for (const task of tasks) {
        const due = new Date(task.due_at);
        if (due.getTime() - task.reminder_minutes * 60000 <= Date.now()) {
          await enqueue(pool, {
            key: "reminder:" + task.id + ":" + due.toISOString(),
            recipient: task.email,
            subject: "Recordatorio: " + task.title,
            content:
              "Tu tarea «" +
              task.title +
              "» vence el " +
              due.toLocaleString("es-CO", { timeZone: "America/Bogota" }) +
              " (hora de Colombia).",
            taskId: task.id,
            kind: "reminder",
          });
        }
      }
      const { rows } = await pool.query(
        "SELECT * FROM mail_outbox WHERE status <> 'sent' AND attempts < 5 AND available_at <= NOW() ORDER BY id LIMIT 20",
      );
      for (const mail of rows) {
        const claimed = await pool.query(
          "UPDATE mail_outbox SET status='sending', attempts=attempts+1, available_at=$2 WHERE id=$1 AND status <> 'sent' AND available_at <= NOW() RETURNING id",
          [mail.id, new Date(Date.now() + 120000)],
        );
        if (!claimed.rowCount) continue;
        try {
          await mailer.send(mail);
          await pool.query(
            "UPDATE mail_outbox SET status='sent', sent_at=NOW(), content='' WHERE id=$1",
            [mail.id],
          );
        } catch {
          logger.error("No se pudo enviar una notificación; se reintentará.");
          await pool.query(
            "UPDATE mail_outbox SET status='pending',available_at=$2 WHERE id=$1",
            [
              mail.id,
              new Date(Date.now() + 60000 * Math.min(5, mail.attempts + 1)),
            ],
          );
        }
      }
      await pool.query("DELETE FROM sessions WHERE expires_at <= NOW()");
      await pool.query("DELETE FROM password_resets WHERE expires_at <= NOW()");
    } catch {
      logger.error("No se pudo procesar la cola de notificaciones");
    } finally {
      busy = false;
    }
  };
}
module.exports = { enqueue, createNotificationWorker };
