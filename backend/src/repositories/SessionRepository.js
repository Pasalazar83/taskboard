// Acceso a datos de sesiones. Solo se guarda el hash del token, nunca el token.
class SessionRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async create(tokenHash, userId, expiresAt, db = this.pool) {
    await db.query(
      "INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,$3)",
      [tokenHash, userId, expiresAt],
    );
  }

  async findActiveUser(tokenHash) {
    const { rows } = await this.pool.query(
      "SELECT u.id,u.name,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at > NOW()",
      [tokenHash],
    );
    return rows[0] || null;
  }

  async delete(tokenHash) {
    await this.pool.query("DELETE FROM sessions WHERE token_hash=$1", [tokenHash]);
  }

  async deleteByUser(userId, db = this.pool) {
    await db.query("DELETE FROM sessions WHERE user_id=$1", [userId]);
  }
}

module.exports = { SessionRepository };
