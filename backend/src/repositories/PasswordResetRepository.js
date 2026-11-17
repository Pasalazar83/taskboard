// Acceso a datos de los enlaces de recuperación de contraseña (de un solo uso).
class PasswordResetRepository {
  constructor(pool) {
    this.pool = pool;
  }

  // Deja un único enlace vigente por usuario.
  async replaceForUser(userId, tokenHash, expiresAt, db = this.pool) {
    await db.query("DELETE FROM password_resets WHERE user_id=$1", [userId]);
    await db.query(
      "INSERT INTO password_resets (token_hash,user_id,expires_at) VALUES ($1,$2,$3)",
      [tokenHash, userId, expiresAt],
    );
  }

  // Consume el enlace: lo borra y devuelve el usuario si seguía vigente.
  async consume(tokenHash, db = this.pool) {
    const { rows } = await db.query(
      "DELETE FROM password_resets WHERE token_hash=$1 AND expires_at > NOW() RETURNING user_id",
      [tokenHash],
    );
    return rows[0]?.user_id ?? null;
  }
}

module.exports = { PasswordResetRepository };
